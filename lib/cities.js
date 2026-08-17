// Liste unifiée des villes/communes pour les pages SEO (slug + département).
import { CITIES, IDF_COMMUNES } from "../app/marketData";

export function slugify(s) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // enlève les accents
    .replace(/['’]/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function deptFromInsee(insee) {
  if (/^(2A|2B)/i.test(insee)) return insee.slice(0, 2).toUpperCase();
  if (/^97|^98/.test(insee)) return insee.slice(0, 3);
  return insee.slice(0, 2);
}

const DEPT_NAME = {
  "75": "Paris", "77": "Seine-et-Marne", "78": "Yvelines", "91": "Essonne",
  "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis", "94": "Val-de-Marne", "95": "Val-d'Oise",
  "06": "Alpes-Maritimes", "13": "Bouches-du-Rhône", "31": "Haute-Garonne", "33": "Gironde",
  "34": "Hérault", "35": "Ille-et-Vilaine", "44": "Loire-Atlantique", "59": "Nord",
  "67": "Bas-Rhin", "69": "Rhône", "74": "Haute-Savoie", "83": "Var", "84": "Vaucluse",
};

// Fusion : 53 grandes villes (avec rendement) + communes d'Île-de-France
const raw = [
  ...CITIES.map((c) => ({ ...c, kind: "ville" })),
  ...IDF_COMMUNES
    .filter((c) => !/^Paris \d/.test(c.name)) // on garde Paris global, pas les arrondissements
    .map((c) => ({ ...c, kind: "commune" })),
];

const seen = new Set();
export const SEO_CITIES = raw
  .filter((c) => (seen.has(c.insee) ? false : (seen.add(c.insee), true)))
  .map((c) => {
    const dept = deptFromInsee(c.insee);
    return {
      name: c.name,
      insee: c.insee,
      slug: slugify(c.name),
      dept,
      deptName: DEPT_NAME[dept] || null,
      lat: c.lat, lon: c.lon,
      kind: c.kind,
      pm2Ref: c.pm2 || null,   // prix de référence (villes)
      rdt: c.rdt || null,      // rendement de référence (villes)
      y1: c.y1 != null ? c.y1 : null,
    };
  });

export const CITY_BY_SLUG = Object.fromEntries(SEO_CITIES.map((c) => [c.slug, c]));

// Villes "voisines" pour le maillage interne (même département d'abord, puis autres)
export function relatedCities(city, n = 8) {
  const sameDept = SEO_CITIES.filter((c) => c.dept === city.dept && c.slug !== city.slug);
  const others = SEO_CITIES.filter((c) => c.dept !== city.dept && c.slug !== city.slug);
  return [...sameDept, ...others].slice(0, n);
}
