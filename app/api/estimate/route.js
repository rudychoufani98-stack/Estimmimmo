// ============================================================================
//  EstimImmo - Moteur d'estimation immobiliere
//  Sources de donnees (open data, sans authentification) :
//   - Geocodage : IGN Geoplateforme (data.geopf.fr/geocodage)
//   - Transactions reelles : DVF (Demandes de Valeurs Foncieres), DGFiP/Etalab
//     fichiers geo-dvf par commune : files.data.gouv.fr/geo-dvf/latest/csv
// ============================================================================

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

// ---- Helpers --------------------------------------------------------------

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000; // metres
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Local market trend: median price/m2 per year -> annualised growth rate.
// Data-driven momentum used to re-index older sales to today's value.
function localTrend(muts) {
  const byYear = new Map();
  for (const m of muts) {
    const y = m.date.slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(m.pm2);
  }
  const points = [];
  for (const [y, arr] of [...byYear.entries()].sort()) {
    if (arr.length >= 10) points.push({ year: parseInt(y), med: Math.round(median(arr)) });
  }
  if (points.length < 2) return { annual: null, points };
  const first = points[0], last = points[points.length - 1];
  const span = last.year - first.year || 1;
  let annual = Math.pow(last.med / first.med, 1 / span) - 1;
  annual = Math.max(-0.08, Math.min(0.08, annual)); // clamp to sane bounds
  return { annual, points };
}

// Departement code from INSEE city code (handles Corsica + DOM)
function deptFromInsee(insee) {
  if (/^(2A|2B)/i.test(insee)) return insee.slice(0, 2).toUpperCase();
  if (/^97|^98/.test(insee)) return insee.slice(0, 3);
  return insee.slice(0, 2);
}

// Minimal robust CSV line splitter (geo-dvf is comma separated, rarely quoted)
function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
    } else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

// Nearby amenities (transports + commerces) via OpenStreetMap Overpass.
// Returns { list, rail } or null on error. `rail` = nearest metro/tram/train for valuation.
async function nearbyPlaces(lat, lon) {
  const q = `[out:json][timeout:12];(` +
    `node(around:1200,${lat},${lon})[railway=station];` +
    `node(around:1200,${lat},${lon})[station=subway];` +
    `node(around:1200,${lat},${lon})[railway=tram_stop];` +
    `node(around:1200,${lat},${lon})[railway=subway_entrance];` +
    `node(around:400,${lat},${lon})[highway=bus_stop];` +
    `node(around:800,${lat},${lon})[shop=supermarket];` +
    `node(around:800,${lat},${lon})[shop=convenience];` +
    `node(around:800,${lat},${lon})[shop=bakery];` +
    `node(around:800,${lat},${lon})[amenity=pharmacy];` +
    `node(around:800,${lat},${lon})[amenity=school];` +
    `node(around:800,${lat},${lon})[amenity=restaurant];` +
    `node(around:800,${lat},${lon})[amenity=cafe];` +
    `way(around:800,${lat},${lon})[leisure=park];` +
    `);out center tags;`;

  // Try several Overpass mirrors - the public one is often rate-limited/slow.
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
  ];
  const fetchOne = async (url) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "EstimImmo/1.0" },
        body: "data=" + encodeURIComponent(q),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error("status " + res.status);
      const j = await res.json();
      return j.elements || [];
    } finally {
      clearTimeout(timer);
    }
  };

  // Query all mirrors in parallel, keep the first that answers.
  let els = null;
  try {
    els = await Promise.any(endpoints.map(fetchOne));
  } catch {
    return null; // every mirror failed/timed out
  }

  try {
    const cats = {};
    const bucket = (k, label) => (cats[k] = cats[k] || { key: k, label, count: 0, nearest: null });
    for (const e of els) {
      const t = e.tags || {};
      const plat = e.lat != null ? e.lat : e.center && e.center.lat;
      const plon = e.lon != null ? e.lon : e.center && e.center.lon;
      if (plat == null || plon == null) continue;
      const dist = Math.round(haversine(lat, lon, plat, plon));
      let k, label;
      if (t.railway === "station" || t.station === "subway" || t.railway === "subway_entrance" || t.railway === "tram_stop") { k = "rail"; label = "Metro / Tram / Train"; }
      else if (t.highway === "bus_stop") { k = "bus"; label = "Bus"; }
      else if (t.shop === "supermarket" || t.shop === "convenience") { k = "supermarche"; label = "Supermarche / superette"; }
      else if (t.shop === "bakery") { k = "boulangerie"; label = "Boulangerie"; }
      else if (t.amenity === "pharmacy") { k = "pharmacie"; label = "Pharmacie"; }
      else if (t.amenity === "school") { k = "ecole"; label = "Ecole"; }
      else if (t.amenity === "restaurant" || t.amenity === "cafe") { k = "restaurant"; label = "Restaurant / cafe"; }
      else if (t.leisure === "park") { k = "parc"; label = "Parc / jardin"; }
      else continue;
      const c = bucket(k, label);
      c.count++;
      const name = t.name || label;
      if (!c.nearest || dist < c.nearest.dist) c.nearest = { name, dist };
    }
    const order = ["rail", "bus", "supermarche", "boulangerie", "pharmacie", "ecole", "restaurant", "parc"];
    const list = order.map((k) => cats[k]).filter(Boolean);
    return { list, rail: cats.rail ? cats.rail.nearest : null };
  } catch {
    return null; // API down -> skip, no crash
  }
}

