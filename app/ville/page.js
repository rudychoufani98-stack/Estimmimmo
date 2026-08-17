import Link from "next/link";
import { SEO_CITIES } from "../../lib/cities";

export const metadata = {
  title: "Prix immobilier par ville en France (données DVF réelles) | EstimImmo",
  description: "Prix au m² dans plus de 150 villes et communes françaises, d'après les ventes réelles DVF. Consultez le prix immobilier de votre ville et estimez votre bien gratuitement.",
  alternates: { canonical: "https://estimmimmo.rudychoufani98.workers.dev/ville" },
};

export default function VilleHub() {
  // regroupe par département pour un maillage clair
  const byDept = {};
  for (const c of SEO_CITIES) {
    const k = c.deptName ? `${c.dept} — ${c.deptName}` : "Grandes villes de France";
    (byDept[k] ||= []).push(c);
  }
  const groups = Object.entries(byDept).sort((a, b) => b[1].length - a[1].length);

  return (
    <main className="seo-page">
      <header className="seo-hero">
        <h1>Prix immobilier par ville en France</h1>
        <p className="seo-sub">Le prix au m² de plus de <b>150 villes et communes</b>, calculé à partir des <b>ventes réelles DVF</b>. Cliquez sur votre ville, ou estimez directement votre bien.</p>
        <a className="seo-cta" href="https://estimmimmo.rudychoufani98.workers.dev/">Estimer mon bien gratuitement</a>
      </header>

      {groups.map(([dept, list]) => (
        <section className="seo-block" key={dept}>
          <h2>{dept}</h2>
          <div className="seo-links">
            {list.map((c) => (
              <Link key={c.slug} href={`/ville/${c.slug}`}>Prix immobilier {c.name}</Link>
            ))}
          </div>
        </section>
      ))}

      <footer className="seo-foot">
        <p>Sources : DVF (DGFiP/Etalab), IGN. Prix médians indicatifs, mis à jour automatiquement.</p>
        <a href="https://estimmimmo.rudychoufani98.workers.dev/">EstimImmo — accueil</a>
      </footer>
    </main>
  );
}
