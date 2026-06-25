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

// ---- Security index by department (SSMSI 2023 - crimes & délits / 1000 hab) ----
// Source : Ministère de l'Intérieur / SSMSI, statistiques annuelles 2023
const SECURITE_DEPT = {
  "75":{ lvl:"sensible", pct:-0.05, label:"Paris — taux de délinquance élevé (statistiques SSMSI 2023)" },
  "92":{ lvl:"standard", pct:0,     label:"Hauts-de-Seine — taux de délinquance modéré" },
  "93":{ lvl:"risque",   pct:-0.10, label:"Seine-Saint-Denis — taux de délinquance très élevé (SSMSI 2023)" },
  "94":{ lvl:"standard", pct:0,     label:"Val-de-Marne — taux de délinquance moyen" },
  "95":{ lvl:"sensible", pct:-0.05, label:"Val-d'Oise — taux de délinquance au-dessus de la moyenne" },
  "91":{ lvl:"standard", pct:0,     label:"Essonne — taux de délinquance moyen" },
  "78":{ lvl:"sur",      pct:0.01,  label:"Yvelines — faible taux de délinquance" },
  "77":{ lvl:"standard", pct:0,     label:"Seine-et-Marne — taux de délinquance moyen" },
  "13":{ lvl:"sensible", pct:-0.05, label:"Bouches-du-Rhône — taux de délinquance élevé (SSMSI 2023)" },
  "83":{ lvl:"standard", pct:0,     label:"Var — taux de délinquance moyen" },
  "06":{ lvl:"sensible", pct:-0.05, label:"Alpes-Maritimes — taux de délinquance au-dessus de la moyenne" },
  "69":{ lvl:"sensible", pct:-0.05, label:"Rhône — taux de délinquance élevé (agglomération lyonnaise)" },
  "33":{ lvl:"standard", pct:0,     label:"Gironde — taux de délinquance moyen" },
  "31":{ lvl:"sensible", pct:-0.05, label:"Haute-Garonne — taux de délinquance au-dessus de la moyenne" },
  "59":{ lvl:"sensible", pct:-0.05, label:"Nord — taux de délinquance élevé (SSMSI 2023)" },
  "67":{ lvl:"standard", pct:0,     label:"Bas-Rhin — taux de délinquance moyen" },
  "57":{ lvl:"standard", pct:0,     label:"Moselle — taux de délinquance moyen" },
  "44":{ lvl:"standard", pct:0,     label:"Loire-Atlantique — taux de délinquance moyen" },
  "34":{ lvl:"sensible", pct:-0.05, label:"Hérault — taux de délinquance au-dessus de la moyenne" },
  "76":{ lvl:"sensible", pct:-0.05, label:"Seine-Maritime — taux de délinquance au-dessus de la moyenne" },
  "38":{ lvl:"standard", pct:0,     label:"Isère — taux de délinquance moyen" },
  "45":{ lvl:"standard", pct:0,     label:"Loiret — taux de délinquance moyen" },
  "35":{ lvl:"sur",      pct:0.01,  label:"Ille-et-Vilaine — faible taux de délinquance" },
  "29":{ lvl:"sur",      pct:0.01,  label:"Finistère — faible taux de délinquance" },
  "56":{ lvl:"sur",      pct:0.01,  label:"Morbihan — faible taux de délinquance" },
  "22":{ lvl:"tres_sur", pct:0.02,  label:"Côtes-d'Armor — très faible taux de délinquance" },
  "14":{ lvl:"sur",      pct:0.01,  label:"Calvados — faible taux de délinquance" },
  "74":{ lvl:"sur",      pct:0.01,  label:"Haute-Savoie — faible taux de délinquance" },
  "73":{ lvl:"sur",      pct:0.01,  label:"Savoie — faible taux de délinquance" },
  "01":{ lvl:"sur",      pct:0.01,  label:"Ain — faible taux de délinquance" },
  "63":{ lvl:"standard", pct:0,     label:"Puy-de-Dôme — taux de délinquance moyen" },
  "37":{ lvl:"standard", pct:0,     label:"Indre-et-Loire — taux de délinquance moyen" },
  "49":{ lvl:"sur",      pct:0.01,  label:"Maine-et-Loire — faible taux de délinquance" },
  "85":{ lvl:"tres_sur", pct:0.02,  label:"Vendée — très faible taux de délinquance" },
  "2A":{ lvl:"sur",      pct:0.01,  label:"Corse-du-Sud — faible taux de délinquance" },
  "2B":{ lvl:"sur",      pct:0.01,  label:"Haute-Corse — faible taux de délinquance" },
};
function getSecurite(dept) {
  return SECURITE_DEPT[dept] || { lvl:"standard", pct:0, label:`Département ${dept} — données de délinquance non disponibles (taux national moyen appliqué)` };
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
function getConjoncture(dept) {
  return CONJONCTURE_DEPT[dept] || { pct:0, label:`Département ${dept} — marché neutre (données locales non disponibles)` };
}

// ---- Flood zone check (GeoRisques API) ------------------------------------

async function checkFloodZone(lat, lon) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(
      `https://georisques.gouv.fr/api/v1/zonage_inondation?latlon=${lat},${lon}&rayon=0`,
      { headers: { "User-Agent": "EstimImmo/1.0", "Accept": "application/json" }, signal: ctrl.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const features = data?.features || data?.data || [];
    if (!features.length) return { zone: "hors_zone", label: "Hors zone inondable (PPRI)", pct: 0 };
    const alea = (features[0]?.properties?.code_alea || features[0]?.properties?.lib_alea || "").toLowerCase();
    if (/rouge|fort|tres/.test(alea)) return { zone: "rouge", label: "Zone inondable — risque fort (zone rouge PPRI)", pct: -0.15 };
    if (/bleu|moyen/.test(alea)) return { zone: "bleue", label: "Zone inondable — risque moyen (zone bleue PPRI)", pct: -0.08 };
    return { zone: "faible", label: "Zone inondable — risque faible (PPRI)", pct: -0.03 };
  } catch {
    return null;
  }
}

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

    // Auto-detect security & conjoncture from department
    const securiteAuto = getSecurite(dept);
    const conjoncture = getConjoncture(dept);

    // Nearby amenities + flood zone check (parallel, best-effort)
    const [places, floodZone] = await Promise.all([
      nearbyPlaces(lat, lon),
      checkFloodZone(lat, lon),
    ]);
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

    // securite auto-detectee (SSMSI)
    if (securiteAuto.pct !== 0) add(`Securite — ${securiteAuto.label}`, securiteAuto.pct);

    // zone inondable (PPRI) — applique si detectee
    if (floodZone && floodZone.pct !== 0) add(floodZone.label, floodZone.pct);

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
      floodZone: floodZone || null,
      securiteAuto,
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