async function fetchDvfYear(year, dept, insee) {
  const url = `https://files.data.gouv.fr/geo-dvf/latest/csv/${year}/communes/${dept}/${insee}.csv`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "EstimImmo/1.0" },
      redirect: "follow",
      // cache DVF files for a day - they change only a few times a year
      next: { revalidate: 86400 },
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

// Parse raw CSV text -> array of mutation rows we care about
function parseRows(csvText) {
  if (!csvText || typeof csvText !== "string") return [];
  const lines = csvText.split("\n");
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]);
  const idx = {};
  header.forEach((h, i) => (idx[h.trim()] = i));
  const need = [
    "id_mutation", "date_mutation", "nature_mutation", "valeur_fonciere",
    "code_postal", "nom_commune", "type_local", "surface_reelle_bati",
    "nombre_pieces_principales", "longitude", "latitude",
    "adresse_numero", "adresse_nom_voie",
  ];
  for (const k of need) if (!(k in idx)) return [];

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const c = splitCsvLine(lines[i]);
    if (c.length < header.length) continue;
    rows.push({
      id: c[idx.id_mutation],
      date: c[idx.date_mutation],
      nature: c[idx.nature_mutation],
      valeur: parseFloat(c[idx.valeur_fonciere]),
      cp: c[idx.code_postal],
      commune: c[idx.nom_commune],
      type: c[idx.type_local],
      surface: parseFloat(c[idx.surface_reelle_bati]),
      pieces: parseInt(c[idx.nombre_pieces_principales]) || null,
      lon: parseFloat(c[idx.longitude]),
      lat: parseFloat(c[idx.latitude]),
      adresse: `${c[idx.adresse_numero] || ""} ${c[idx.adresse_nom_voie] || ""}`.trim(),
    });
  }
  return rows;
}

// Group raw rows into clean single-property "mutations" with a price/m2
function buildMutations(rows, targetType) {
  const byId = new Map();
  for (const r of rows) {
    if (r.nature !== "Vente") continue;
    if (!byId.has(r.id)) byId.set(r.id, []);
    byId.get(r.id).push(r);
  }

  const muts = [];
  for (const [id, group] of byId) {
    const valeur = group.find((g) => g.valeur > 0)?.valeur;
    if (!valeur) continue;

    const types = group.map((g) => g.type).filter(Boolean);
    const hasAppart = types.includes("Appartement");
    const hasMaison = types.includes("Maison");
    // skip bundled sales mixing house + flat (unreliable price/m2)
    if (hasAppart && hasMaison) continue;

    const mainType = targetType; // "Appartement" | "Maison"
    const mainRows = group.filter((g) => g.type === mainType);
    if (!mainRows.length) continue;

    const surface = mainRows.reduce((s, g) => s + (g.surface || 0), 0);
    if (!surface || surface < 9 || surface > 600) continue;

    const pm2 = valeur / surface;
    if (pm2 < 400 || pm2 > 45000) continue; // drop obvious anomalies

    const ref = mainRows[0];
    if (!ref.lat || !ref.lon) continue;

    muts.push({
      id,
      date: ref.date,
      valeur,
      surface: Math.round(surface),
      pm2,
      pieces: ref.pieces,
      type: mainType,
      lat: ref.lat,
      lon: ref.lon,
      cp: ref.cp,
      commune: ref.commune,
      adresse: ref.adresse,
      // count of main lots - a single-lot sale is the cleanest comparable
      lots: mainRows.length,
    });
  }
  return muts;
}

