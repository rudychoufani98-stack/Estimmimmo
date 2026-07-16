// ============================================================================
//  EstimImmo — API "Carte des marchés"
//  Renvoie le prix/m² médian réel (ventes DVF) pour une commune, ou le détail
//  par arrondissement (breakdown=1) pour Paris / Lyon / Marseille.
//  Source : DVF (DGFiP/Etalab) — files.data.gouv.fr/geo-dvf/latest/csv
// ============================================================================

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

// ---- Helpers (mêmes règles que /api/estimate) -----------------------------

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function deptFromInsee(insee) {
  if (/^(2A|2B)/i.test(insee)) return insee.slice(0, 2).toUpperCase();
  if (/^97|^98/.test(insee)) return insee.slice(0, 3);
  return insee.slice(0, 2);
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQ = !inQ;
    else if (c === "," && !inQ) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function fetchDvfYear(year, dept, insee) {
  const url = `https://files.data.gouv.fr/geo-dvf/latest/csv/${year}/communes/${dept}/${insee}.csv`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "EstimImmo/1.0" },
      redirect: "follow",
      next: { revalidate: 86400 }, // DVF ne bouge que quelques fois par an
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

function parseRows(csvText) {
  if (!csvText || typeof csvText !== "string") return [];
  const lines = csvText.split("\n");
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]);
  const idx = {};
  header.forEach((h, i) => (idx[h.trim()] = i));
  const need = [
    "id_mutation", "date_mutation", "nature_mutation", "valeur_fonciere",
    "type_local", "surface_reelle_bati", "longitude", "latitude",
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
      type: c[idx.type_local],
      surface: parseFloat(c[idx.surface_reelle_bati]),
      lon: parseFloat(c[idx.longitude]),
      lat: parseFloat(c[idx.latitude]),
    });
  }
  return rows;
}

// Rows -> mutations propres avec prix/m² (un bien = une vente cohérente)
function buildMutations(rows, targetType) {
  const byId = new Map();
  for (const r of rows) {
    if (r.nature !== "Vente") continue;
    if (!byId.has(r.id)) byId.set(r.id, []);
    byId.get(r.id).push(r);
  }
  const muts = [];
  for (const [, group] of byId) {
    const valeur = group.find((g) => g.valeur > 0)?.valeur;
    if (!valeur) continue;
    const types = group.map((g) => g.type).filter(Boolean);
    if (types.includes("Appartement") && types.includes("Maison")) continue;
    const mainRows = group.filter((g) => g.type === targetType);
    if (!mainRows.length) continue;
    const surface = mainRows.reduce((s, g) => s + (g.surface || 0), 0);
    if (!surface || surface < 9 || surface > 600) continue;
    const pm2 = valeur / surface;
    if (pm2 < 400 || pm2 > 45000) continue;
    const ref = mainRows[0];
    if (!ref.lat || !ref.lon) continue;
    muts.push({ date: ref.date, pm2, lat: ref.lat, lon: ref.lon });
  }
  return muts;
}

// Récupère les mutations d'une commune sur plusieurs années
async function communeMutations(insee, type, years) {
  const dept = deptFromInsee(insee);
  const texts = await Promise.all(years.map((y) => fetchDvfYear(y, dept, insee)));
  const all = [];
  texts.forEach((txt, i) => {
    for (const m of buildMutations(parseRows(txt), type)) all.push({ ...m, year: years[i] });
  });
  return all;
}

// Arrondissements (INSEE) des villes à secteurs
function subCommunes(insee) {
  if (insee === "69123") {
    // Lyon 1er → 9e
    return Array.from({ length: 9 }, (_, i) => ({
      code: `6938${i + 1}`, name: `Lyon ${i + 1 === 1 ? "1er" : i + 1 + "e"}`,
    }));
  }
  if (insee === "13055") {
    // Marseille 1er → 16e
    return Array.from({ length: 16 }, (_, i) => ({
      code: `132${String(i + 1).padStart(2, "0")}`, name: `Marseille ${i + 1 === 1 ? "1er" : i + 1 + "e"}`,
    }));
  }
  return [];
}

function jsonResponse(obj) {
  return new Response(JSON.stringify(obj), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

// ---- Handler --------------------------------------------------------------

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const insee = (searchParams.get("insee") || "").trim();
  const type = searchParams.get("type") === "Maison" ? "Maison" : "Appartement";
  const breakdown = searchParams.get("breakdown") === "1";
  const fast = searchParams.get("fast") === "1"; // 1 seule année (chargement carte IdF)

  if (!/^[0-9AB]{5}$/i.test(insee)) {
    return jsonResponse({ error: "insee invalide" });
  }

  const nowY = new Date().getFullYear();
  // 3 dernières années DVF disponibles (ou juste la dernière en mode "fast")
  const years = fast ? [nowY - 1] : [nowY - 3, nowY - 2, nowY - 1];

  // -- Détail par arrondissement (Lyon / Marseille) --------------------------
  if (breakdown) {
    const subs = subCommunes(insee);
    if (!subs.length) return jsonResponse({ insee, type, zones: [] });

    const zones = [];
    for (const s of subs) {
      const muts = await communeMutations(s.code, type, [nowY - 1, nowY - 2]);
      if (muts.length < 5) continue;
      const lat = muts.reduce((a, m) => a + m.lat, 0) / muts.length;
      const lon = muts.reduce((a, m) => a + m.lon, 0) / muts.length;
      zones.push({
        code: s.code,
        name: s.name,
        lat: +lat.toFixed(4),
        lon: +lon.toFixed(4),
        medianPm2: Math.round(median(muts.map((m) => m.pm2))),
        count: muts.length,
      });
    }
    zones.sort((a, b) => a.medianPm2 - b.medianPm2);
    return jsonResponse({ insee, type, year: nowY - 1, zones });
  }

  // -- Une commune : médiane globale + par année + tendance ------------------
  const muts = await communeMutations(insee, type, years);
  if (muts.length < 5) {
    return jsonResponse({ insee, type, medianPm2: null, count: 0, byYear: [], source: "DVF (DGFiP/Etalab)" });
  }

  const byYear = [];
  for (const y of years) {
    const arr = muts.filter((m) => m.year === y).map((m) => m.pm2);
    if (arr.length >= 10) byYear.push({ year: y, med: Math.round(median(arr)), n: arr.length });
  }

  let trendPct = null;
  if (byYear.length >= 2) {
    const first = byYear[0], last = byYear[byYear.length - 1];
    const span = last.year - first.year || 1;
    let annual = Math.pow(last.med / first.med, 1 / span) - 1;
    annual = Math.max(-0.08, Math.min(0.08, annual)); // bornes raisonnables
    trendPct = +(annual * 100).toFixed(1);
  }

  return jsonResponse({
    insee,
    type,
    medianPm2: Math.round(median(muts.map((m) => m.pm2))),
    count: muts.length,
    byYear,
    trendPct,
    source: "DVF (DGFiP/Etalab)",
  });
}
