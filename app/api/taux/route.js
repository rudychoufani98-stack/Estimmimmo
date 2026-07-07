// Taux officiel des credits immobiliers en France (nouvelles operations, menages).
// Source : Banque de France via l'API de la BCE (data-api.ecb.europa.eu) - gratuit, sans cle.
// Serie MIR : M.FR.B.A2C.AM.R.A.2250.EUR.N. Publiee mensuellement (~6 semaines de decalage).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url =
    "https://data-api.ecb.europa.eu/service/data/MIR/M.FR.B.A2C.AM.R.A.2250.EUR.N?lastNObservations=4&format=jsondata";
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "EstimImmo/1.0" },
      cache: "no-store",
    });
    if (!res.ok) return Response.json({ rate: null });
    const j = await res.json();
    const series = j.dataSets?.[0]?.series;
    const key = series && Object.keys(series)[0];
    const obs = key ? series[key].observations : null;
    const times = j.structure?.dimensions?.observation?.[0]?.values?.map((v) => v.id) || [];
    if (!obs) return Response.json({ rate: null });

    // derniere observation non nulle
    let best = null;
    for (const k of Object.keys(obs)) {
      const idx = parseInt(k);
      const val = obs[k]?.[0];
      if (val != null && (best === null || idx > best.idx)) best = { idx, val };
    }
    if (!best) return Response.json({ rate: null });

    return Response.json(
      {
        rate: best.val,
        period: times[best.idx] || null, // ex: "2026-04"
        source: "Banque de France / BCE",
      },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } }
    );
  } catch (e) {
    return Response.json({ rate: null, error: e.message });
  }
}