// ---- Conjoncture — commune level (INSEE code) then dept fallback ----
// Source : Notaires de France / Meilleurs Agents juin 2026

// Commune-level conjoncture (INSEE code → {pct, label})
const CONJONCTURE_COMMUNE = {
  // Paris & IDF
  "75056":{ pct:+0.005, label:"Paris — légère reprise après correction, volumes en hausse depuis début 2026 (Notaires IDF)" },
  "92012":{ pct:+0.01,  label:"Boulogne-Billancourt — reprise confirmée, demande soutenue cadres supérieurs" },
  "92051":{ pct:+0.01,  label:"Neuilly-sur-Seine — marché haut de gamme résilient, légère reprise" },
  "92044":{ pct:+0.01,  label:"Levallois-Perret — marché porteur, bonne demande" },
  "78646":{ pct:+0.01,  label:"Versailles — marché dynamique, forte demande familles" },
  "92026":{ pct:+0.005, label:"Courbevoie — La Défense, marché stable légère reprise" },
  "93066":{ pct:-0.015, label:"Saint-Denis — marché en correction, prix sous pression" },
  "93001":{ pct:-0.02,  label:"Aubervilliers — marché très prudent, correction en cours" },
  "95018":{ pct:-0.01,  label:"Argenteuil — marché sous pression, correction modérée" },
  // PACA
  "13055":{ pct:+0.01,  label:"Marseille — reprise marquée, forte demande sur les quartiers sud (Notaires PACA 2026)" },
  "13001":{ pct:+0.015, label:"Aix-en-Provence — marché très porteur, demande soutenue cadres et familles" },
  "06088":{ pct:+0.02,  label:"Nice — marché très porteur, demande internationale forte (Côte d'Azur)" },
  "06029":{ pct:+0.025, label:"Cannes — marché premium, demande très soutenue, offre rare" },
  "06004":{ pct:+0.02,  label:"Antibes — marché porteur, demande côtière forte" },
  "83137":{ pct:+0.01,  label:"Toulon — reprise modérée, bonne demande primo-accédants" },
  "84007":{ pct:+0.005, label:"Avignon — marché stable, légère reprise" },
  // Auvergne-Rhône-Alpes
  "69123":{ pct:-0.01,  label:"Lyon — correction de -8% depuis 2023, stabilisation attendue mi-2026 (Notaires Rhône)" },
  "69266":{ pct:-0.005, label:"Villeurbanne — légère correction, marché plus résilient que Lyon intramuros" },
  "38185":{ pct:-0.01,  label:"Grenoble — marché en correction, prix sous pression" },
  "74010":{ pct:+0.025, label:"Annecy — marché très tendu, demande frontaliers très forte, offre très limitée" },
  "74055":{ pct:+0.03,  label:"Chamonix — marché premium station, demande internationale, offre rarissime" },
  "73065":{ pct:+0.02,  label:"Chambéry — marché porteur, bon compromis accessibilité/qualité de vie" },
  "42218":{ pct:-0.02,  label:"Saint-Étienne — marché difficile, prix parmi les plus bas de France, demande faible" },
  "63113":{ pct:0,      label:"Clermont-Ferrand — marché stable, légère reprise" },
  "01053":{ pct:+0.015, label:"Bourg-en-Bresse — marché porteur, effet demande frontalière modéré" },
  // Occitanie
  "31555":{ pct:+0.015, label:"Toulouse — marché dynamique, démographie positive, 4e ville de France (Notaires Haute-Garonne)" },
  "34172":{ pct:+0.015, label:"Montpellier — marché porteur, forte croissance démographique, campus attractif" },
  "30189":{ pct:0,      label:"Nîmes — marché stable après légère correction" },
  "66136":{ pct:+0.01,  label:"Perpignan — reprise modérée, prix encore accessibles attirent investisseurs" },
  "11069":{ pct:+0.01,  label:"Carcassonne — tourisme fort, marché en légère hausse" },
  "09122":{ pct:+0.005, label:"Foix — marché rural stable" },
  // Nouvelle-Aquitaine
  "33063":{ pct:-0.015, label:"Bordeaux — correction de -12% depuis 2022, stabilisation en cours, vigilance maintenue (Notaires Gironde)" },
  "33522":{ pct:-0.005, label:"Mérignac — correction modérée, marché plus résilient que Bordeaux centre" },
  "33281":{ pct:+0.005, label:"Mériadeck / Bordeaux Lac — légère reprise" },
  "64445":{ pct:+0.01,  label:"Pau — marché stable, bonne demande locale" },
  "64102":{ pct:+0.025, label:"Bayonne — marché très tendu, Pays Basque demande très forte, offre limitée" },
  "64024":{ pct:+0.03,  label:"Anglet — Pays Basque côtier, marché très porteur, prix en hausse soutenue" },
  "64300":{ pct:+0.03,  label:"Biarritz — marché premium, demande nationale et internationale forte" },
  "17300":{ pct:+0.015, label:"La Rochelle — marché porteur, attractivité touristique et qualité de vie" },
  "16015":{ pct:0,      label:"Angoulême — marché stable, prix accessibles" },
  "24322":{ pct:0,      label:"Périgueux — marché stable, légère reprise tourisme" },
  "19031":{ pct:0,      label:"Brive-la-Gaillarde — marché stable" },
  // Bretagne / Pays de la Loire
  "35238":{ pct:+0.015, label:"Rennes — marché très dynamique, forte croissance étudiante et tech, 10e métropole française" },
  "35047":{ pct:+0.015, label:"Cesson-Sévigné — Tech Valley rennaise, forte demande" },
  "29019":{ pct:+0.01,  label:"Brest — marché porteur, renouveau économique (défense, tech)" },
  "29232":{ pct:+0.005, label:"Quimper — marché stable, légère hausse" },
  "56121":{ pct:+0.01,  label:"Lorient — marché porteur, demande soutenue" },
  "56260":{ pct:+0.015, label:"Vannes — marché très attractif, qualité de vie + littoral" },
  "22278":{ pct:+0.005, label:"Saint-Brieuc — marché stable" },
  "44109":{ pct:-0.005, label:"Nantes — correction modérée après forte hausse, stabilisation en cours" },
  "44184":{ pct:0,      label:"Saint-Nazaire — marché stable, activité portuaire" },
  "85047":{ pct:+0.01,  label:"La Roche-sur-Yon — marché porteur, croissance démographique" },
  "49007":{ pct:+0.005, label:"Angers — marché stable, légère reprise" },
  "72181":{ pct:0,      label:"Le Mans — marché stable" },
  // Grand Est
  "67482":{ pct:+0.005, label:"Strasbourg — marché stable, demande institutionnelle (parlement européen)" },
  "68224":{ pct:-0.015, label:"Mulhouse — marché difficile, correction en cours, prix sous pression" },
  "57463":{ pct:0,      label:"Metz — marché stable, légère reprise" },
  "54395":{ pct:0,      label:"Nancy — marché stable" },
  "51454":{ pct:0,      label:"Reims — marché stable, tourisme champagne" },
  "68066":{ pct:+0.005, label:"Colmar — marché porteur, tourisme alsacien fort" },
  "25056":{ pct:+0.005, label:"Besançon — marché stable, légère reprise" },
  "21231":{ pct:0,      label:"Dijon — marché stable, bonne demande étudiante" },
  // Hauts-de-France
  "59350":{ pct:-0.005, label:"Lille — légère correction après forte hausse, marché qui se stabilise" },
  "59512":{ pct:0,      label:"Roubaix — marché très accessible, légère reprise" },
  "59599":{ pct:0,      label:"Tourcoing — marché stable" },
  "62193":{ pct:-0.01,  label:"Calais — marché sous pression, Brexit impact résiduel" },
  "80021":{ pct:-0.005, label:"Amiens — légère correction" },
  // Normandie
  "76351":{ pct:0,      label:"Le Havre — marché stable, renouveau portuaire" },
  "76540":{ pct:0,      label:"Rouen — marché stable" },
  "14118":{ pct:+0.005, label:"Caen — marché en légère reprise, bonne demande étudiante" },
  "50129":{ pct:+0.005, label:"Cherbourg — marché porteur (défense, nucléaire)" },
  "61001":{ pct:0,      label:"Alençon — marché stable" },
  // Centre
  "45234":{ pct:-0.005, label:"Orléans — légère pression à la baisse" },
  "37261":{ pct:0,      label:"Tours — marché stable, légère reprise" },
  "18033":{ pct:0,      label:"Bourges — marché stable" },
  // Limousin / Auvergne
  "87085":{ pct:0,      label:"Limoges — marché stable, prix très accessibles" },
  "63113":{ pct:0,      label:"Clermont-Ferrand — marché stable" },
  "43157":{ pct:0,      label:"Le Puy-en-Velay — marché stable, tourisme Compostelle" },
  // Corse
  "2A004":{ pct:+0.02,  label:"Ajaccio — marché porteur, attractivité résidentielle forte" },
  "2B033":{ pct:+0.015, label:"Bastia — marché porteur" },
};

