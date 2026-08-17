"use client";
import { useState, useMemo } from "react";

// Dictionnaire de l'immobilier en France — termes, taxes, fiscalité, cadre légal.
// Contenu indicatif et pédagogique ; les règles évoluent (à vérifier au cas par cas).
const ENTRIES = [
  // ── TERMES CLÉS ─────────────────────────────────────────────
  { cat: "Termes clés", term: "DVF (Demandes de Valeurs Foncières)", def: "Base de données publique de l'État (DGFiP) qui recense toutes les ventes immobilières réelles des 5 dernières années : prix, surface, adresse. C'est la source la plus fiable pour connaître le vrai prix du marché — et celle qu'utilise EstimImmo." },
  { cat: "Termes clés", term: "Prix au m²", def: "Prix de vente divisé par la surface habitable. On utilise le prix médian (la valeur du milieu) plutôt que la moyenne, pour éviter que quelques ventes extrêmes ne faussent le résultat." },
  { cat: "Termes clés", term: "Surface habitable (loi Carrez)", def: "Surface de plancher des pièces closes et couvertes, hauteur sous plafond ≥ 1,80 m. Obligatoire dans l'acte pour un logement en copropriété. Différente de la surface au sol." },
  { cat: "Termes clés", term: "DPE (Diagnostic de Performance Énergétique)", def: "Note énergétique du logement de A (économe) à G (passoire). Obligatoire à la vente et à la location. Un mauvais DPE (F/G) fait baisser le prix et, depuis la loi Climat, interdit progressivement la location." },
  { cat: "Termes clés", term: "Plus-value immobilière", def: "Gain réalisé à la revente : prix de vente − prix d'achat (frais inclus). Imposable sauf pour la résidence principale (exonérée). Voir la fiche impôt correspondante." },
  { cat: "Termes clés", term: "Rendement locatif brut", def: "(Loyer annuel ÷ prix d'achat) × 100. Indicateur rapide de rentabilité, avant charges et impôts. Un « bon » brut se situe souvent entre 5 % et 8 % selon les villes." },
  { cat: "Termes clés", term: "Rendement net / net-net", def: "Le net déduit les charges (taxe foncière, copropriété, gestion, vacance). Le net-net déduit en plus l'impôt. C'est le seul chiffre qui reflète ce qui reste vraiment dans votre poche." },
  { cat: "Termes clés", term: "Cashflow", def: "Ce qu'il reste chaque mois après avoir payé le crédit et toutes les charges. Positif = le bien s'autofinance et vous rapporte ; négatif = vous devez remettre de l'argent chaque mois (effort d'épargne)." },
  { cat: "Termes clés", term: "Vacance locative", def: "Périodes où le logement est vide entre deux locataires. On la provisionne (souvent 1 mois/an) car elle réduit le rendement réel." },
  { cat: "Termes clés", term: "VEFA (achat sur plan)", def: "Vente en l'État Futur d'Achèvement : achat d'un logement neuf avant sa construction, payé par étapes selon l'avancement du chantier. Frais de notaire réduits (~2-3 %)." },

  // ── TAXES & IMPÔTS ──────────────────────────────────────────
  { cat: "Taxes & impôts", term: "Frais de notaire (droits de mutation)", def: "≈ 7 à 8 % du prix dans l'ancien, ≈ 2 à 3 % dans le neuf. Malgré le nom, l'essentiel (≈ 80 %) va à l'État et aux collectivités (droits d'enregistrement), pas au notaire. À prévoir en plus du prix d'achat." },
  { cat: "Taxes & impôts", term: "Taxe foncière", def: "Impôt annuel payé par le propriétaire (même s'il ne loue pas), calculé sur la valeur locative cadastrale. Elle a fortement augmenté ces dernières années. Un investisseur doit toujours l'intégrer dans son calcul de rentabilité." },
  { cat: "Taxes & impôts", term: "Taxe d'habitation", def: "Supprimée sur les résidences principales depuis 2023. Elle subsiste sur les résidences secondaires et les logements vacants dans certaines zones." },
  { cat: "Taxes & impôts", term: "Plus-value immobilière (imposition)", def: "Sur un bien autre que la résidence principale : 19 % d'impôt + 17,2 % de prélèvements sociaux = 36,2 %. Des abattements pour durée de détention réduisent la note : exonération totale d'impôt à 22 ans, et de prélèvements sociaux à 30 ans." },
  { cat: "Taxes & impôts", term: "IFI (Impôt sur la Fortune Immobilière)", def: "Impôt annuel dû si votre patrimoine immobilier net dépasse 1,3 M€. Barème progressif de 0,5 % à 1,5 %. Ne concerne que l'immobilier (pas les autres placements)." },
  { cat: "Taxes & impôts", term: "Prélèvements sociaux (17,2 %)", def: "CSG/CRDS appliqués aux revenus fonciers et aux plus-values immobilières, en plus de l'impôt sur le revenu. À ne jamais oublier dans un calcul de rentabilité nette." },
  { cat: "Taxes & impôts", term: "TMI (Tranche Marginale d'Imposition)", def: "Le taux d'imposition de votre dernière tranche de revenus (0, 11, 30, 41 ou 45 %). Il détermine combien vos loyers seront imposés — d'où l'importance de choisir le bon régime fiscal." },
  { cat: "Taxes & impôts", term: "CFE (Cotisation Foncière des Entreprises)", def: "Petit impôt local dû par les loueurs en meublé (LMNP), même non professionnels. Souvent quelques centaines d'euros/an, avec des exonérations possibles la 1re année ou sous seuil de recettes." },

  // ── FISCALITÉ DE L'INVESTISSEMENT ───────────────────────────
  { cat: "Fiscalité", term: "Location nue vs meublée", def: "Nue = revenus fonciers (régime foncier). Meublée = bénéfices industriels et commerciaux (BIC), souvent plus avantageux grâce à l'amortissement (LMNP réel). Le choix change fortement l'impôt." },
  { cat: "Fiscalité", term: "LMNP (Loueur Meublé Non Professionnel)", def: "Statut pour louer un logement meublé sans que ce soit votre activité principale (recettes < 23 000 €/an ou < autres revenus). Régime souvent le plus rentable fiscalement." },
  { cat: "Fiscalité", term: "LMNP au réel (amortissement)", def: "Vous déduisez toutes vos charges réelles PLUS l'amortissement du bien (usure comptable, ~2-3 %/an). Résultat : l'impôt sur les loyers est souvent nul pendant des années. Nécessite un comptable." },
  { cat: "Fiscalité", term: "Micro-BIC", def: "Régime meublé simplifié : abattement forfaitaire de 50 % (ou 30 % pour le tourisme non classé) sur les loyers, sans comptabilité. Intéressant si vous avez peu de charges." },
  { cat: "Fiscalité", term: "Micro-foncier", def: "Régime location nue simplifié : abattement de 30 % sur les loyers, si recettes < 15 000 €/an. Simple mais souvent moins avantageux que le réel dès que vous avez un crédit." },
  { cat: "Fiscalité", term: "Régime réel (foncier)", def: "Vous déduisez vos charges réelles et vos intérêts d'emprunt. Si le total dépasse les loyers, vous créez un déficit foncier imputable sur votre revenu global (jusqu'à 10 700 €/an)." },
  { cat: "Fiscalité", term: "Déficit foncier", def: "Quand vos charges déductibles dépassent vos loyers (location nue au réel). Ce déficit réduit votre revenu imposable global, donc votre impôt. Levier puissant lors de gros travaux." },
  { cat: "Fiscalité", term: "SCI (Société Civile Immobilière)", def: "Société pour détenir un bien à plusieurs (famille, associés) et faciliter la transmission. À l'IR par défaut, ou à l'IS sur option. Utile pour organiser un patrimoine, pas une baguette magique fiscale." },

  // ── FINANCEMENT & CRÉDIT ────────────────────────────────────
  { cat: "Financement", term: "Capacité d'emprunt", def: "Montant maximum qu'une banque peut vous prêter, selon vos revenus, vos charges et votre apport. Limité par le taux d'endettement." },
  { cat: "Financement", term: "Taux d'endettement (35 % HCSF)", def: "Part de vos revenus consacrée à vos crédits. Plafonné à 35 % (assurance comprise) par les règles du HCSF. Au-delà, la banque refuse en général." },
  { cat: "Financement", term: "TAEG", def: "Taux Annuel Effectif Global : le seul vrai coût du crédit, car il inclut TOUT (intérêts + assurance + frais de dossier + garantie). C'est LUI qu'il faut comparer entre les banques, jamais le taux nominal seul." },
  { cat: "Financement", term: "Assurance emprunteur", def: "Assurance obligatoire couvrant décès/invalidité. Représente une part énorme du coût total (souvent 0,10 à 0,40 %/an). Grâce à la loi Lemoine, vous pouvez en changer à tout moment gratuitement — c'est le 1er levier d'économie." },
  { cat: "Financement", term: "Apport personnel", def: "Somme que vous mettez de votre poche. Les banques attendent souvent ≥ 10 % (pour couvrir les frais de notaire). Un apport plus élevé = meilleur taux, mais réduit l'effet de levier." },
  { cat: "Financement", term: "Effet de levier", def: "Utiliser le crédit de la banque pour investir plus que votre apport, et faire payer le remboursement par les loyers. Le moteur de l'enrichissement immobilier." },
  { cat: "Financement", term: "Tableau d'amortissement", def: "Échéancier du prêt : combien de capital et d'intérêts vous remboursez chaque mois. En début de prêt, vous payez surtout des intérêts ; le capital augmente avec le temps." },

  // ── CADRE LÉGAL & LOIS ──────────────────────────────────────
  { cat: "Cadre légal", term: "Loi Climat & Résilience (2021)", def: "Interdit progressivement la location des passoires énergétiques : G interdit depuis 2025, F en 2028, E en 2034. Un DPE F/G impose des travaux… ou décote le prix." },
  { cat: "Cadre légal", term: "Loi Le Meur (2024) — meublés touristiques", def: "Durcit l'encadrement des locations type Airbnb : 120 nuits/an maximum pour une résidence principale, numéro d'enregistrement, et pouvoir accru des mairies pour limiter les meublés touristiques." },
  { cat: "Cadre légal", term: "Encadrement des loyers", def: "Dans les zones tendues (Paris, Lille, Lyon, Plaine Commune, Est Ensemble…), le loyer ne peut pas dépasser un plafond de référence. À vérifier commune par commune avant d'acheter pour louer." },
  { cat: "Cadre légal", term: "Loi Lemoine (2022)", def: "Permet de résilier et changer son assurance emprunteur à tout moment, gratuitement. Peut faire économiser plusieurs milliers d'euros sur la durée du crédit." },
  { cat: "Cadre légal", term: "HCSF (Haut Conseil de Stabilité Financière)", def: "L'autorité qui fixe les règles de prêt : taux d'endettement max 35 %, durée max 25 ans (27 avec travaux). Encadre ce que les banques peuvent accorder." },
  { cat: "Cadre légal", term: "Changement d'usage / compensation", def: "Dans les grandes villes, transformer un logement en meublé touristique (résidence secondaire) exige souvent une autorisation de changement d'usage, parfois avec compensation (transformer un local en logement en échange)." },
  { cat: "Cadre légal", term: "Bail (nu / meublé)", def: "Contrat de location. Bail nu = 3 ans, préavis propriétaire 6 mois. Bail meublé = 1 an (9 mois étudiant), préavis 3 mois. Le meublé offre plus de souplesse." },
  { cat: "Cadre légal", term: "Diagnostics obligatoires", def: "À fournir à la vente/location : DPE, amiante, plomb, électricité, gaz, ERP (risques), termites selon zone. Réunis dans le Dossier de Diagnostic Technique (DDT)." },
  { cat: "Cadre légal", term: "Loi Pinel / dispositifs de défiscalisation", def: "Réductions d'impôt en échange d'un engagement de location (neuf, plafonds de loyers et de ressources). Le Pinel classique s'est éteint fin 2024 ; d'autres dispositifs existent. À manier avec prudence : l'avantage fiscal ne doit jamais faire oublier la rentabilité réelle." },
  { cat: "Cadre légal", term: "MaPrimeRénov'", def: "Aide de l'État pour financer la rénovation énergétique (isolation, chauffage). Le montant dépend de vos revenus et du gain de DPE. Peut débloquer une belle valeur verte sur un bien F/G." },
];

