// Address autocomplete proxy -> IGN Geoplateforme (BAN).
// Returns clean suggestions with postcode so the user picks the exact address.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (q.trim().length < 3) return Response.json({ results: [] });

  try {
    const r = await fetch(
      `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(q)}&limit=6&autocomplete=1`,
      { headers: { "User-Agent": "EstimImmo/1.0" } }
    );
    const data = await r.json();
    const results = (data.features || []).map((f) => {
      const p = f.properties;
      const [lon, lat] = f.geometry.coordinates;
      const dept = (p.context || "").split(",")[0].trim();
      return {
        label: p.label,
        context: p.context || "",
        postcode: p.postcode || "",
        city: p.city || "",
        citycode: p.citycode || "",
        type: p.type, // housenumber | street | locality | municipality
        lat,
        lon,
        area: p.city ? `${p.city}${dept ? ` (${dept})` : ""}` : p.label,
      };
    });
    return Response.json({ results });
  } catch (e) {
    return Response.json({ results: [], error: e.message });
  }
}