function getConjoncture(dept, insee) {
  if (CONJONCTURE_COMMUNE[insee]) return CONJONCTURE_COMMUNE[insee];
  return CONJONCTURE_DEPT[dept] || { pct:0, label:`Département ${dept} — données de marché non disponibles, tendance nationale appliquée` };
}

// ---- Market conjoncture by department (Notaires de France / Meilleurs Agents, juin 2026) ----
const CONJONCTURE_DEPT = {
  // IDF
  "75":  { pct:0,      label:"Paris — marché en légère reprise, volumes encore faibles" },
  "92":  { pct:0.01,   label:"Hauts-de-Seine — demande soutenue, reprise modérée" },
  "93":  { pct:-0.01,  label:"Seine-Saint-Denis — marché prudent, correction en cours" },
  "94":  { pct:0.005,  label:"Val-de-Marne — stabilisation après correction" },
  "95":  { pct:-0.005, label:"Val-d'Oise — marché neutre, légère pression à la baisse" },
  "91":  { pct:0,      label:"Essonne — marché à l'équilibre" },
  "78":  { pct:0.01,   label:"Yvelines — bonne demande, reprise confirmée" },
  "77":  { pct:0,      label:"Seine-et-Marne — marché stable" },
  // PACA
  "13":  { pct:0.01,   label:"Bouches-du-Rhône — demande soutenue, marché dynamique" },
  "83":  { pct:0.015,  label:"Var — forte demande côtière, reprise marquée" },
  "06":  { pct:0.015,  label:"Alpes-Maritimes — marché très porteur, Côte d'Azur prime" },
  "84":  { pct:0.005,  label:"Vaucluse — marché stable, légère reprise" },
  // Auvergne-Rhône-Alpes
  "69":  { pct:0,      label:"Rhône — Lyon en stabilisation après correction de 7 %" },
  "38":  { pct:0.005,  label:"Isère — légère reprise, bonne demande" },
  "74":  { pct:0.02,   label:"Haute-Savoie — marché très porteur (stations, frontaliers)" },
  "73":  { pct:0.015,  label:"Savoie — forte demande stations, marché porteur" },
  "01":  { pct:0.01,   label:"Ain — bonne demande, marché porteur" },
  // Occitanie
  "31":  { pct:0.01,   label:"Haute-Garonne — Toulouse dynamique, reprise confirmée" },
  "34":  { pct:0.01,   label:"Hérault — Montpellier dynamique, marché porteur" },
  "66":  { pct:0.015,  label:"Pyrénées-Orientales — forte demande côtière" },
  // Nouvelle-Aquitaine
  "33":  { pct:0,      label:"Gironde — Bordeaux stabilise après forte correction (-12 %)" },
  "64":  { pct:0.015,  label:"Pyrénées-Atlantiques — Pays Basque marché très tendu" },
  "17":  { pct:0.01,   label:"Charente-Maritime — bonne demande côtière" },
  // Bretagne
  "35":  { pct:0.01,   label:"Ille-et-Vilaine — Rennes dynamique, marché porteur" },
  "29":  { pct:0.005,  label:"Finistère — marché stable, légère reprise" },
  "56":  { pct:0.01,   label:"Morbihan — forte demande côtière" },
  "22":  { pct:0.005,  label:"Côtes-d'Armor — marché stable" },
  // Pays de la Loire
  "44":  { pct:0.01,   label:"Loire-Atlantique — Nantes dynamique, marché porteur" },
  "85":  { pct:0.01,   label:"Vendée — bonne demande, marché porteur" },
  "49":  { pct:0.005,  label:"Maine-et-Loire — marché stable, légère reprise" },
  // Grand Est
  "67":  { pct:0.005,  label:"Bas-Rhin — Strasbourg, marché stable" },
  "57":  { pct:0,      label:"Moselle — marché neutre" },
  "68":  { pct:0.005,  label:"Haut-Rhin — marché stable" },
  // Hauts-de-France
  "59":  { pct:-0.005, label:"Nord — Lille en légère correction" },
  "62":  { pct:-0.01,  label:"Pas-de-Calais — marché prudent" },
  // Normandie
  "76":  { pct:0,      label:"Seine-Maritime — Rouen stable" },
  "14":  { pct:0.005,  label:"Calvados — Caen, légère reprise" },
  // Centre
  "37":  { pct:0,      label:"Indre-et-Loire — Tours stable" },
  "45":  { pct:-0.005, label:"Loiret — Orléans, légère pression à la baisse" },
  // Auvergne / Massif Central
  "63":  { pct:0,      label:"Puy-de-Dôme — Clermont stable" },
};