const CATS = ["Tous", "Termes clés", "Taxes & impôts", "Fiscalité", "Financement", "Cadre légal"];

export default function Dictionnaire() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Tous");

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return ENTRIES.filter((e) =>
      (cat === "Tous" || e.cat === cat) &&
      (!query || e.term.toLowerCase().includes(query) || e.def.toLowerCase().includes(query))
    );
  }, [q, cat]);

  return (
    <div className="dico">
      <div className="dico-search">
        <span className="material-symbols-outlined">search</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un terme, une taxe, une loi…" />
      </div>
      <div className="dico-cats">
        {CATS.map((c) => (
          <button key={c} className={"dico-cat" + (cat === c ? " active" : "")} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      {list.length === 0 && <p className="dico-empty">Aucun résultat pour « {q} ».</p>}

      <div className="dico-list">
        {list.map((e, i) => (
          <div className="dico-card" key={i}>
            <div className="dico-term">
              <span className="dico-badge">{e.cat}</span>
              <h3>{e.term}</h3>
            </div>
            <p>{e.def}</p>
          </div>
        ))}
      </div>

      <p className="dico-note">Contenu pédagogique et indicatif. Les règles fiscales et légales évoluent — vérifiez au cas par cas ou consultez un professionnel (notaire, comptable, courtier).</p>
    </div>
  );
}
