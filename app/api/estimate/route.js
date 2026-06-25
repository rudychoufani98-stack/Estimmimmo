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

// Nearest rail transit (metro/RER/train/tram) via OpenStreetMap Overpass.
// Returns { dist, name } if found, { dist: null } if none within radius, null on error.
async function nearestTransit(lat, lon) {
  const r = 1200;
  const q = `[out:json][timeout:8];(` +
    `node(around:${r},${lat},${lon})[railway=station];` +
    `node(around:${r},${lat},${lon})[station=subway];` +
    `node(around:${r},${lat},${lon})[railway=subway_entrance];` +
    `node(around:${r},${lat},${lon})[railway=tram_stop];` +
    `);out body;`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "EstimImmo/1.0" },
      body: "data=" + encodeURIComponent(q),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const j = await res.json();
    const els = j.elements || [];
    if (!els.length) return { dist: null, name: null }; // searched, nothing nearby
    let best = null;
    for (const e of els) {
      const d = haversine(lat, lon, e.lat, e.lon);
      if (!best || d < best.dist) best = { dist: Math.round(d), name: (e.tags && (e.tags.name || e.tags.ref)) || "arret" };
    }
    return best;
  } catch {
    return null; // API down -> no adjustment
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
      sentiment = 0, // conjoncture choisie par l'utilisateur (ex: 0.02 / -0.02)
      geo: picked, // exact location chosen via autocomplete (optional)
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
      const wDist = 1 / (1 + m.dist / 300);          // closer = better
      const wTime = 1 / (1 + monthsAgo / 12);        // more recent = better
      const wSurf = 1 / (1 + Math.abs(m.surface - surface) / surface); // similar size
      const wLot = m.lots === 1 ? 1 : 0.7;           // prefer single-lot sales
      m.score = wDist * wTime * wSurf * wLot;
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

    // Nearest public transport (best-effort, non blocking on failure)
    const transit = await nearestTransit(lat, lon);

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

    if (sentiment) add("Conjoncture de marche (confiance/demande)", Number(sentiment));

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