// ---- Estimation handler ---------------------------------------------------

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      address,
      surface,
      type = "Appartement",
      floor = 0,
      elevator = true,
      condition = 1,
      dpe = "D",
      period = "1948-1974",
      balcony = false,
      parking = false,
      cave = false,
      vue = "standard",
      pieces = null,
      occupation = "libre",
      geo: picked,
    } = body;

    if (!address || !surface) {
      return Response.json({ error: "Adresse et surface requises." }, { status: 400 });
    }

    // 1) Resolve location -----------------------------------------------------
    let lat, lon, insee, locationLabel, areaLabel;
    if (picked && picked.lat && picked.lon && picked.insee) {
      // user picked an exact address in the autocomplete -> trust it
      lat = picked.lat;
      lon = picked.lon;
      insee = picked.insee;
      locationLabel = picked.label || address;
      areaLabel = picked.area || picked.city || address;
    } else {
      // fallback: geocode the free text
      const geoRes = await fetch(
        `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(address)}&limit=1`,
        { headers: { "User-Agent": "EstimImmo/1.0" } }
      );
      const geo = await geoRes.json();
      const feat = geo?.features?.[0];
      if (!feat) {
        return Response.json({ error: "Adresse introuvable. Precisez le numero et la ville." }, { status: 404 });
      }
      const [flon, flat] = feat.geometry.coordinates;
      const p = feat.properties;
      lat = flat;
      lon = flon;
      insee = p.citycode;
      locationLabel = p.label;
      areaLabel = p.city + (p.context ? ` (${p.context.split(",")[0]})` : "");
    }
    const dept = deptFromInsee(insee);

    // 2) Pull real DVF transactions for recent years -------------------------
    const currentYear = new Date().getFullYear();
    const candidateYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
    let rows = [];
    let yearsUsed = [];
    for (const y of candidateYears) {
      if (yearsUsed.length >= 3) break;
      const txt = await fetchDvfYear(y, dept, insee);
      const parsed = parseRows(txt);
      if (parsed.length) {
        rows = rows.concat(parsed);
        yearsUsed.push(y);
      }
    }

    if (!rows.length) {
      return Response.json(
        { error: "Aucune donnee DVF disponible pour cette commune (zone non couverte : Alsace-Moselle, Mayotte, ou commune sans transaction)." },
        { status: 404 }
      );
    }

    const muts = buildMutations(rows, type);
    if (!muts.length) {
      return Response.json(
        { error: `Aucune vente de ${type.toLowerCase()} exploitable trouvee dans cette commune.` },
        { status: 404 }
      );
    }

    // 3) Score & rank comparables --------------------------------------------
    const now = Date.now();
    for (const m of muts) {
      m.dist = Math.round(haversine(lat, lon, m.lat, m.lon));
      const monthsAgo = Math.max(0, (now - new Date(m.date).getTime()) / (1000 * 3600 * 24 * 30));
      m.monthsAgo = Math.round(monthsAgo);
      const wDist = 1 / (1 + m.dist / 300);
      const wTime = 1 / (1 + monthsAgo / 12);
      const wSurf = 1 / (1 + Math.abs(m.surface - surface) / surface);
      const wLot = m.lots === 1 ? 1 : 0.7;
      // prefer comparables with same number of rooms
      const wPieces = (pieces && m.pieces) ? 1 / (1 + Math.abs(m.pieces - pieces) * 0.4) : 1;
      m.score = wDist * wTime * wSurf * wLot * wPieces;
    }
    muts.sort((a, b) => b.score - a.score);

    // Use the best comparables: prefer those within 1 km, fall back to top N
    let comps = muts.filter((m) => m.dist <= 1000);
    if (comps.length < 8) comps = muts.slice(0, 25);
    comps = comps.slice(0, 40);

    // 4) Local market trend -> re-index older sales to today ------------------
    const trend = localTrend(muts);
    const tr = trend.annual; // annual growth rate (null if not enough data)
    for (const m of comps) {
      const yearsAgo = m.monthsAgo / 12;
      m.pm2Indexed = tr != null ? m.pm2 * Math.pow(1 + tr, yearsAgo) : m.pm2;
    }

    // Base price/m2 (robust = median of comparables re-indexed to present)
    const basePm2 = median(comps.map((m) => m.pm2Indexed));
    const rawBasePm2 = median(comps.map((m) => m.pm2)); // before indexing
    const marketPm2 = median(muts.map((m) => m.pm2)); // whole-commune reference

    // Auto-detect conjoncture — commune first, dept fallback
    const conjoncture = getConjoncture(dept, insee);

    // Nearby amenities (best-effort)
    const places = await nearbyPlaces(lat, lon);
    const transit = places ? (places.rail || { dist: null, name: null }) : null;

    // 5) Qualitative adjustments ---------------------------------------------
    const adj = [];
    let factor = 1;
    const add = (label, pct) => { adj.push({ label, pct: Math.round(pct * 1000) / 10 }); factor *= 1 + pct; };

    // floor / elevator
    let floorPct;
    if (elevator) floorPct = Math.min(floor, 8) * 0.008;
    else floorPct = -Math.max(0, floor - 1) * 0.02;
    floorPct = Math.max(-0.16, Math.min(floorPct, 0.07));
    if (floorPct !== 0) add(elevator ? `Etage ${floor} avec ascenseur` : `Etage ${floor} sans ascenseur`, floorPct);

    // condition (passed as multiplier from UI: 1.10 / 1 / 0.92 / 0.82)
    if (condition !== 1) add("Etat du bien", condition - 1);

    // DPE (loi Climat - fort impact)
    const dpeMap = { A: 0.04, B: 0.03, C: 0.01, D: 0, E: -0.03, F: -0.07, G: -0.11 };
    if (dpeMap[dpe]) add(`DPE ${dpe}`, dpeMap[dpe]);

    // construction period
    const periodMap = {
      "avant 1914": 0.02, "1914-1947": 0, "1948-1974": -0.04,
      "1975-2000": -0.01, "apres 2000": 0.03,
    };
    if (periodMap[period]) add(`Construction ${period}`, periodMap[period]);

    if (balcony) add("Balcon / terrasse", 0.03);
    if (parking) add("Parking / box", 0.02);
    if (cave) add("Cave", 0.015);

    // vue
    const vueMap = { exceptionnelle: 0.08, degagee: 0.04, standard: 0, visavis: -0.04 };
    const vueLbl = { exceptionnelle: "Vue exceptionnelle", degagee: "Vue degagee", visavis: "Vis-a-vis rapproche / sombre" };
    if (vueMap[vue]) add(vueLbl[vue], vueMap[vue]);

    // transports (Overpass) - computed earlier
    if (transit) {
      if (transit.dist == null) add("Transports eloignes (>1,2 km)", -0.02);
      else if (transit.dist <= 300) add(`Transports a ${transit.dist}m (${transit.name})`, 0.03);
      else if (transit.dist <= 600) add(`Transports a ${transit.dist}m (${transit.name})`, 0.015);
      // 600-1200 m : neutre (affiche pour info uniquement)
    }

    // pieces (configuration T1/T2/T3…) — petites surfaces = prime/m2
    const piecesMap = { 1: 0.07, 2: 0.03, 3: 0, 4: -0.02, 5: -0.04 };
    if (pieces && piecesMap[pieces] !== undefined && piecesMap[pieces] !== 0)
      add(`Configuration T${pieces}`, piecesMap[pieces]);
    else if (pieces >= 6) add(`Grand appartement T${pieces}+`, -0.05);

    // occupation (bien loue = decote)
    const occupMap = { libre: 0, bail_cours: -0.15, loi_1948: -0.25 };
    const occupLbl = { bail_cours: "Bien occupe — bail en cours (-15%)", loi_1948: "Bien occupe — locataire protege loi 1948 (-25%)" };
    if (occupMap[occupation]) add(occupLbl[occupation], occupMap[occupation]);

    // conjoncture auto-detectee (Notaires de France / Meilleurs Agents)
    if (conjoncture.pct !== 0) add(`Conjoncture locale — ${conjoncture.label}`, conjoncture.pct);

    const adjustedPm2 = basePm2 * factor;
    const estimate = adjustedPm2 * surface;
    const low = Math.round(estimate * 0.93);
    const high = Math.round(estimate * 1.07);

    // 6) Confidence ----------------------------------------------------------
    const within500 = comps.filter((m) => m.dist <= 500).length;
    let confidence = "Faible";
    if (comps.length >= 15 && within500 >= 5) confidence = "Elevee";
    else if (comps.length >= 8) confidence = "Moyenne";

    return Response.json({
      location: { label: locationLabel, area: areaLabel, insee, lat, lon },
      estimate: Math.round(estimate),
      low,
      high,
      basePm2: Math.round(basePm2),
      rawBasePm2: Math.round(rawBasePm2),
      adjustedPm2: Math.round(adjustedPm2),
      marketPm2: Math.round(marketPm2),
      marketTrend: {
        annualPct: tr != null ? Math.round(tr * 1000) / 10 : null,
        points: trend.points, // [{year, med}]
      },
      adjustments: adj,
      confidence,
      transit,
      conjoncture,
      amenities: places ? places.list : null,
      yearsUsed,
      compCount: comps.length,
      totalSales: muts.length,
      comparables: comps.slice(0, 30).map((m) => ({
        date: m.date,
        prix: m.valeur,
        surface: m.surface,
        pm2: Math.round(m.pm2),
        pieces: m.pieces,
        dist: m.dist,
        adresse: m.adresse,
        commune: m.commune,
        type: m.type,
        lat: m.lat,
        lon: m.lon,
      })),
    });
  } catch (e) {
    return Response.json({ error: "Erreur serveur : " + e.message }, { status: 500 });
  }
}
