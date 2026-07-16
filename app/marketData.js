// ============================================================================
//  Carte des marchés — données de référence
//  CITIES  : grandes villes (prix/m², rendement, évolution, score) — indicatif
//  IDF_COMMUNES : communes d'Île-de-France (le prix/m² vient en direct des
//                 ventes réelles DVF via /api/market)
// ============================================================================

export const CITIES = [
  { name: "Paris", insee: "75056", lat: 48.8566, lon: 2.3522, pm2: 9500, y1: -3, rdt: 3.4, enc: true, abnb: true },
  { name: "Lyon", insee: "69123", lat: 45.764, lon: 4.8357, pm2: 4700, y1: -4, rdt: 4.2, enc: true, abnb: true },
  { name: "Marseille", insee: "13055", lat: 43.2965, lon: 5.3698, pm2: 3500, y1: 3, rdt: 5.6, enc: false, abnb: true },
  { name: "Toulouse", insee: "31555", lat: 43.6047, lon: 1.4442, pm2: 3600, y1: -1, rdt: 4.8, enc: false, abnb: true },
  { name: "Nice", insee: "06088", lat: 43.7102, lon: 7.262, pm2: 5000, y1: 1.5, rdt: 4.3, enc: false, abnb: true },
  { name: "Nantes", insee: "44109", lat: 47.2184, lon: -1.5536, pm2: 3900, y1: -3, rdt: 4.5, enc: false, abnb: true },
  { name: "Montpellier", insee: "34172", lat: 43.6108, lon: 3.8767, pm2: 3600, y1: 1, rdt: 5, enc: true, abnb: true },
  { name: "Strasbourg", insee: "67482", lat: 48.5734, lon: 7.7521, pm2: 3600, y1: -1.5, rdt: 4.6, enc: false, abnb: true },
  { name: "Bordeaux", insee: "33063", lat: 44.8378, lon: -0.5792, pm2: 4700, y1: -5, rdt: 4.2, enc: true, abnb: true },
  { name: "Lille", insee: "59350", lat: 50.6292, lon: 3.0573, pm2: 3600, y1: -3, rdt: 5, enc: true, abnb: true },
  { name: "Rennes", insee: "35238", lat: 48.1173, lon: -1.6778, pm2: 3900, y1: -2, rdt: 4.6, enc: false, abnb: true },
  { name: "Reims", insee: "51454", lat: 49.2583, lon: 4.0317, pm2: 2700, y1: -1, rdt: 5.6, enc: false, abnb: false },
  { name: "Saint-Étienne", insee: "42218", lat: 45.4397, lon: 4.3872, pm2: 1500, y1: 2, rdt: 8.5, enc: false, abnb: false },
  { name: "Le Havre", insee: "76351", lat: 49.4944, lon: 0.1079, pm2: 2300, y1: 2, rdt: 6.5, enc: false, abnb: false },
  { name: "Toulon", insee: "83137", lat: 43.1242, lon: 5.928, pm2: 3300, y1: 3, rdt: 5.4, enc: false, abnb: true },
  { name: "Grenoble", insee: "38185", lat: 45.1885, lon: 5.7245, pm2: 2700, y1: -2, rdt: 5.6, enc: false, abnb: true },
  { name: "Dijon", insee: "21231", lat: 47.322, lon: 5.0415, pm2: 2900, y1: 0, rdt: 5.2, enc: false, abnb: false },
  { name: "Angers", insee: "49007", lat: 47.4784, lon: -0.5632, pm2: 3300, y1: -3, rdt: 4.8, enc: false, abnb: false },
  { name: "Nîmes", insee: "30189", lat: 43.8367, lon: 4.3601, pm2: 2300, y1: 1, rdt: 6.2, enc: false, abnb: false },
  { name: "Villeurbanne", insee: "69266", lat: 45.7719, lon: 4.8902, pm2: 4200, y1: -3, rdt: 4.4, enc: true, abnb: true },
  { name: "Clermont-Ferrand", insee: "63113", lat: 45.7772, lon: 3.087, pm2: 2500, y1: 0, rdt: 5.6, enc: false, abnb: false },
  { name: "Le Mans", insee: "72181", lat: 48.0061, lon: 0.1996, pm2: 2100, y1: 1, rdt: 6.8, enc: false, abnb: false },
  { name: "Aix-en-Provence", insee: "13001", lat: 43.5297, lon: 5.4474, pm2: 5200, y1: 0, rdt: 4, enc: false, abnb: true },
  { name: "Brest", insee: "29019", lat: 48.3904, lon: -4.4861, pm2: 2300, y1: 2, rdt: 6, enc: false, abnb: false },
  { name: "Tours", insee: "37261", lat: 47.3941, lon: 0.6848, pm2: 3100, y1: -1, rdt: 5, enc: false, abnb: false },
  { name: "Limoges", insee: "87085", lat: 45.8336, lon: 1.2611, pm2: 1700, y1: 1, rdt: 7.5, enc: false, abnb: false },
  { name: "Amiens", insee: "80021", lat: 49.8941, lon: 2.2958, pm2: 2600, y1: 0, rdt: 5.8, enc: false, abnb: false },
  { name: "Metz", insee: "57463", lat: 49.1193, lon: 6.1757, pm2: 2500, y1: 0, rdt: 5.6, enc: false, abnb: false },
  { name: "Besançon", insee: "25056", lat: 47.2378, lon: 6.0241, pm2: 2500, y1: -1, rdt: 5.6, enc: false, abnb: false },
  { name: "Perpignan", insee: "66136", lat: 42.6887, lon: 2.8948, pm2: 2100, y1: 1.5, rdt: 6.6, enc: false, abnb: false },
  { name: "Orléans", insee: "45234", lat: 47.9029, lon: 1.9093, pm2: 2900, y1: -1, rdt: 5.2, enc: false, abnb: false },
  { name: "Rouen", insee: "76540", lat: 49.4432, lon: 1.0993, pm2: 2800, y1: -1.5, rdt: 5.4, enc: false, abnb: false },
  { name: "Mulhouse", insee: "68224", lat: 47.7508, lon: 7.3359, pm2: 1600, y1: 2, rdt: 8.8, enc: false, abnb: false },
  { name: "Caen", insee: "14118", lat: 49.1829, lon: -0.3707, pm2: 3000, y1: -1, rdt: 5.2, enc: false, abnb: false },
  { name: "Nancy", insee: "54395", lat: 48.6921, lon: 6.1844, pm2: 2600, y1: 0, rdt: 5.6, enc: false, abnb: false },
  { name: "Annecy", insee: "74010", lat: 45.8992, lon: 6.1294, pm2: 5500, y1: 1, rdt: 3.8, enc: false, abnb: true },
  { name: "Biarritz", insee: "64122", lat: 43.4832, lon: -1.5586, pm2: 7500, y1: 2, rdt: 3.5, enc: true, abnb: true },
  { name: "La Rochelle", insee: "17300", lat: 46.1603, lon: -1.1511, pm2: 4600, y1: 1, rdt: 4.4, enc: false, abnb: true },
  { name: "Bayonne", insee: "64102", lat: 43.4929, lon: -1.4748, pm2: 4200, y1: 2, rdt: 4.6, enc: true, abnb: true },
  { name: "Pau", insee: "64445", lat: 43.2951, lon: -0.3708, pm2: 2200, y1: 0, rdt: 6, enc: false, abnb: false },
  { name: "Avignon", insee: "84007", lat: 43.9493, lon: 4.8055, pm2: 2400, y1: 1, rdt: 6, enc: false, abnb: true },
  { name: "Cannes", insee: "06029", lat: 43.5528, lon: 7.0174, pm2: 6500, y1: 1, rdt: 3.8, enc: false, abnb: true },
  { name: "Antibes", insee: "06004", lat: 43.5808, lon: 7.1239, pm2: 5500, y1: 1, rdt: 4, enc: false, abnb: true },
  { name: "Menton", insee: "06083", lat: 43.7765, lon: 7.5031, pm2: 5200, y1: 1.5, rdt: 4, enc: false, abnb: true },
  { name: "Saint-Tropez", insee: "83119", lat: 43.2716, lon: 6.6407, pm2: 13000, y1: 2, rdt: 2.8, enc: false, abnb: true },
  { name: "Arcachon", insee: "33009", lat: 44.6588, lon: -1.1683, pm2: 6500, y1: 1, rdt: 3.6, enc: false, abnb: true },
  { name: "Ajaccio", insee: "2A004", lat: 41.9192, lon: 8.7386, pm2: 3300, y1: 2, rdt: 5, enc: false, abnb: true },
  { name: "Chambéry", insee: "73065", lat: 45.5646, lon: 5.9178, pm2: 3000, y1: 0, rdt: 5.2, enc: false, abnb: false },
  { name: "Colmar", insee: "68066", lat: 48.0794, lon: 7.3585, pm2: 2700, y1: 1, rdt: 5.4, enc: false, abnb: false },
  { name: "Vannes", insee: "56260", lat: 47.6582, lon: -2.7608, pm2: 3900, y1: 0, rdt: 4.6, enc: false, abnb: true },
  { name: "Saint-Malo", insee: "35288", lat: 48.6493, lon: -2.0257, pm2: 4700, y1: 1, rdt: 4.2, enc: false, abnb: true },
  { name: "Deauville", insee: "14220", lat: 49.36, lon: 0.0755, pm2: 6800, y1: 1, rdt: 3.5, enc: false, abnb: true },
  { name: "Le Touquet", insee: "62826", lat: 50.5241, lon: 1.5883, pm2: 6500, y1: 1, rdt: 3.4, enc: false, abnb: true }
];

