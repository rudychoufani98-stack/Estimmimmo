// ============================================================================
//  Helpers DVF côté serveur — partagés par /api/market et les pages villes SEO.
//  Source : DVF (DGFiP/Etalab) — files.data.gouv.fr/geo-dvf/latest/csv
//  Les données se rafraîchissent automatiquement à chaque publication DVF.
// ============================================================================

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
  let cur = "", inQ = false;
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
      next: { revalidate: 86400 }, // cache 24 h : DVF ne bouge que quelques fois/an
    });
    if (!res.ok) return "";
    return await res.text();
  } catch { return ""; }
}

function parseRows(csvText) {
  if (!csvText || typeof csvText !== "string") return [];
  const lines = csvText.split("\n");
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]);
  const idx = {};
  header.forEach((h, i) => (idx[h.trim()] = i));
  const need = ["id_mutation", "date_mutation", "nature_mutation", "valeur_fonciere", "type_local", "surface_reelle_bati"];
  for (const k of need) if (!(k in idx)) return [];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const c = splitCsvLine(lines[i]);
    if (c.length < header.length) continue;
    rows.push({
      id: c[idx.id_mutation], date: c[idx.date_mutation], nature: c[idx.nature_mutation],
      valeur: parseFloat(c[idx.valeur_fonciere]), type: c[idx.type_local],
      surface: parseFloat(c[idx.surface_reelle_bati]),
    });
  }
  return rows;
}

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
    muts.push({ date: mainRows[0].date, pm2 });
  }
  return muts;
}

// Statistiques DVF d'une commune : médiane €/m², volume, par année, tendance annualisée.
export async function communeStats(insee, type = "Appartement") {
  const dept = deptFromInsee(insee);
  const nowY = new Date().getFullYear();
  const years = [nowY - 3, nowY - 2, nowY - 1];
  const texts = await Promise.all(years.map((y) => fetchDvfYear(y, dept, insee)));
  const all = [];
  texts.forEach((txt, i) => { for (const m of buildMutations(parseRows(txt), type)) all.push({ ...m, year: years[i] }); });
  if (all.length < 5) return { medianPm2: null, count: 0, byYear: [], trendPct: null };

  const byYear = [];
  for (const y of years) {
    const arr = all.filter((m) => m.year === y).map((m) => m.pm2);
    if (arr.length >= 10) byYear.push({ year: y, med: Math.round(median(arr)), n: arr.length });
  }
  let trendPct = null;
  if (byYear.length >= 2) {
    const first = byYear[0], last = byYear[byYear.length - 1];
    const span = last.year - first.year || 1;
    let annual = Math.pow(last.med / first.med, 1 / span) - 1;
    annual = Math.max(-0.08, Math.min(0.08, annual));
    trendPct = +(annual * 100).toFixed(1);
  }
  return { medianPm2: Math.round(median(all.map((m) => m.pm2))), count: all.length, byYear, trendPct };
}
