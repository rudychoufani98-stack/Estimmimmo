import Link from "next/link";
import { notFound } from "next/navigation";
import { CITY_BY_SLUG, SEO_CITIES, relatedCities } from "../../../lib/cities";
import { communeStats } from "../../../lib/dvf";

export const dynamic = "force-dynamic"; // rendu serveur + données DVF fraîches (pas d'ISR sur Cloudflare)

const euro = (n) => Math.round(n).toLocaleString("fr-FR");
const YEAR = new Date().getFullYear();

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const city = CITY_BY_SLUG[slug];
  if (!city) return { title: "Ville introuvable | EstimImmo" };
  const stats = await communeStats(city.insee).catch(() => ({ medianPm2: null }));
  const pm2 = stats.medianPm2 || city.pm2Ref;
  const prix = pm2 ? `${euro(pm2)} €/m²` : "prix DVF réels";
  return {
    title: `Prix immobilier ${city.name} ${YEAR} : ${prix} (données DVF) | EstimImmo`,
    description: `Prix au m² à ${city.name} d'après les ventes réelles DVF : ${prix}. Évolution, rentabilité locative et estimation gratuite de votre bien à ${city.name}.`,
    alternates: { canonical: `https://estmimmo.fr/ville/${slug}` },
  };
}

function marketPhrase(pm2) {
  if (pm2 >= 6000) return "un marché haut de gamme, parmi les plus chers de France";
  if (pm2 >= 4000) return "un marché cher et tendu";
  if (pm2 >= 2800) return "un marché de prix intermédiaire";
  if (pm2 >= 2000) return "un marché abordable, à bon potentiel de rendement";
  return "un marché très abordable, à fort effet de levier";
}

export default async function VillePage({ params }) {
  const { slug } = await params;
  const city = CITY_BY_SLUG[slug];
  if (!city) notFound();

  const stats = await communeStats(city.insee).catch(() => ({ medianPm2: null, count: 0, byYear: [], trendPct: null }));
  const pm2 = stats.medianPm2 || city.pm2Ref;
  const trend = stats.trendPct != null ? stats.trendPct : city.y1;
  const related = relatedCities(city, 10);
  const rdt = city.rdt;
  const APP = "https://estmimmo.fr/";

  return (
    <main className="seo-page">
      <nav className="seo-crumb">
        <Link href="/ville">Prix par ville</Link> <span>›</span> <b>{city.name}</b>
      </nav>

      <header className="seo-hero">
        <h1>Prix immobilier à {city.name} en {YEAR}</h1>
        <p className="seo-sub">
          {city.deptName ? `${city.deptName} · ` : ""}Prix au m² d'après les <b>ventes réelles enregistrées (DVF)</b>, sources officielles DGFiP/Etalab.
        </p>
        <div className="seo-stat">
          <div className="seo-stat-main">
            <span>Prix médian au m²</span>
            <b>{pm2 ? `${euro(pm2)} €` : "n.c."}</b>
          </div>
          {trend != null && (
            <div className="seo-stat-side">
              <span>Évolution / an</span>
              <b className={trend >= 0 ? "pos" : "neg"}>{trend > 0 ? "+" : ""}{String(trend).replace(".", ",")} %</b>
            </div>
          )}
          {stats.count > 0 && (
            <div className="seo-stat-side">
              <span>Ventes analysées</span>
              <b>{euro(stats.count)}</b>
            </div>
          )}
        </div>
        <a className="seo-cta" href={APP}>Estimer mon bien à {city.name} — gratuit</a>
      </header>

      {stats.byYear && stats.byYear.length > 0 && (
        <section className="seo-block">
          <h2>Évolution du prix au m² à {city.name}</h2>
          <table className="seo-table">
            <thead><tr><th>Année</th><th>Prix médian au m²</th><th>Nombre de ventes</th></tr></thead>
            <tbody>
              {stats.byYear.map((e) => (
                <tr key={e.year}><td>{e.year}</td><td><b>{euro(e.med)} €</b></td><td>{e.n}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="seo-note">Prix médians appartements, calculés à partir des transactions DVF de {city.name}. Mise à jour automatique à chaque publication des données.</p>
        </section>
      )}

      <section className="seo-block">
        <h2>Faut-il investir à {city.name} ?</h2>
        {pm2 && <p>{city.name} est {marketPhrase(pm2)} (~{euro(pm2)} €/m² médian réel).</p>}
        {trend != null && (
          <p>Côté dynamique, {trend <= -2 ? `les prix reculent (${String(trend).replace(".", ",")} %/an) — marge de négociation réelle pour un acheteur`
            : trend < 2 ? "les prix sont globalement stables"
            : `les prix progressent (+${String(trend).replace(".", ",")} %/an) — marché porteur`}.</p>
        )}
        {rdt && <p>Le rendement locatif brut de référence y est d'environ <b>{String(rdt).replace(".", ",")} %</b>. {rdt >= 6 ? "Un niveau élevé, intéressant pour du cashflow." : rdt >= 4.5 ? "Un rendement correct, à équilibrer avec le potentiel de plus-value." : "Un rendement plutôt patrimonial que cashflow."}</p>}
        <p className="seo-note">Estimation indicative, ne constitue pas une expertise. Faites votre propre estimation détaillée gratuitement ci-dessous.</p>
      </section>

      <section className="seo-cta-block">
        <h2>Combien vaut votre bien à {city.name} ?</h2>
        <p>Obtenez une estimation gratuite basée sur les ventes réelles autour de votre adresse, ajustée à votre bien (surface, étage, DPE, état…).</p>
        <a className="seo-cta" href={APP}>Lancer mon estimation gratuite</a>
      </section>

      <section className="seo-block">
        <h2>Prix immobilier dans d'autres villes</h2>
        <div className="seo-links">
          {related.map((c) => (
            <Link key={c.slug} href={`/ville/${c.slug}`}>Prix immobilier {c.name}</Link>
          ))}
        </div>
      </section>

      <footer className="seo-foot">
        <p>Sources : DVF (DGFiP/Etalab), IGN. Données mises à jour automatiquement. Prix médians indicatifs, ne constituent pas une expertise.</p>
        <Link href="/ville">← Toutes les villes</Link> · <a href={APP}>EstimImmo — accueil</a>
      </footer>
    </main>
  );
}