export const IDF_COMMUNES = [
  { insee: "75101", name: "Paris 1er", lat: 48.8626, lon: 2.3363 },
  { insee: "75102", name: "Paris 2e", lat: 48.8679, lon: 2.3412 },
  { insee: "75103", name: "Paris 3e", lat: 48.863, lon: 2.3625 },
  { insee: "75104", name: "Paris 4e", lat: 48.8544, lon: 2.3573 },
  { insee: "75105", name: "Paris 5e", lat: 48.8448, lon: 2.3501 },
  { insee: "75106", name: "Paris 6e", lat: 48.849, lon: 2.3327 },
  { insee: "75107", name: "Paris 7e", lat: 48.8561, lon: 2.3125 },
  { insee: "75108", name: "Paris 8e", lat: 48.8726, lon: 2.3125 },
  { insee: "75109", name: "Paris 9e", lat: 48.8768, lon: 2.339 },
  { insee: "75110", name: "Paris 10e", lat: 48.876, lon: 2.36 },
  { insee: "75111", name: "Paris 11e", lat: 48.858, lon: 2.3799 },
  { insee: "75112", name: "Paris 12e", lat: 48.835, lon: 2.421 },
  { insee: "75113", name: "Paris 13e", lat: 48.8283, lon: 2.355 },
  { insee: "75114", name: "Paris 14e", lat: 48.829, lon: 2.326 },
  { insee: "75115", name: "Paris 15e", lat: 48.8417, lon: 2.2986 },
  { insee: "75116", name: "Paris 16e", lat: 48.8637, lon: 2.2769 },
  { insee: "75117", name: "Paris 17e", lat: 48.887, lon: 2.3075 },
  { insee: "75118", name: "Paris 18e", lat: 48.8927, lon: 2.3444 },
  { insee: "75119", name: "Paris 19e", lat: 48.887, lon: 2.382 },
  { insee: "75120", name: "Paris 20e", lat: 48.8634, lon: 2.401 },
  { insee: "92012", name: "Boulogne-Billancourt", lat: 48.835, lon: 2.24 },
  { insee: "92050", name: "Nanterre", lat: 48.892, lon: 2.206 },
  { insee: "92051", name: "Neuilly-sur-Seine", lat: 48.885, lon: 2.269 },
  { insee: "92026", name: "Courbevoie", lat: 48.897, lon: 2.256 },
  { insee: "92025", name: "Colombes", lat: 48.923, lon: 2.254 },
  { insee: "92004", name: "Asnières-sur-Seine", lat: 48.911, lon: 2.285 },
  { insee: "92063", name: "Rueil-Malmaison", lat: 48.877, lon: 2.18 },
  { insee: "92044", name: "Levallois-Perret", lat: 48.893, lon: 2.287 },
  { insee: "92040", name: "Issy-les-Moulineaux", lat: 48.824, lon: 2.273 },
  { insee: "92002", name: "Antony", lat: 48.754, lon: 2.297 },
  { insee: "92049", name: "Montrouge", lat: 48.818, lon: 2.314 },
  { insee: "92062", name: "Puteaux", lat: 48.884, lon: 2.239 },
  { insee: "92048", name: "Meudon", lat: 48.814, lon: 2.238 },
  { insee: "93066", name: "Saint-Denis", lat: 48.936, lon: 2.357 },
  { insee: "93048", name: "Montreuil", lat: 48.863, lon: 2.448 },
  { insee: "93001", name: "Aubervilliers", lat: 48.916, lon: 2.383 },
  { insee: "93005", name: "Aulnay-sous-Bois", lat: 48.934, lon: 2.494 },
  { insee: "93029", name: "Drancy", lat: 48.927, lon: 2.445 },
  { insee: "93051", name: "Noisy-le-Grand", lat: 48.848, lon: 2.553 },
  { insee: "93055", name: "Pantin", lat: 48.897, lon: 2.409 },
  { insee: "93070", name: "Saint-Ouen-sur-Seine", lat: 48.911, lon: 2.333 },
  { insee: "93064", name: "Rosny-sous-Bois", lat: 48.871, lon: 2.483 },
  { insee: "94028", name: "Créteil", lat: 48.79, lon: 2.455 },
  { insee: "94081", name: "Vitry-sur-Seine", lat: 48.787, lon: 2.392 },
  { insee: "94017", name: "Champigny-sur-Marne", lat: 48.817, lon: 2.515 },
  { insee: "94068", name: "Saint-Maur-des-Fossés", lat: 48.8, lon: 2.493 },
  { insee: "94080", name: "Vincennes", lat: 48.848, lon: 2.437 },
  { insee: "94041", name: "Ivry-sur-Seine", lat: 48.813, lon: 2.388 },
  { insee: "94046", name: "Maisons-Alfort", lat: 48.805, lon: 2.439 },
  { insee: "94076", name: "Villejuif", lat: 48.794, lon: 2.359 },
  { insee: "94052", name: "Nogent-sur-Marne", lat: 48.836, lon: 2.482 },
  { insee: "78646", name: "Versailles", lat: 48.801, lon: 2.13 },
  { insee: "78551", name: "Saint-Germain-en-Laye", lat: 48.899, lon: 2.094 },
  { insee: "78586", name: "Sartrouville", lat: 48.939, lon: 2.163 },
  { insee: "78361", name: "Mantes-la-Jolie", lat: 48.99, lon: 1.717 },
  { insee: "78498", name: "Poissy", lat: 48.929, lon: 2.046 },
  { insee: "91228", name: "Évry-Courcouronnes", lat: 48.629, lon: 2.441 },
  { insee: "91377", name: "Massy", lat: 48.73, lon: 2.283 },
  { insee: "91174", name: "Corbeil-Essonnes", lat: 48.614, lon: 2.482 },
  { insee: "91589", name: "Savigny-sur-Orge", lat: 48.679, lon: 2.345 },
  { insee: "91477", name: "Palaiseau", lat: 48.715, lon: 2.246 },
  { insee: "95018", name: "Argenteuil", lat: 48.947, lon: 2.247 },
  { insee: "95127", name: "Cergy", lat: 49.036, lon: 2.078 },
  { insee: "95585", name: "Sarcelles", lat: 48.996, lon: 2.378 },
  { insee: "95500", name: "Pontoise", lat: 49.051, lon: 2.101 },
  { insee: "77284", name: "Meaux", lat: 48.96, lon: 2.878 },
  { insee: "77108", name: "Chelles", lat: 48.883, lon: 2.592 },
  { insee: "77288", name: "Melun", lat: 48.539, lon: 2.66 },
  { insee: "77186", name: "Fontainebleau", lat: 48.409, lon: 2.702 },
  { insee: "92024", name: "Clichy", lat: 48.904, lon: 2.306 },
  { insee: "92023", name: "Clamart", lat: 48.802, lon: 2.266 },
  { insee: "92036", name: "Gennevilliers", lat: 48.933, lon: 2.298 },
  { insee: "92073", name: "Suresnes", lat: 48.869, lon: 2.229 },
  { insee: "92007", name: "Bagneux", lat: 48.796, lon: 2.312 },
  { insee: "92020", name: "Châtillon", lat: 48.802, lon: 2.293 },
  { insee: "92046", name: "Malakoff", lat: 48.816, lon: 2.3 },
  { insee: "93008", name: "Bobigny", lat: 48.906, lon: 2.439 },
  { insee: "93010", name: "Bondy", lat: 48.902, lon: 2.483 },
  { insee: "93031", name: "Épinay-sur-Seine", lat: 48.955, lon: 2.309 },
  { insee: "93071", name: "Sevran", lat: 48.938, lon: 2.529 },
  { insee: "93007", name: "Le Blanc-Mesnil", lat: 48.938, lon: 2.462 },
  { insee: "93027", name: "La Courneuve", lat: 48.926, lon: 2.398 },
  { insee: "93053", name: "Noisy-le-Sec", lat: 48.89, lon: 2.457 },
  { insee: "93046", name: "Livry-Gargan", lat: 48.919, lon: 2.54 },
  { insee: "93032", name: "Gagny", lat: 48.882, lon: 2.535 },
  { insee: "93006", name: "Bagnolet", lat: 48.869, lon: 2.418 },
  { insee: "93072", name: "Stains", lat: 48.951, lon: 2.383 },
  { insee: "94033", name: "Fontenay-sous-Bois", lat: 48.851, lon: 2.477 },
  { insee: "94022", name: "Choisy-le-Roi", lat: 48.765, lon: 2.41 },
  { insee: "94002", name: "Alfortville", lat: 48.805, lon: 2.42 },
  { insee: "94058", name: "Le Perreux-sur-Marne", lat: 48.84, lon: 2.503 },
  { insee: "94078", name: "Villeneuve-Saint-Georges", lat: 48.732, lon: 2.449 },
  { insee: "94016", name: "Cachan", lat: 48.792, lon: 2.334 },
  { insee: "94018", name: "Charenton-le-Pont", lat: 48.822, lon: 2.412 },
  { insee: "94038", name: "L'Haÿ-les-Roses", lat: 48.78, lon: 2.335 },
  { insee: "94073", name: "Thiais", lat: 48.765, lon: 2.393 },
  { insee: "78172", name: "Conflans-Sainte-Honorine", lat: 48.999, lon: 2.099 },
  { insee: "78423", name: "Montigny-le-Bretonneux", lat: 48.769, lon: 2.038 },
  { insee: "78440", name: "Les Mureaux", lat: 48.988, lon: 1.917 },
  { insee: "78146", name: "Chatou", lat: 48.889, lon: 2.159 },
  { insee: "78311", name: "Houilles", lat: 48.925, lon: 2.191 },
  { insee: "78621", name: "Trappes", lat: 48.775, lon: 2.005 },
  { insee: "78358", name: "Maisons-Laffitte", lat: 48.945, lon: 2.146 },
  { insee: "91549", name: "Sainte-Geneviève-des-Bois", lat: 48.638, lon: 2.335 },
  { insee: "91687", name: "Viry-Châtillon", lat: 48.671, lon: 2.375 },
  { insee: "91027", name: "Athis-Mons", lat: 48.705, lon: 2.393 },
  { insee: "91286", name: "Grigny", lat: 48.655, lon: 2.386 },
  { insee: "91692", name: "Les Ulis", lat: 48.681, lon: 2.168 },
  { insee: "95268", name: "Garges-lès-Gonesse", lat: 48.973, lon: 2.401 },
  { insee: "95252", name: "Franconville", lat: 48.988, lon: 2.228 },
  { insee: "95219", name: "Ermont", lat: 48.99, lon: 2.259 },
  { insee: "95280", name: "Goussainville", lat: 49.028, lon: 2.467 },
  { insee: "95063", name: "Bezons", lat: 48.924, lon: 2.217 },
  { insee: "95306", name: "Herblay-sur-Seine", lat: 48.99, lon: 2.163 },
  { insee: "77373", name: "Pontault-Combault", lat: 48.797, lon: 2.606 },
  { insee: "77445", name: "Savigny-le-Temple", lat: 48.585, lon: 2.583 },
  { insee: "77083", name: "Champs-sur-Marne", lat: 48.851, lon: 2.603 },
  { insee: "77514", name: "Villeparisis", lat: 48.945, lon: 2.607 }
];

