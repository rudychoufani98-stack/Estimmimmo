"use client";
import { useState, useEffect } from "react";

// ⚠️ À COMPLÉTER par l'éditeur du site (obligatoire pour les mentions légales).
export const LEGAL_INFO = {
  editeur: "【À COMPLÉTER : nom / raison sociale】",
  statut: "【À COMPLÉTER : ex. Auto-entrepreneur / SAS…】",
  adresse: "【À COMPLÉTER : adresse postale】",
  siret: "【À COMPLÉTER : SIRET】",
  email: "rudychoufani98@gmail.com",
  directeur: "Rudy Choufani",
  hebergeur: "Cloudflare, Inc. — 101 Townsend St, San Francisco, CA 94107, USA",
  bdd: "Supabase (base de données & authentification)",
  maj: "juillet 2026",
};

const DOCS = {
  mentions: {
    title: "Mentions légales",
    body: (i) => [
      ["Éditeur du site", `Le site EstimImmo est édité par ${i.editeur} (${i.statut}). SIRET : ${i.siret}. Adresse : ${i.adresse}. Contact : ${i.email}. Directeur de la publication : ${i.directeur}.`],
      ["Hébergement", `Application hébergée par ${i.hebergeur}. Base de données et authentification : ${i.bdd}.`],
      ["Propriété intellectuelle", "La structure, le design et le code du site sont la propriété de l'éditeur. Les données publiques utilisées (DVF, IGN, ADEME, INSEE, Banque de France) restent la propriété de leurs producteurs respectifs et sont réutilisées sous licence ouverte."],
      ["Nature du service", "EstimImmo fournit des estimations et analyses indicatives à partir de données publiques. Elles ne constituent ni une expertise immobilière, ni un conseil en investissement, ni un conseil financier ou fiscal personnalisé."],
    ],
  },
  privacy: {
    title: "Politique de confidentialité",
    body: (i) => [
      ["Responsable du traitement", `${i.editeur}, joignable à ${i.email}, est responsable du traitement des données personnelles collectées sur EstimImmo.`],
      ["Données que nous collectons", "• Compte : votre adresse email et un mot de passe (chiffré, jamais stocké en clair).\n• Projets sauvegardés : les caractéristiques de biens que vous enregistrez (adresse, surface, montants…).\n• Formulaire de contact : nom, email, sujet et message.\n• Adresses saisies pour l'estimation : transmises au géocodeur IGN pour être localisées.\nNous ne collectons aucune donnée à votre insu et n'utilisons aucun traceur publicitaire."],
      ["Finalités & base légale", "• Fournir le service (estimation, rentabilité, projets) — exécution du contrat.\n• Gérer votre compte et la facturation Premium — exécution du contrat.\n• Répondre à vos messages — intérêt légitime / votre consentement.\nAucune donnée n'est vendue ni utilisée à des fins publicitaires."],
      ["Durée de conservation", "Compte et projets : conservés tant que votre compte existe, puis supprimés au plus tard 12 mois après sa fermeture. Messages de contact : 24 mois maximum."],
      ["Sous-traitants & transferts", `Nous nous appuyons sur : ${i.bdd}, Cloudflare (hébergement), Stripe (paiement Premium), IGN Géoplateforme (géocodage). Certains de ces prestataires peuvent traiter des données hors UE ; ils présentent des garanties conformes au RGPD (clauses contractuelles types). 【À VÉRIFIER : région d'hébergement Supabase】.`],
      ["Vos droits (RGPD)", `Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. Depuis votre compte : « Exporter mes données » et « Supprimer mon compte ». Vous pouvez aussi écrire à ${i.email}. Vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).`],
      ["Cookies", "EstimImmo n'utilise que des cookies/stockage strictement nécessaires au fonctionnement (session de connexion). Aucun cookie de mesure d'audience ou publicitaire n'est déposé sans votre consentement."],
    ],
  },
  cgu: {
    title: "Conditions générales d'utilisation",
    body: (i) => [
      ["Objet", "Les présentes CGU régissent l'utilisation d'EstimImmo. En utilisant le service, vous les acceptez."],
      ["Accès au service", "L'estimation et la carte des marchés sont gratuites. Les outils Travaux, Rentabilité, Capacité d'emprunt et Mes projets nécessitent un abonnement Premium. Le compte est personnel."],
      ["Abonnement Premium", "L'abonnement est facturé via Stripe au tarif indiqué. Il est résiliable à tout moment ; l'accès reste actif jusqu'à la fin de la période payée. Droit de rétractation applicable selon la réglementation."],
      ["Responsabilité", "Les résultats sont fournis à titre indicatif, sans garantie d'exactitude, et ne sauraient engager la responsabilité de l'éditeur pour vos décisions d'achat, de vente, de location ou d'investissement. Consultez un professionnel avant tout engagement."],
      ["Contact", `Pour toute question : ${i.email}.`],
    ],
  },
};

export function LegalModal({ page, onClose, onNav }) {
  if (!page) return null;
  const doc = DOCS[page];
  if (!doc) return null;
  return (
    <div className="legal-overlay" onClick={onClose}>
      <div className="legal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="legal-head">
          <h2>{doc.title}</h2>
          <button className="legal-close" onClick={onClose} aria-label="Fermer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="legal-tabs">
          {Object.entries(DOCS).map(([k, d]) => (
            <button key={k} className={"legal-tab" + (k === page ? " active" : "")} onClick={() => onNav(k)}>{d.title}</button>
          ))}
        </div>
        <div className="legal-body">
          {doc.body(LEGAL_INFO).map(([h, txt], idx) => (
            <section key={idx}>
              <h3>{h}</h3>
              {txt.split("\n").map((line, j) => <p key={j}>{line}</p>)}
            </section>
          ))}
          <p className="legal-maj">Dernière mise à jour : {LEGAL_INFO.maj}. Document indicatif — à faire valider par un professionnel du droit.</p>
        </div>
      </div>
    </div>
  );
}

export function CookieConsent({ onOpenPrivacy }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem("estimimmo-cookie-consent")) setShow(true); } catch {}
  }, []);
  function accept() {
    try { localStorage.setItem("estimimmo-cookie-consent", "essential"); } catch {}
    setShow(false);
  }
  if (!show) return null;
  return (
    <div className="cookie-banner">
      <span className="material-symbols-outlined cookie-ico">cookie</span>
      <p>
        EstimImmo n'utilise que des <b>cookies strictement nécessaires</b> à votre connexion — aucun traceur
        publicitaire. <span className="cookie-link" onClick={onOpenPrivacy}>En savoir plus</span>.
      </p>
      <button className="cookie-ok" onClick={accept}>J'ai compris</button>
    </div>
  );
}
