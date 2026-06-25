# EstimImmo

Plateforme d'estimation immobiliere et d'analyse de rentabilite, basee sur les
**transactions reelles** enregistrees en France (DVF).

## Ce que fait l'application

**Onglet 1 — Estimation**
- Geocode l'adresse (IGN Geoplateforme) pour trouver l'arrondissement / la commune
- Recupere les **ventes officielles** des 3 dernieres annees autour du bien
  (source DVF : Demandes de Valeurs Foncieres, DGFiP / Etalab)
- Selectionne les comparables les plus proches (distance, recence, surface similaire)
- Calcule un prix/m2 de marche robuste (mediane) puis l'ajuste au bien :
  etage / ascenseur, etat, **DPE**, periode de construction, balcon, parking
- Affiche la valeur estimee, une fourchette, le niveau de fiabilite et la liste
  des transactions reelles utilisees

**Onglet 2 — Rentabilite**
- Cout total : prix + frais de notaire (ancien / neuf) + travaux
- Credit : mensualite, assurance emprunteur, cout total des interets
- Rentabilite brute, nette, et rendement sur apport (cash-on-cash)
- Cashflow mensuel apres credit + verdict "rentable / equilibre / non rentable"
- Le prix estime dans l'onglet 1 est repris automatiquement

## Lancer en local

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000

## Publier sur Vercel

1. Pousser le dossier sur un depot GitHub :
   ```bash
   git init
   git add .
   git commit -m "EstimImmo"
   git branch -M main
   git remote add origin https://github.com/<vous>/estimimmo.git
   git push -u origin main
   ```
2. Aller sur https://vercel.com/new, importer le depot, cliquer **Deploy**.
   Aucune variable d'environnement requise.

## Sources de donnees

- **DVF** — Demandes de Valeurs Foncieres geolocalisees (DGFiP / Etalab),
  fichiers `files.data.gouv.fr/geo-dvf`. Couvre toute la France **sauf**
  Alsace, Moselle et Mayotte (regime du livre foncier).
- **Geocodage** — API IGN Geoplateforme (`data.geopf.fr/geocodage`).

## Limites

- Les estimations sont **indicatives** et ne constituent pas une expertise.
- DVF ne contient ni l'etage, ni le DPE, ni l'annee de construction : ces
  elements sont saisis par l'utilisateur et appliques en ajustement.
- Les ventes recentes (< 3-4 mois) peuvent ne pas encore etre publiees.