// Villes disposant d'un détail par secteur / arrondissement
export const METRO_INSEE = new Set(["75056", "69123", "13055"]);

// ---- Helpers d'affichage ----
export const fmtNum = (n) => Math.round(n).toLocaleString("fr-FR");
export const clamp01 = (x) => Math.max(0, Math.min(1, x));

// Échelle de couleur rouge -> ambre -> vert (t de 0 à 1)
export function colorScale(t) {
  const stops = [[220, 38, 38], [217, 119, 6], [22, 163, 74]];
  const i = t < 0.5 ? 0 : 1;
  const k = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
  const a = stops[i], b = stops[i + 1];
  const c = a.map((v, j) => Math.round(v + (b[j] - v) * k));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

// Score d'investissement /100 : rendement (45%), dynamique prix (35%), accessibilité (20%)
export function score(c) {
  return Math.round(
    100 * (0.45 * clamp01((c.rdt - 3) / 6) +
           0.35 * clamp01((c.y1 + 5) / 11) +
           0.20 * clamp01((9500 - c.pm2) / 8000))
  );
}

// Position 0..1 sur l'échelle de couleur selon l'indicateur choisi
export function metricNorm(metric, c) {
  if (metric === "score") return score(c) / 100;
  if (metric === "rdt") return clamp01((c.rdt - 3) / 6);
  if (metric === "y1") return clamp01((c.y1 + 5) / 11);
  if (metric === "pm2") return clamp01((9500 - c.pm2) / 8000);
  return 0.5;
}

export const MONTHS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
export const monthLabel = (d) => MONTHS[d.getMonth()] + " " + d.getFullYear();

export const METRICS = [
  { key: "score", label: "Score d'investissement", fmt: (c) => score(c) + "/100" },
  { key: "rdt",   label: "Rendement locatif",      fmt: (c) => c.rdt.toFixed(1).replace(".", ",") + " %" },
  { key: "y1",    label: "Évolution 1 an",         fmt: (c) => (c.y1 > 0 ? "+" : "") + c.y1.toFixed(1).replace(".", ",") + " %" },
  { key: "pm2",   label: "Prix au m²",             fmt: (c) => fmtNum(c.pm2) + " €/m²" },
];

// ---- Île-de-France : réglementation & profils ----
// Communes où l'encadrement des loyers s'applique (Paris, Plaine Commune, Est Ensemble)
export const IDF_ENCADREMENT = new Set([
  "75056",
  "93066", "93001", "93070", "93031", "93072", "93079", "93059", "93039",
  "93048", "93006", "93008", "93055", "93053", "93063", "93045", "93061", "93010",
]);
export const isEncadree = (insee) => insee.startsWith("751") || IDF_ENCADREMENT.has(insee);
// Petite couronne : changement d'usage souvent exigé pour le meublé touristique
export const isPetiteCouronne = (insee) => ["75", "92", "93", "94"].includes(insee.slice(0, 2));

export const DEPT_INFO = {
  "75": "Paris : le marché le plus liquide et patrimonial de France. Demande locative inépuisable, mais prix d'entrée et fiscalité élevés — rendements faibles, pari sur la valeur long terme.",
  "92": "Hauts-de-Seine : l'ouest parisien des cadres (La Défense, Boulogne, Neuilly). Marché cher et résilient, locataires très solvables, vacance quasi nulle. Logique patrimoniale sécurisée.",
  "93": "Seine-Saint-Denis : le département le plus abordable de la petite couronne, en pleine mutation (Grand Paris Express, JO 2024). Rendements élevés et fort potentiel de plus-value, mais sélectivité indispensable (quartier par quartier, gestion locative exigeante).",
  "94": "Val-de-Marne : bon compromis prix/proximité de Paris (Vincennes, Saint-Maur côté premium ; Créteil, Choisy plus accessibles). Desserte en forte amélioration avec la ligne 15.",
  "77": "Seine-et-Marne : la grande couronne la plus abordable. Autour de Marne-la-Vallée et Meaux, demande familiale portée par le RER et Disney. Rendements corrects, horizon plus long.",
  "78": "Yvelines : marché familial haut de gamme (Versailles, Saint-Germain). Excellents lycées, demande stable de cadres — valeurs sûres, rendements modérés.",
  "91": "Essonne : prix accessibles, tiré par le pôle Paris-Saclay (universités, R&D) au nord et des villes plus populaires au sud. Bon terrain de rendement en grande couronne.",
  "95": "Val-d'Oise : l'un des meilleurs rapports prix/rendement de la région (Argenteuil, Cergy). Demande locative forte, mais bien choisir la commune et la proximité de la gare.",
};
