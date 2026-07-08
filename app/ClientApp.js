"use client";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

// Comptes proprietaire -> acces premium complet automatique
const ADMIN_EMAILS = ["rudychoufani98@gmail.com"];

const euro = (n) => Math.round(n).toLocaleString("fr-FR") + " EUR";
const euro0 = (n) => Math.round(n).toLocaleString("fr-FR");
const pct = (n) => n.toFixed(2).replace(".", ",") + " %";

const AM_ICON = {
  rail: "🚇", bus: "🚌", supermarche: "🛒", boulangerie: "🥖",
  pharmacie: "💊", ecole: "🏫", restaurant: "🍽️", parc: "🌳",
};

const MONTH_NAMES = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const DAYS_IN_MONTH = [31,28,31,30,31,30,31,31,30,31,30,31];

// Airbnb city-level seasonal data & local regulations
// taux = occupancy rate per night, mult = price multiplier vs user base rate
// Sources : AirDNA, Inside Airbnb, Observatoires locaux du tourisme (OT villes), juin 2026
const AIRBNB_ZONES = {
  // ── PARIS & IDF ──────────────────────────────────────────────────────────
  paris: {
    label: "Paris",
    saisons: [
      {taux:0.62,mult:0.88,events:"Basse saison post-fêtes. Salons pros (Maison & Objet mi-janv.). Tourisme chute après Noël."},
      {taux:0.65,mult:0.90,events:"Fashion Week Homme. Salon de l'Agriculture (fin fév). Saint-Valentin. Carnaval de Paris."},
      {taux:0.73,mult:1.02,events:"Retour printemps. Début tourisme européen. Salon du Livre. Foire du Trône (fin mars)."},
      {taux:0.82,mult:1.18,events:"Printemps parisien. Pâques (week-end fort). Marathon de Paris. Foire de Paris (fin avr)."},
      {taux:0.83,mult:1.22,events:"Roland-Garros (fin mai-juin). Fête du Travail. Nuit des Musées. Tourisme européen en hausse."},
      {taux:0.80,mult:1.10,events:"Roland-Garros finale. Fête de la Musique (21 juin). Début vacances scolaires. Gay Pride."},
      {taux:0.86,mult:1.28,events:"Pic touristique d'été. Bastille Day (14 juil). Paris Plages. Tourisme international massif."},
      {taux:0.89,mult:1.32,events:"Pic absolu. Parisiens partis → logements libres. Festival Solidays, Rock en Seine fin août."},
      {taux:0.82,mult:1.18,events:"Rentrée affaires. Paris Fashion Week (prêt-à-porter). Nuit Blanche. FIAC art contemporain."},
      {taux:0.83,mult:1.22,events:"FIAC. Mondial de l'Auto (années paires). Salon du Cheval approche. Saison culturelle pleine."},
      {taux:0.71,mult:0.96,events:"Basse saison touristique. Beaujolais Nouveau (3e jeudi). Chute vacanciers. Affaires ok."},
      {taux:0.79,mult:1.12,events:"Marchés de Noël. Illuminations Champs-Élysées. Fêtes fin d'année. Réveillon Saint-Sylvestre."},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:5.20,
      info:"Paris : résidence principale limitée à 120 nuits/an (loi ELAN). Numéro d'enregistrement en mairie obligatoire. Taxe de séjour ~5,20 EUR/nuit/pers." },
  },
  versailles: {
    label: "Versailles & Yvelines",
    saisons: [
      {taux:0.55,mult:0.85,events:"Château partiellement fermé. Basse saison touristique. Quelques groupes scolaires."},
      {taux:0.58,mult:0.88,events:"Début des Grandes Eaux Musicales (certaines dates). Tourisme familial encore faible."},
      {taux:0.65,mult:0.98,events:"Grandes Eaux Musicales (sam-dim à partir de mars). Printemps dans les jardins. Tourisme reprend."},
      {taux:0.75,mult:1.12,events:"Grandes Eaux Musicales en plein régime. Pâques fort. Jardins de Versailles plébiscités."},
      {taux:0.80,mult:1.18,events:"Grandes Eaux Musicales + Nocturnes. Week-ends parisiens intenses. Festival de l'Histoire de l'Art (Fontainebleau proche)."},
      {taux:0.78,mult:1.10,events:"Grandes Eaux Nocturnes (juin-sept). Feux d'artifice. Début vacances scolaires."},
      {taux:0.85,mult:1.30,events:"Pic été. Grandes Eaux Nocturnes + feux d'artifice royaux. Tourisme international massif. Vols de nuit interdit : calme nocturne premium."},
      {taux:0.87,mult:1.35,events:"Pic absolu. Grandes Eaux tous les jours. Feux royaux. Événements nocturnes jusqu'au 31 août."},
      {taux:0.78,mult:1.15,events:"Journées du Patrimoine (3e week-end sept, entrée gratuite → forte affluence). Grandes Eaux encore actives."},
      {taux:0.72,mult:1.05,events:"Fin des Grandes Eaux Musicales (oct). Couleurs d'automne. Baisse progressive tourisme."},
      {taux:0.58,mult:0.88,events:"Basse saison. Château intérieur possible mais jardin moins attractif. Tourisme chute."},
      {taux:0.65,mult:0.98,events:"Marché de Noël de Versailles. Illuminations. Week-ends de fêtes attirent familles parisiennes."},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.50,
      info:"Yvelines : limite 120 nuits/an résidence principale. Enregistrement obligatoire. Taxe de séjour ~2,50 EUR/nuit/pers." },
  },
  // ── CÔTE D'AZUR ──────────────────────────────────────────────────────────
  cannes: {
    label: "Cannes",
    saisons: [
      {taux:0.45,mult:0.80,events:"Morte-saison. Cannes quasi déserte. Quelques touristes d'hiver (seniors européens). Marché NATEXPO."},
      {taux:0.50,mult:0.85,events:"Cannes Yachting (non, c'est sept). Tournages à la Villa Domergue. Basse saison mais début réservations Festival."},
      {taux:0.58,mult:0.92,events:"MIPIM — Marché International de l'Immobilier (~30 000 professionnels, 2e sem. mars). Prix s'envolent pour les appart pros."},
      {taux:0.68,mult:1.05,events:"MIP TV (marché international programmes TV, avril). Retour soleil. Début saison balnéaire douce."},
      {taux:0.97,mult:2.20,events:"🎬 FESTIVAL DE CANNES (mi-mai, 12 jours). Demande x3 à x5. Réservations 6-12 mois à l'avance. Prix hôtellerie multipliés par 5 à 10. Semaine précédente déjà forte."},
      {taux:0.90,mult:1.45,events:"Cannes Lions — Festival de la Créativité Publicitaire (fin juin, ~15 000 pros). Forte demande affaires. Début été balnéaire."},
      {taux:0.98,mult:1.95,events:"Haute saison balnéaire absolue. Plages bondées. Feux d'artifice. Soirées Croisette. Yacht show."},
      {taux:0.99,mult:2.05,events:"Pic absolu. Régates. Feux d'artifice baie de Cannes (15 août). Prix au maximum de l'année hors Festival."},
      {taux:0.84,mult:1.38,events:"Cannes Yachting Festival (1ère sem. sept, 600 bateaux). MIPCOM approche. Fin été agréable, moins cher qu'août."},
      {taux:0.65,mult:0.95,events:"MIPCOM — Marché international des programmes TV (mi-oct, ~14 000 pros). Demande affaires forte. Basse saison balnéaire."},
      {taux:0.48,mult:0.78,events:"Basse saison. Tournages. Quelques congrès. Festival des Lumières. Prix bas : bon rapport qualité-prix."},
      {taux:0.52,mult:0.85,events:"Marché de Noël sur la Croisette. Fêtes fin d'année. Quelques séjours familiaux. Plus calme que l'été."},
    ],
    loi:{ limite:null, enregistrement:true, taxeSejour:3.30,
      info:"Cannes : résidence secondaire sans limite de nuits. Enregistrement obligatoire. Taxe de séjour ~3,30 EUR/nuit/pers. Festival de Cannes (mai) : tarifs multipliés par 3 à 5." },
  },
  nice: {
    label: "Nice",
    saisons: [
      {taux:0.58,mult:0.82,events:"Basse saison relative. Tourisme hivernal (seniors) + tourisme d'affaires Sophia-Antipolis. Météo douce mais courte."},
      {taux:0.72,mult:1.12,events:"🎉 Carnaval de Nice (2 semaines en février, ~1 million de visiteurs). Batailles de fleurs. Demande x1,5 à x2. Réservations à l'avance indispensables."},
      {taux:0.67,mult:0.97,events:"Fin Carnaval, retour calme. Début printemps. Marché du Cours Saleya actif. Touristes européens reviennent."},
      {taux:0.72,mult:1.07,events:"Fête des Mai (traditions niçoises). Printemps méditerranéen. Pâques fort. Promenade des Anglais animée."},
      {taux:0.80,mult:1.18,events:"Nice Jazz Festival (mi-juillet → certaines années mai/juin). Montée tourisme. Météo parfaite. Début saison balnéaire."},
      {taux:0.87,mult:1.38,events:"Nice Jazz Festival (si édition juillet/juin). Début haute saison. Promenade bondée. Plage très fréquentée."},
      {taux:0.96,mult:1.75,events:"Pic touristique absolu. Feu d'artifice 14 juillet sur la Promenade (l'un des plus grands de France). Tourisme international massif."},
      {taux:0.98,mult:1.88,events:"Pic absolu. Festival Mer et Montagne. Plages & vieille ville saturées. Prix au maximum. Réservations indispensables 3 mois avant."},
      {taux:0.84,mult:1.28,events:"Fin saison touristique balnéaire. Agréable sans foule. Nuit Blanche Nice. Congrès reprennent à Acropolis."},
      {taux:0.67,mult:0.97,events:"Fête de la Gastronomie (fin oct). Congrès Acropolis. Basse saison touristique mais affaires stables."},
      {taux:0.53,mult:0.80,events:"Basse saison. Températures encore douces (15°C). Tourisme hivernal commence. Nice Airport hub."},
      {taux:0.62,mult:0.92,events:"Marché de Noël place Masséna. Fêtes. Tourisme hivernal nordique (Scandinaves, Anglais). Décembre doux."},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:3.20,
      info:"Nice : limite 120 nuits/an résidence principale. Numéro d'enregistrement obligatoire. Taxe de séjour ~3,20 EUR/nuit/pers. Carnaval de Nice (février) : forte demande." },
  },
  antibes: {
    label: "Antibes / Juan-les-Pins",
    saisons: [
      {taux:0.38,mult:0.68,events:"Morte-saison. Port Vauban (plus grand port de plaisance d'Europe) quasi vide. Quelques résidents hivernants."},
      {taux:0.40,mult:0.72,events:"Basse saison. Randonnées Cap d'Antibes. Calme. Quelques plaisanciers. Pas d'événements majeurs."},
      {taux:0.48,mult:0.80,events:"Début activité. Salon nautique Nice (Cannes Yachting non, c'est sept). Retour touristes printaniers. Fleurs Côte d'Azur."},
      {taux:0.62,mult:0.95,events:"Printemps Côte d'Azur. Golfe-Juan Napoléon (débarquement historique reconstitution). Montée activité. Jazz Antibes approche."},
      {taux:0.74,mult:1.12,events:"Mois actif (Festival de Cannes à 10 min → débordement). Début saison plages. Juan-les-Pins dynamique."},
      {taux:0.86,mult:1.30,events:"Jazz à Juan — Jazz Festival de Juan-les-Pins (2e sem. juillet → certaines années fin juin). Demande forte. Plages animées."},
      {taux:0.95,mult:1.68,events:"🎷 Jazz à Juan (si juillet). Pic haute saison. Port Vauban plein de mega-yachts. Plages bondées. Nuits animées Juan-les-Pins."},
      {taux:0.97,mult:1.78,events:"Pic absolu août. Feux d'artifice. Régates. Cap d'Antibes très recherché. Juan-les-Pins soirées jazz. Prix maximum."},
      {taux:0.81,mult:1.24,events:"Fin d'été agréable. Cannes Yachting Festival (1ère sem. sept, 10 min). Moins de foule. Prix déjà plus doux."},
      {taux:0.56,mult:0.87,events:"MIPCOM Cannes (15 min). Quelques professionnels. Mer encore baignable (23°C). Basse saison touristique."},
      {taux:0.38,mult:0.68,events:"Morte-saison. Fermeture établissements saisonniers. Bon rapport qualité-prix pour longs séjours."},
      {taux:0.43,mult:0.75,events:"Fêtes fin d'année. Quelques familles. Marché de Noël Antibes. Calme mais météo douce (12-15°C)."},
    ],
    loi:{ limite:null, enregistrement:true, taxeSejour:3.00,
      info:"Antibes : résidence secondaire sans plafond. Enregistrement obligatoire. Taxe de séjour ~3 EUR/nuit/pers." },
  },
  saint_tropez: {
    label: "Saint-Tropez & Golfe de Saint-Tropez",
    saisons: [
      {taux:0.22,mult:0.55,events:"Ville quasi déserte. Commerces fermés. Seuls les résidents permanents. Prix très bas (rares locations ouvertes)."},
      {taux:0.22,mult:0.55,events:"Toujours morte-saison. Quelques touristes de passage. Village vieux port pittoresque. Pas d'animation."},
      {taux:0.30,mult:0.68,events:"Début activité. Voiles de Saint-Tropez préparations. Ouverture progressive des établissements. Météo incertaine."},
      {taux:0.55,mult:1.00,events:"Printemps tropézien. Ouverture plages et restaurants. Affluence encore raisonnable. Voiliers commencent à arriver."},
      {taux:0.72,mult:1.32,events:"Montée en puissance. Les célébrités commencent à arriver. Week-ends déjà très chers. Bateaux de luxe à quai."},
      {taux:0.90,mult:1.85,events:"Début haute saison. Plage de Pampelonne ouvre à pleine capacité. Clubs de plage (Club 55, Nikki Beach). Jet-set."},
      {taux:0.98,mult:2.60,events:"🌟 Pic absolu. Pampelonne saturée. Yacht de 50m à quai. Celebrities partout. Prix x3 vs juin. Bouchons monstres (route unique)."},
      {taux:0.99,mult:2.80,events:"Pic des pics. 15 août feux d'artifice. Voiles de Saint-Tropez (fin sept). Prix maximum de l'année. Micro-location très rentable."},
      {taux:0.82,mult:1.55,events:"🏆 Les Voiles de Saint-Tropez (fin sept-début oct, 4 000 marins, régates mythiques). Encore forte demande. Mer 23°C."},
      {taux:0.52,mult:0.90,events:"Après les Voiles. Fermeture progressive. Retour calme. Prix chutent de 50%. Quelques week-ends parisiens."},
      {taux:0.25,mult:0.58,events:"Morte-saison. 80% des commerces fermés. Seul le village animé le week-end par résidents locaux."},
      {taux:0.30,mult:0.68,events:"Noël et Jour de l'An avec quelques familles fortunées. Ouvertures ponctuelles. Calme global."},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:3.50,
      info:"Saint-Tropez : résidence secondaire sans plafond. Enregistrement non obligatoire (commune < 200k hab). Taxe de séjour ~3,50 EUR/nuit/pers. Marché très saisonnier (90% du CA en juil-sept)." },
  },
  menton: {
    label: "Menton",
    saisons: [
      {taux:0.42,mult:0.72,events:"Tourisme hivernal doux. Citronneraies en fleurs. Préparations Fête du Citron. Calme et abordable."},
      {taux:0.58,mult:0.92,events:"🍋 Fête du Citron (2-3 semaines, 200 000 visiteurs). Chars en agrumes géants. Demande x1,5 à x2. Réservations à l'avance."},
      {taux:0.60,mult:0.95,events:"Fin Fête du Citron. Printemps précoce (Menton = ville la plus chaude de France). Jardins Hanbury ouverts. Retour touristes."},
      {taux:0.65,mult:1.00,events:"Printemps méditerranéen. Concerts jardins. Touristes italiens (frontière 1 km). Montée douce de l'activité."},
      {taux:0.72,mult:1.10,events:"Festival de Musique Chambre de Menton approche. Fleurs. Marchés provençaux. Agréable sans foule."},
      {taux:0.82,mult:1.28,events:"Festival Musique de Chambre de Menton (juillet → certaines années juin). Soirées classiques dans les jardins."},
      {taux:0.92,mult:1.60,events:"🎻 Festival de Musique de Chambre (2 semaines juillet, 50 concerts, parvis basilique). Haute saison balnéaire. Prix élevés."},
      {taux:0.95,mult:1.72,events:"Pic absolu. Plages calmes vs Nice. Excursions Vintimille/Monaco. Feux d'artifice 15 août. Tourisme franco-italien."},
      {taux:0.78,mult:1.18,events:"Fin haute saison. Mer encore chaude (26°C). Moins de monde. Très agréable. Festival Jazz (parfois sept)."},
      {taux:0.58,mult:0.88,events:"Arrière-saison douce. Randonnées arrière-pays (vallées pittoresques). Prix bas. Tourisme retraités."},
      {taux:0.42,mult:0.72,events:"Basse saison. Préparations Fête du Citron (décorations commencent). Calme. Bonnes affaires."},
      {taux:0.48,mult:0.80,events:"Marchés de Noël côte. Fêtes. Tourisme hivernal nordique (Anglais, Allemands). Météo douce (12°C)."},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:2.80,
      info:"Menton : résidence secondaire sans plafond. Taxe de séjour ~2,80 EUR/nuit/pers. Fête du Citron (février) : forte demande." },
  },
  // ── ALPES & MONTAGNE ─────────────────────────────────────────────────────
  chamonix: {
    label: "Chamonix",
    saisons: [
      {taux:0.90,mult:1.72,events:"Haute saison ski. Pistes ouvertes (Grands Montets, Brévent). Ski de rando. Demande internationale (Anglais, Suisses, Scandinaves)."},
      {taux:0.96,mult:1.92,events:"Pic absolu ski. Vacances scolaires françaises et européennes. Enneigement optimal. Prix maximum hiver."},
      {taux:0.88,mult:1.62,events:"Fin saison ski. Vacances d'hiver. Enneigement encore correct. Descentes du Vallée Blanche mythiques."},
      {taux:0.48,mult:0.78,events:"Inter-saison printemps. Pistes qui ferment progressivement. Randonnées enneigées. Période creuse."},
      {taux:0.32,mult:0.60,events:"Morte-saison absolue. Beaucoup d'hôtels/restaurants fermés. Seuls les locaux et randonneurs de printemps."},
      {taux:0.58,mult:0.92,events:"Ouverture saison été. Trail Running reprend. Randonnées. Accès téléphériques. Montée progressive."},
      {taux:0.90,mult:1.55,events:"🏃 Ultra-Trail du Mont-Blanc (UTMB, fin août → parfois fin juillet qualificatifs). Pic été. Mer de Glace. Aiguille du Midi. Randos. Familles."},
      {taux:0.95,mult:1.70,events:"🏆 UTMB — Ultra Trail Mont-Blanc (fin août, ~10 000 coureurs, 170 pays). Ville saturée semaine de l'UTMB. Beau temps."},
      {taux:0.58,mult:0.88,events:"Fin été. Couleurs automnales. Randonnées encore possibles. Inter-saison. Prix bas. Calme."},
      {taux:0.32,mult:0.60,events:"Inter-saison automne. Préparations ouverture ski. Peu de monde. Offre limitée ouverte."},
      {taux:0.42,mult:0.72,events:"Début saison ski (si enneigement précoce). Ouverture premières pistes. Pas encore de neige garantie."},
      {taux:0.86,mult:1.58,events:"Début saison ski. Vacances scolaires fin décembre. Noël à Chamonix très recherché. Prix en hausse."},
    ],
    loi:{ limite:null, enregistrement:true, taxeSejour:2.80,
      info:"Chamonix : résidence secondaire, pas de plafond. Enregistrement obligatoire. Taxe de séjour ~2,80 EUR/nuit/pers. Marché équilibré été/hiver, demande internationale forte." },
  },
  courchevel: {
    label: "Courchevel / Val d'Isère / Méribel",
    saisons: [
      {taux:0.92,mult:2.20,events:"Haute saison ski. Noël-Jour de l'An déjà passés. Pistes ouvertes. Clientèle internationale très aisée. Prix premium."},
      {taux:0.97,mult:2.50,events:"⛷️ Pic absolu ski. Vacances scolaires françaises + Europe. Courchevel 1850 = station la plus chère du monde. Files remontées."},
      {taux:0.90,mult:2.00,events:"Fin haute saison ski. Vacances de mars (zones A/B/C). Neige encore excellente. Fermeture mi-avril."},
      {taux:0.28,mult:0.55,events:"Fermeture stations. Inter-saison. Tous les commerces ferment. Uniquement locaux. Morte-saison totale."},
      {taux:0.15,mult:0.40,events:"Morte-saison absolue. Stations fantômes. Pas de location possible (infrastructures fermées). À éviter."},
      {taux:0.20,mult:0.45,events:"Début saison été timide. Randonnées pédestres. VTT descente. Peu d'infrastructures ouvertes."},
      {taux:0.62,mult:1.10,events:"Saison été modérée. Randonnées, vélo, golf Courchevel. Demande familiale. Prix bien inférieurs à l'hiver."},
      {taux:0.72,mult:1.25,events:"Pic saison été. Randonnées alpines. Piscines lacustres. Activités outdoor. Concerts parfois organisés."},
      {taux:0.22,mult:0.48,events:"Inter-saison automne. Fermeture progressive. Couleurs alpines magnifiques mais peu de monde."},
      {taux:0.15,mult:0.40,events:"Morte-saison. Préparations pistes ski (damage, canons à neige). Aucun touriste presque."},
      {taux:0.22,mult:0.48,events:"Premières neiges. Anticipation ouverture. Quelques randonneurs. Début réservations ski de décembre."},
      {taux:0.85,mult:1.85,events:"🎄 Ouverture stations ski (Courchevel ouvre vers 5-8 déc). Noël ultra-premium (réveillons gastronomiques). Demande x2 semaine 25-31 déc."},
    ],
    loi:{ limite:null, enregistrement:true, taxeSejour:3.00,
      info:"Stations Tarentaise (Courchevel, Val d'Isère, Méribel) : résidence secondaire, pas de plafond. Marché ski ultra-premium. Morte-saison très marquée (avril-juin, sept-oct)." },
  },
  annecy: {
    label: "Annecy",
    saisons: [
      {taux:0.46,mult:0.73,events:"Hiver doux bord du lac. Randonnées hivernales. Vieille ville animée. Tourisme hivernal calme."},
      {taux:0.55,mult:0.88,events:"Carnaval d'Annecy. Ski Semnoz (station proche). Chocolatiers primés. Basse saison lac mais agréable."},
      {taux:0.52,mult:0.82,events:"Pré-saison. Retour tourisme. Lac encore froid. Randonnées montagne déneigées partiellement."},
      {taux:0.62,mult:0.94,events:"Printemps annecy. Lac devient bleu vif. Pâques fort. Touristes européens (Genevois surtout). Vélo lac reprend."},
      {taux:0.70,mult:1.07,events:"Festival de la Vieille Ville. Animations. Baignade début possible. Frontaliers suisses week-ends (Genève à 45 min)."},
      {taux:0.82,mult:1.28,events:"Début haute saison. 🚴 Étape Tour de France parfois (Annecy étape historique). Pédalos, kayak, paddle sur le lac."},
      {taux:0.96,mult:1.68,events:"🏖️ Pic absolu. Lac d'Annecy = lac le plus pur d'Europe. Plages bondées. Paragliding Forclaz. Feu d'artifice lac (14 juil). Prix max."},
      {taux:0.98,mult:1.82,events:"Pic des pics. Fête du lac (1er sam août, feux d'artifice 45 min → 1 des plus beaux de France). Réservations indispensables 6 mois avant."},
      {taux:0.74,mult:1.13,events:"Arrière-saison agréable. Lac encore 22°C. Moins de monde. Randonnées couleurs automnales. Bon rapport qualité-prix."},
      {taux:0.52,mult:0.82,events:"Basse saison. Couleurs automne sur les Aravis. Randonnées. Fromageries. Calme et ressourcement."},
      {taux:0.40,mult:0.70,events:"Morte-saison. Lac gris. Quelques week-ends romantiques. Marché de Noël approche fin novembre."},
      {taux:0.50,mult:0.80,events:"Marché de Noël d'Annecy (très couru). Patinoire. Ambiance festive. Fêtes fin d'année. Beau mais calme."},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.50,
      info:"Annecy : limite 120 nuits/an résidence principale. Enregistrement obligatoire. Taxe de séjour ~2,50 EUR/nuit/pers. Forte demande lac en été, modérée en hiver." },
  },
  // ── OCCITANIE & PROVENCE ─────────────────────────────────────────────────
  toulouse: {
    label: "Toulouse",
    saisons: [
      {taux:0.58,mult:0.85,events:"Basse saison touristique. Activité étudiante forte (130 000 étudiants). Congrès médicaux (CHU Purpan). Aéronautique (Airbus)."},
      {taux:0.60,mult:0.88,events:"Carnaval de Toulouse. Salon Studyrama. Activité universitaire pleine. Affaires stables."},
      {taux:0.65,mult:0.95,events:"Printemps Occitan. Feria du Canal (parfois mars). Floraison jardins. Tourisme reprend doucement."},
      {taux:0.70,mult:1.02,events:"Pâques. Tourisme Airbus (usine Clément Ader, chaîne A320). Feria de Pâques (si Toulouse). Beau temps."},
      {taux:0.75,mult:1.08,events:"Marathon Toulouse (parfois oct). Festival Rio Loco (musiques du monde, mi-juin). Activité outdoor bords Garonne."},
      {taux:0.78,mult:1.12,events:"🎶 Rio Loco Festival (mi-juin, 100 000 visiteurs). Nuit Rose (fête de la musique rose). Début été agréable."},
      {taux:0.80,mult:1.18,events:"Haute saison touristique. Cité de l'Espace fréquentée. Garonne et bords animés. Moins chargé qu'août."},
      {taux:0.78,mult:1.12,events:"Été plein. Fête de la Violette (parfois août). Rugby Stade Toulousain en préparation. Étudiants absents = calme."},
      {taux:0.75,mult:1.08,events:"Rentrée universitaire massive. Festival Toulouse les Orgues (oct). Salons aéronautiques. Marché Victor-Hugo."},
      {taux:0.72,mult:1.04,events:"Festival Piano aux Jacobins (fin sept-oct). Toulouse Game Show. Salons pros. Tourisme d'affaires."},
      {taux:0.62,mult:0.90,events:"Basse saison. Vie universitaire intense. Cafés et brasseries plein centre actifs. Moins de touristes."},
      {taux:0.65,mult:0.95,events:"Marché de Noël allées Jules-Guesde. Fêtes. Lumières Capitole. Réveillon. Tourisme modeste mais stable."},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.20,
      info:"Toulouse : limite 120 nuits/an résidence principale. Enregistrement obligatoire. Taxe de séjour ~2,20 EUR/nuit/pers. Demande relativement stable (4e ville France, étudiants, aéro)." },
  },
  montpellier: {
    label: "Montpellier",
    saisons: [
      {taux:0.55,mult:0.83,events:"Basse saison. Vie étudiante forte (70 000 étudiants, une des plus jeunes villes de France). Congrès médicaux."},
      {taux:0.58,mult:0.87,events:"Foire Internationale Montpellier (oct → certaines années fév). Carnaval Place de la Comédie. Basse saison."},
      {taux:0.63,mult:0.94,events:"Printemps languedocien. Tourisme nature (Camargue proche, Cévennes). Vinification en cours (Pic Saint-Loup)."},
      {taux:0.70,mult:1.03,events:"Pâques. Montée tourisme. Plages Palavas et Grande-Motte accessibles (20 min). Beau temps précoce."},
      {taux:0.75,mult:1.10,events:"Festival de Radio France Montpellier (juillet → préparation). Tourisme culturel. Plages activées."},
      {taux:0.82,mult:1.22,events:"🏖️ Début pleine saison plages. Palavas-les-Flots bondé. Festival de Radio France Occitanie (2 sem. juillet)."},
      {taux:0.88,mult:1.38,events:"🎵 Festival de Radio France Montpellier (mi-juillet, opéras, concerts gratuits et payants). Haute saison balnéaire. Tram bondé."},
      {taux:0.90,mult:1.42,events:"Pic absolu. Plages Palabrais, Carnon, La Grande-Motte (20-30 min). Aquarium Mare Nostrum. Moins cher que Côte d'Azur."},
      {taux:0.78,mult:1.15,events:"Arrière-saison excellente. Mer 24°C. Festival Cinemed (oct). Moins de monde. Rapport qualité-prix bon."},
      {taux:0.68,mult:1.00,events:"Foire Internationale (oct). Festival Arabesques (musiques arabes). Saison culturelle. Rentrée étudiante."},
      {taux:0.57,mult:0.85,events:"Basse saison. Vie nocturne étudiante. Comédie + quartiers animés. Pas d'événements touristiques majeurs."},
      {taux:0.60,mult:0.90,events:"Marché de Noël. Fêtes. Lumières Antigone. Ambiance festive pour les fêtes. Météo douce (12°C)."},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.50,
      info:"Montpellier : limite 120 nuits/an résidence principale. Enregistrement obligatoire. Taxe de séjour ~2,50 EUR/nuit/pers." },
  },
  avignon: {
    label: "Avignon",
    saisons: [
      {taux:0.40,mult:0.72,events:"Basse saison hivernale. Palais des Papes visible sans foule. Mistral fréquent. Quelques week-ends culturels."},
      {taux:0.42,mult:0.73,events:"Carnaval d'Avignon (si organisé). Calme hivernal. Températures douces. Pas d'événements majeurs."},
      {taux:0.52,mult:0.84,events:"Printemps provençal. Marchés. Vignobles Châteauneuf-du-Pape verts. Tourisme nature Luberon commence."},
      {taux:0.62,mult:0.98,events:"Pâques fort. Tourisme culturel Provence. Gordes, Les Baux proches. Lavande pas encore mais paysages beaux."},
      {taux:0.68,mult:1.05,events:"Montée anticipation Festival. Premiers groupes. Floraison Luberon. Marchés provençaux animés."},
      {taux:0.74,mult:1.12,events:"Début réservations festival. Premières représentations Off. Lavande début floraison (Valensole). Tourisme monte."},
      {taux:0.99,mult:2.25,events:"🎭 FESTIVAL D'AVIGNON (3 semaines juillet, 150 000 spectateurs). Festival In (Cour d'honneur) + Off (1 400 spectacles). Demande x3 à x5. RÉSERVATIONS 6-12 MOIS À L'AVANCE. Prix multipliés."},
      {taux:0.86,mult:1.52,events:"Fin Festival. Tourisme culturel encore fort. Lavande plateau de Valensole (jusqu'à fin juillet). Haute saison Provence."},
      {taux:0.72,mult:1.10,events:"Arrière-saison. Vendanges Châteauneuf-du-Pape (sept). Marchés truffes. Luberon automnal magnifique."},
      {taux:0.57,mult:0.90,events:"Fête de la Truffe (janv → préparation). Marchés provençaux. Vin Châteauneuf-du-Pape nouveau. Basse saison."},
      {taux:0.40,mult:0.72,events:"Basse saison. Mistral plus présent. Truffes noires (décembre-mars). Calme. Visites Palais des Papes sans file."},
      {taux:0.48,mult:0.82,events:"Marché de Noël sur la place de l'Horloge. Crèches provençales. Santons. Ambiance festive. Fêtes fin d'année."},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:1.80,
      info:"Avignon : résidence secondaire sans plafond. Taxe de séjour ~1,80 EUR/nuit/pers. Festival d'Avignon (juillet) : demande x3 à x5, réservations 6 mois à l'avance." },
  },
  aix_en_provence: {
    label: "Aix-en-Provence",
    saisons: [
      {taux:0.50,mult:0.80,events:"Hiver doux (10°C). Cours Mirabeau animé. Marché provençal. Tourisme affaires (Marseille 30 min, TGV)."},
      {taux:0.52,mult:0.82,events:"Carnaval d'Aix. Calme hivernal. Atelier Cézanne visite. Basse saison touristique mais affaires stables."},
      {taux:0.58,mult:0.90,events:"Printemps en Provence. Marchés fleurs. Campagne Cézanne. Tourisme culturel reprend. Fontaines animées."},
      {taux:0.68,mult:1.03,events:"Pâques. Festival de Pâques (musique classique). Lavande pas encore. Marchés provençaux actifs."},
      {taux:0.74,mult:1.10,events:"Festival de Pâques Aix-en-Provence (musique). Préparation Festival d'Art Lyrique. Tourisme monte."},
      {taux:0.82,mult:1.24,events:"🎶 Festival International d'Art Lyrique d'Aix (fin juin-juillet, opéra de rang mondial). Demande forte. Début saison."},
      {taux:0.88,mult:1.42,events:"🎭 Festival d'Art Lyrique (3 semaines juillet). Théâtre de l'Archevêché. Clientèle internationale cultivée. Prix premium."},
      {taux:0.90,mult:1.48,events:"Pic touristique. Festival terminé mais été plein. Circuits Cézanne. Montagne Sainte-Victoire. Marché Richelme."},
      {taux:0.78,mult:1.18,events:"Arrière-saison. Vendanges Coteaux d'Aix. Marchés. Couleurs Sainte-Victoire. Très agréable sans foule."},
      {taux:0.63,mult:0.95,events:"Basse saison. Congrès Marseille-Aix. Journées Patrimoine. Salon Saveurs. Bon rapport qualité-prix."},
      {taux:0.50,mult:0.80,events:"Basse saison. Décoration truffe noire (prochaine récolte). Calme. Vie estudiantine."},
      {taux:0.54,mult:0.85,events:"Marché de Noël cours Mirabeau. Santon fair. Ambiance provençale fêtes. Illuminations. Calme mais joli."},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:2.00,
      info:"Aix-en-Provence : résidence secondaire sans plafond. Taxe de séjour ~2 EUR/nuit/pers. Demande touristique et affaires (festival d'art lyrique en juillet)." },
  },
  marseille: {
    label: "Marseille",
    saisons: [
      {taux:0.46,mult:0.73,events:"Basse saison. Capitaine Fracasse (mer agitée). Vie locale intense (Noailles, Vieux-Port). Congrès au Parc Chanot."},
      {taux:0.49,mult:0.76,events:"Carnaval de Marseille. Festival des Musiques Brûlantes (parfois). Calanques accessibles sans permis."},
      {taux:0.56,mult:0.84,events:"Printemps marseillais. Calanques ouvertes (pas encore de restriction d'accès estivale). Mer 14°C."},
      {taux:0.66,mult:0.97,events:"Pâques. Début saison calanques. Marchés poissons Vieux-Port. Pèlerinage Notre-Dame de la Garde (15 août prép.)."},
      {taux:0.73,mult:1.07,events:"Montée tourisme. MuCEM plein. Calanques accessibles. Friches la Belle de Mai concerts. Mer 18°C."},
      {taux:0.83,mult:1.24,events:"🌊 Début haute saison. Calanques en bateau très demandées. Festival de Marseille (danse, théâtre). Plage Prado."},
      {taux:0.91,mult:1.52,events:"Pic touristique. Fête nationale. Calanques (accès parfois restreint en juillet-août). MuCEM bondé. Navettes île d'If."},
      {taux:0.93,mult:1.57,events:"🏖️ Pic absolu. Pèlerinage Notre-Dame de la Garde (15 août). Plage du Prado, Calanques, Frioul. Prix max."},
      {taux:0.79,mult:1.20,events:"Mer encore 24°C. Moins de monde. Calanques accessibles sans restriction. Très agréable. Marseille Jazz."},
      {taux:0.61,mult:0.90,events:"Basse saison. Salon Nautique (parfois oct). Congrès APEC Chanot. Football Vélodrome remplit les quartiers."},
      {taux:0.46,mult:0.73,events:"Basse saison. Matchs OM Vélodrome (week-ends forts). Marché de Noël Vieux-Port. Calme hivernal."},
      {taux:0.51,mult:0.80,events:"Marché de Noël Vieux-Port. Crèches santons (tradition provençale forte). Fêtes fin d'année. Météo douce."},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.50,
      info:"Marseille : limite 120 nuits/an résidence principale. Enregistrement obligatoire depuis 2020. Taxe de séjour ~2,50 EUR/nuit/pers." },
  },
  // ── ATLANTIQUE & PAYS BASQUE ─────────────────────────────────────────────
  biarritz: {
    label: "Biarritz",
    saisons: [
      {taux:0.50,mult:0.80,events:"Hiver surf (houle atlantique parfaite). Thalasso. Congrès Palais Bellevue. Moins cher mais ambiance locaux."},
      {taux:0.52,mult:0.82,events:"Surf hivernal. Carnaval basque (parfois). Festival Biarritz Amérique Latine approche. Calme."},
      {taux:0.58,mult:0.90,events:"Printemps basque. Marchés. Gastronomie basque (Michelin dense). Mer encore froide mais surf actif."},
      {taux:0.70,mult:1.08,events:"Montée tourisme. Biarritz Surf Festival approche. Fêtes basques de printemps. Mer 16°C."},
      {taux:0.77,mult:1.18,events:"🏄 Biarritz Surf Festival (mi-juillet → parfois début). Montée forte. Plage de la Grande Côte animée."},
      {taux:0.88,mult:1.40,events:"Biarritz Surf Festival (si juin). Festival Millesime Biarritz (vins). Début haute saison balnéaire. Plages actives."},
      {taux:0.97,mult:1.80,events:"🌊 Pic absolu. Grande Plage bondée. Championnats surf européens. Casino animé. Nuits basques. Feux d'artifice."},
      {taux:0.99,mult:1.95,events:"Pic des pics. Biarritz Surf Festival (fin août si tardif). Soirées. Pelote basque. Semaine de Biarritz. Prix maximum."},
      {taux:0.85,mult:1.40,events:"🏄 Championnats Surf (parfois sept, WCT). Arrière-saison excellent. Mer 22°C. Moins de monde. Prix en baisse."},
      {taux:0.65,mult:1.00,events:"Biarritz Amérique Latine (festival, début oct). Surf encore. Gastronomie. Moins cher. Agréable."},
      {taux:0.48,mult:0.78,events:"Basse saison. Thalasso. Congrès. Locaux reprennent la ville. Golf Ilbarritz (7 parcours région)."},
      {taux:0.54,mult:0.85,events:"Marché de Noël. Fêtes fin d'année. Houle atlantique pour surfeurs. Ambiance basque hivernale chaleureuse."},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:2.00,
      info:"Biarritz : résidence secondaire sans plafond. Taxe de séjour ~2 EUR/nuit/pers. Surfing + gastronomie : demande forte été et septembre (championnats surf)." },
  },
  saint_jean_luz: {
    label: "Saint-Jean-de-Luz / Hendaye",
    saisons: [
      {taux:0.35,mult:0.65,events:"Morte-saison. Village de pêcheurs calme. Maison Louis XIV. Thon et anchois hors saison. Quelques locaux."},
      {taux:0.38,mult:0.68,events:"Carnaval basque (très coloré, traditions fortes). Basse saison mais ambiance locale vivante."},
      {taux:0.45,mult:0.78,events:"Printemps doux. Surf reprend. Marchés Saint-Jean. Côte basque verte et belle. Tourisme familial léger."},
      {taux:0.60,mult:0.95,events:"Pâques. Familles. Surf. Plage de la Côte des Basques (célèbre pour surf). Frontière Espagne 15 min."},
      {taux:0.72,mult:1.12,events:"Tourisme monte. Mer 18°C. Pèche thon en mer. Fêtes basques locales. Jazz sur la place."},
      {taux:0.88,mult:1.42,events:"Début haute saison. Fêtes de Saint-Jean-de-Luz (fin juin). Plage Grande Plage animée. Familles."},
      {taux:0.97,mult:1.82,events:"🎉 Fêtes de Bayonne (1ère sem. août, 1,2M visiteurs à 40km → débordement). Pic absolu. Plage bondée. Pelote basque."},
      {taux:0.98,mult:1.90,events:"Pic des pics. Fêtes de Bayonne (si août) + haute saison. Côte Basque bondée. Surf, gastronomie, plages."},
      {taux:0.82,mult:1.35,events:"Arrière-saison magnifique. Mer 22°C. Moins de monde. Côte Basque en beauté. Vendanges Irouléguy."},
      {taux:0.58,mult:0.92,events:"Basse saison. Surf automnal. Gastronomie basque. Marchés anchois/thon. Calme agréable."},
      {taux:0.36,mult:0.66,events:"Basse saison. Pluies basques. Intérieur Pays Basque (Sare, Espelette piments). Calme hivernal."},
      {taux:0.38,mult:0.68,events:"Fêtes de fin d'année. Marchés de Noël basques. Ambiance chaleureuse. Côté espagnol vivant."},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:1.80,
      info:"Saint-Jean-de-Luz : résidence secondaire sans plafond. Très saisonnière. Taxe de séjour ~1,80 EUR/nuit/pers." },
  },
  la_rochelle: {
    label: "La Rochelle & Île de Ré",
    saisons: [
      {taux:0.38,mult:0.70,events:"Morte-saison. La Rochelle port animé mais Île de Ré quasi déserte. Huîtres Marennes-Oléron. Calme."},
      {taux:0.38,mult:0.70,events:"Basse saison. Angoulême BD Festival (prochain janv). Météo venteuse. Île de Ré vide. Port commercial actif."},
      {taux:0.45,mult:0.80,events:"Printemps doux. Île de Ré commence à s'animer. Vélos îliens. Marchés. Huîtres excellentes."},
      {taux:0.60,mult:0.95,events:"Pâques. Île de Ré réservations font (déjà!). Bicycles sur les pistes cyclables. Fleurs piques et belles."},
      {taux:0.72,mult:1.12,events:"Fête du nautisme La Rochelle (mai parfois). Marais salants. Île de Ré animations. Mer 17°C."},
      {taux:0.84,mult:1.32,events:"Début haute saison. Grand Pavois (salon nautique, oct) préparation. Île de Ré très demandée déjà."},
      {taux:0.97,mult:1.75,events:"🌊 Pic absolu. Île de Ré = destination premium française. Ponts bondés. Vélodyssée cyclistes. Feux 14 juil. Prix très élevés Ré."},
      {taux:0.98,mult:1.85,events:"Pic des pics. Île de Ré saturée. Yachting port Vieux. Les Portes-en-Ré, Saint-Martin ultra demandés. Le prix le plus élevé de l'été."},
      {taux:0.78,mult:1.20,events:"Arrière-saison. Mer encore chaude. Grand Pavois — Salon Nautique La Rochelle (fin sept, le + grand d'Europe flottant)."},
      {taux:0.55,mult:0.88,events:"🚢 Grand Pavois La Rochelle (salon nautique, 6 jours). Demande affaires marine. Fin saison Île de Ré."},
      {taux:0.35,mult:0.68,events:"Basse saison. Île de Ré vide, prix divisés par 3-4 vs été. La Rochelle vie locale. Huîtres."},
      {taux:0.38,mult:0.72,events:"Noël côte atlantique. Marché de Noël La Rochelle. Quelques familles. Île de Ré très calme."},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:2.00,
      info:"La Rochelle / Île de Ré : résidence secondaire sans plafond. Taxe de séjour ~2 EUR/nuit/pers. Île de Ré : marché très premium, offre rare en haute saison." },
  },
  bordeaux: {
    label: "Bordeaux",
    saisons: [
      {taux:0.53,mult:0.79,events:"Basse saison. Tourisme vin (caves Médoc toujours ouvertes). Congrès Palais des Congrès. Vie culturelle (Opéra)."},
      {taux:0.54,mult:0.80,events:"Salon Vinitech (salon viticole biennal). Vie étudiante (100 000 étudiants). Carnaval des Deux Rives."},
      {taux:0.59,mult:0.87,events:"Printemps girondin. Vignes en fleurs Médoc. Marathon Bordeaux Métropole (parfois avr). Tourisme wine reprend."},
      {taux:0.69,mult:1.02,events:"Pâques. Tourisme route des châteaux (Saint-Émilion bondé Pâques). Fin Entraides Bordeaux Sciences Po."},
      {taux:0.74,mult:1.07,events:"Fête de Bordeaux (parfois mai). Expositions. Marché des quais. Dylan Bob (blague). Vignes verdissent."},
      {taux:0.79,mult:1.17,events:"Fête du Vin de Bordeaux (fin juin, biennal, 100 000 visiteurs, gratuit). Quais très animés. Début été."},
      {taux:0.86,mult:1.32,events:"🍷 Fête du Vin Bordeaux (si édition juillet) OU haute saison classique. Quais Garonne. Cité du Vin pleine. Tourisme Médoc."},
      {taux:0.89,mult:1.37,events:"Pic touristique. Tour de France souvent étape Bordeaux. Cité du Vin record visiteurs. Quais animés soirées."},
      {taux:0.80,mult:1.20,events:"🍇 Vendanges Médoc (sept). Marathon des Châteaux du Médoc (déguisé, 8 500 coureurs, 1er sam. sept). Très demandé."},
      {taux:0.70,mult:1.02,events:"Primeurs Bordeaux (dégustation en barriques). Salon des Antiquaires. Vignobles en couleurs. Tourisme vin fort."},
      {taux:0.53,mult:0.79,events:"Basse saison. Congrès. Fête du Beaujolais (peu). Vie universitaire. Foire Internationale (parfois oct)."},
      {taux:0.63,mult:0.92,events:"Marché de Noël place des Quinconces (un des + grands de France). Fêtes. Réveillon. Ambiance hivernale."},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.00,
      info:"Bordeaux : limite 120 nuits/an résidence principale. Enregistrement obligatoire depuis 2022. Taxe de séjour ~2 EUR/nuit/pers." },
  },
  // ── BRETAGNE & NORMANDIE ─────────────────────────────────────────────────
  saint_malo: {
    label: "Saint-Malo",
    saisons: [
      {taux:0.30,mult:0.60,events:"Morte-saison. Remparts battus par les vents. Quelques voyageurs romantiques. Prix imbattables."},
      {taux:0.32,mult:0.62,events:"Basse saison. Fête de la Chandeleur crêpes bretonnes. Tempêtes spectaculaires (côtes accessibles). Calme."},
      {taux:0.40,mult:0.72,events:"Printemps marin. Grandes Marées (spectaculaire en Rance). Pêche. Oysters (huîtres Cancale à 15 min). Retour touristes."},
      {taux:0.58,mult:0.90,events:"Pâques. Week-ends forts. Cancale (huîtres). Dinard proche. Grande Marée printanière. Tourisme familial."},
      {taux:0.68,mult:1.05,events:"Route du Rhum préparations (course oct). Festival Rock'n Solex (mai). Mer encore froide mais beau."},
      {taux:0.80,mult:1.22,events:"Étonnants Voyageurs Festival (littérature, mi-juin). Début haute saison. Remparts animés. Plages actives."},
      {taux:0.98,mult:1.80,events:"🏖️ Pic absolu. Intramuros bondé. Plages Grand Bé, Malouin. Excursions Mont-Saint-Michel (45 min). Prix x3 vs hiver."},
      {taux:0.99,mult:1.92,events:"Pic des pics. Grande Marée d'août (phénomène touristique). Festival Quai des Bulles (oct prép.). Fêtes plages."},
      {taux:0.72,mult:1.08,events:"Arrière-saison. Route du Rhum (si édition — tous les 4 ans, oct, 40 000 visiteurs sur quais). Mer encore 20°C."},
      {taux:0.45,mult:0.78,events:"🚢 Route du Rhum (si édition, 1ère sem. nov — tous les 4 ans depuis 1978). Basse saison sinon."},
      {taux:0.28,mult:0.58,events:"Morte-saison. Vents d'ouest. Tempêtes Atlantique. Quelques weekends romantiques. Huîtres Cancale."},
      {taux:0.32,mult:0.62,events:"Marché de Noël dans les remparts. Fêtes fin d'année. Ambiance médiévale hivernale. Quelques familles."},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:1.80,
      info:"Saint-Malo : résidence secondaire sans plafond. Taxe de séjour ~1,80 EUR/nuit/pers. Marché très saisonnier (juil-août représentent ~50% du CA annuel)." },
  },
  vannes_morbihan: {
    label: "Vannes & Golfe du Morbihan",
    saisons: [
      {taux:0.28,mult:0.58,events:"Morte-saison. Golfe vide. Vie locale de Vannes animée. Remparts médiévaux calmes. Prix très bas."},
      {taux:0.30,mult:0.60,events:"Basse saison. Carnaval Vannes. Jardin des Remparts. Morbihan nature (landes, forêts). Calme."},
      {taux:0.38,mult:0.70,events:"Printemps breton. Alignements Carnac accessibles sans réservation. Mégalithes. Mer commence à s'animer."},
      {taux:0.55,mult:0.88,events:"Pâques. Belz, Locmariaquer, Belle-Île accessibles. Mouettes et voiliers. Tourisme doux reprend."},
      {taux:0.68,mult:1.05,events:"Festival Jazz à Vannes (mai-juin). Navigation golfe. Maison de la mer. Belle-Île en Mer ferries."},
      {taux:0.80,mult:1.22,events:"Début haute saison. Golfe du Morbihan idéal (mer calme, îles). Carnac très fréquenté. Navigation."},
      {taux:0.97,mult:1.72,events:"🌊 Pic absolu. Golfe saturé (850 îles et îlots). Ile-aux-Moines, Arz très demandées. Vannes médiéval bondé. Fest-Noz."},
      {taux:0.98,mult:1.80,events:"Pic des pics. Festival Interceltique Lorient (1ère sem. août, à 40km, 750 000 visiteurs → débordement Morbihan)."},
      {taux:0.72,mult:1.08,events:"Arrière-saison magnifique. Mer 20°C. Moins cher. Vannes sans foule. Carnac libre. Très agréable."},
      {taux:0.45,mult:0.78,events:"Basse saison. Fêtes Bretonnes d'automne. Huîtres Locmariaquer. Randonnées Presqu'île de Rhuys."},
      {taux:0.28,mult:0.58,events:"Morte-saison. Vannes préserve son âme bretonne. Marchés couverts. Calme absolu. Prix divisés par 3."},
      {taux:0.30,mult:0.60,events:"Marché de Noël Vannes (remparts illuminés). Crêpes et cidre. Ambiance bretonne hivernale. Familles."},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:1.50,
      info:"Vannes / Golfe du Morbihan : résidence secondaire sans plafond. Taxe de séjour ~1,50 EUR/nuit/pers." },
  },
  deauville: {
    label: "Deauville / Honfleur / Côte Fleurie",
    saisons: [
      {taux:0.35,mult:0.68,events:"Basse saison. Parisiens rares. Casino Deauville ouvert. Haras actifs (élevage pur-sang). Honfleur calme."},
      {taux:0.35,mult:0.68,events:"Basse saison. Premières ventes chevaux Haras du Pin. Carnaval Deauville (si organisé). Calme hivernal."},
      {taux:0.40,mult:0.75,events:"Printemps Côte Fleurie. Pommiers en fleurs Normandie. Retour week-ends parisiens (3h Paris → 2h). Honfleur coloré."},
      {taux:0.52,mult:0.88,events:"Pâques fort. Familles parisiennes. Arromanches D-Day approche. Trouville Marché. Mer encore froide."},
      {taux:0.62,mult:1.00,events:"Ventes Yearlings Deauville (août mais préparations). 70e anniversaire D-Day (Arromanches). Jardins fleuris."},
      {taux:0.72,mult:1.15,events:"Début saison balnéaire. Planches de Deauville animées. Beach clubs ouvrent. Voiliers. Week-ends."},
      {taux:0.88,mult:1.52,events:"🎬 Festival du Cinéma Américain de Deauville (1ère sem. sept → parfois juillet). Haute saison balnéaire. Les Planches. Prix max."},
      {taux:0.92,mult:1.65,events:"Ventes de Yearlings (pur-sang yearlings, fin août — les + importantes d'Europe, 300M€ échangés). Pic absolu été."},
      {taux:0.68,mult:1.08,events:"🎬 Festival du Cinéma Américain Deauville (1ère sem. sept, 30 000 entrées). Celebrities USA. Demande forte semaine festival."},
      {taux:0.58,mult:0.95,events:"Week-ends normands. Arrière-saison. Pommes et cidre (octobre → calvados). Honfleur photogénique automne."},
      {taux:0.38,mult:0.72,events:"Basse saison. Ventes chevaux. Toussaint week-end fort (familles). Honfleur commence illuminations."},
      {taux:0.40,mult:0.75,events:"Marché de Noël Honfleur (le plus visité de Normandie). Lumières. Week-ends Noël parisiens. Ambiance."},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:2.20,
      info:"Deauville / Honfleur : résidence secondaire sans plafond. Taxe de séjour ~2,20 EUR/nuit/pers. Week-ends parisiens forts toute l'année." },
  },
  // ── GRANDES VILLES ───────────────────────────────────────────────────────
  lyon: {
    label: "Lyon",
    saisons: [
      {taux:0.59,mult:0.83,events:"Basse saison touristique. Vie gastronomique forte (Bocuse, bouchons). Congrès Centre de Congrès. Vie étudiante."},
      {taux:0.62,mult:0.87,events:"Nuit de la Gastronomie. Carnaval vénitien. Salon Sirha (années impaires, jan-fév, salon mondial restauration)."},
      {taux:0.67,mult:0.95,events:"Printemps. Berges Rhône animées. Festival NUITS SONORES approche (mai). Tourisme culturel reprend."},
      {taux:0.72,mult:1.02,events:"Pâques. Quais Saône. Vieux-Lyon animé. Marché artisanal. Festival du film et cinéma européen approche."},
      {taux:0.75,mult:1.07,events:"🎶 Nuits Sonores Festival (musique électronique, 5 jours, 60 000 personnes). Très fort demande. Biennale Danse (années paires)."},
      {taux:0.77,mult:1.10,events:"Début été. Berges aménagées. Guinguettes Rhône. Biennale d'Art Contemporain (années impaires). Tourisme monte."},
      {taux:0.70,mult:1.00,events:"Bonne saison. Lyonceaux partent en vacances = moins chargé. Tourisme international prend le relais. Parc Tête d'Or."},
      {taux:0.60,mult:0.84,events:"Creux d'été relatif (Lyonnais partent). Touristes étrangers. Canicule parfois. Festival Woodstock à Corlay (loin)."},
      {taux:0.75,mult:1.07,events:"Rentrée. Biennale Danse (sept, années paires). Festival Lumière (oct). Saison culturelle pleine. Congrès reprennent."},
      {taux:0.72,mult:1.02,events:"🎥 Festival Lumière Lyon (oct, hommage frères Lumière, 200 000 entrées, stars du cinéma mondial). Demande forte."},
      {taux:0.74,mult:1.04,events:"Beaujolais Nouveau (3e jeudi nov, Lyon capitale célèbre). Salons. Saison opéra. Vie culturelle intense."},
      {taux:0.76,mult:1.08,events:"✨ Fête des Lumières (4 nuits début déc, 2 millions visiteurs). Demande x2 ces 4 nuits. Réservations indispensables mois avant."},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:3.00,
      info:"Lyon : limite 120 nuits/an résidence principale. Enregistrement obligatoire. Taxe de séjour ~3 EUR/nuit/pers. Fête des Lumières (décembre) : pic de demande fort." },
  },
  strasbourg: {
    label: "Strasbourg",
    saisons: [
      {taux:0.55,mult:0.82,events:"Post-Noël calme. Sessions Parlement Européen (environ 4 fois/mois → 750 eurodéputés). Affaires stables."},
      {taux:0.57,mult:0.85,events:"Session PE. Carnaval d'Alsace. Bredala (marché de l'Avent terminé). Calme hivernal."},
      {taux:0.62,mult:0.92,events:"Printemps alsacien. Vignes en dormance. Retour touristes. Session PE. Route des Vins ouverte."},
      {taux:0.68,mult:1.00,events:"Pâques. Tourisme route des vins (Riquewihr, Colmar). Session PE. Fête des Jonquilles (Munster)."},
      {taux:0.72,mult:1.05,events:"Foire Européenne de Strasbourg (sept → préparation). Session PE. Printemps alsacien animé."},
      {taux:0.74,mult:1.08,events:"Fête nationale. Session PE. Début été en Alsace. Tourisme route des vins. Bière Kronenbourg."},
      {taux:0.76,mult:1.10,events:"Musica festival (sept). Session PE continue. Tourisme familles. Route des Vins. Cigognes bébés."},
      {taux:0.74,mult:1.07,events:"Foire Européenne (2 sem. fin août-sept). Session PE. Tourisme Alsace. Riesling vendanges approchent."},
      {taux:0.72,mult:1.05,events:"Foire Européenne Strasbourg (si sept, 500 000 visiteurs). Vendanges Alsace. Musica (musique contemporaine)."},
      {taux:0.68,mult:1.00,events:"Vendanges tardives Alsace. Route des Vins magnifique (couleurs). Sessions PE. Salons pros."},
      {taux:0.70,mult:1.02,events:"Début préparations Marché de Noël. Sessions PE. Alsace automnale. Tourisme monte progressivement."},
      {taux:0.92,mult:1.68,events:"🎄 Marché de Noël Christkindelsmärik (le + vieux de France, depuis 1570, 3 millions visiteurs). Demande x2 à x3 tout le mois. Réservations indispensables 6-9 mois avant."},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.20,
      info:"Strasbourg : limite 120 nuits/an résidence principale. Enregistrement obligatoire. Taxe de séjour ~2,20 EUR/nuit/pers. Marché de Noël (décembre) : demande x2 à x3." },
  },
  rennes: {
    label: "Rennes",
    saisons: [
      {taux:0.55,mult:0.84,events:"Basse saison. Vie universitaire forte (70 000 étudiants). Congrès. Festival Travelling (cinéma voyageur, janv-fév)."},
      {taux:0.57,mult:0.86,events:"Carnaval de Rennes. Festival Travelling. Salons. Vie étudiante intense. Gastronomie bretonne."},
      {taux:0.62,mult:0.93,events:"Printemps breton. Marchés médiévaux. Tourisme culturel reprend. Parlement de Bretagne."},
      {taux:0.68,mult:1.01,events:"Pâques. Festival Mythos (arts de la rue, avril-mai, 100 000 spectateurs). Tourisme famille Bretagne."},
      {taux:0.72,mult:1.06,events:"🎪 Festival Mythos (arts de la rue, mai). Printemps des Arts. Rennes City Marathon (parfois mai)."},
      {taux:0.75,mult:1.10,events:"Début été. Tombées de la Nuit Festival (arts visuels). Étudiants partis. Tourisme familial Bretagne."},
      {taux:0.78,mult:1.15,events:"Haute saison. Fêtes de Cornouaille Quimper (à 2h). Festival Interceltique Lorient (à 1h30). Proximité côtes bretonnes."},
      {taux:0.76,mult:1.11,events:"Festival Interceltique Lorient (1ère sem. août, 750 000 visiteurs → débordement Rennes). Été plein."},
      {taux:0.74,mult:1.08,events:"Rentrée universitaire massive. Trans Musicales en préparation. Festival Les Tombées de la Nuit (parfois sept)."},
      {taux:0.70,mult:1.02,events:"Salon auto (parfois). Vie universitaire pleine. Gastronomie bretonne (galettes, cidre, kouign-amann)."},
      {taux:0.60,mult:0.90,events:"Basse saison. 🎸 Trans Musicales de Rennes (déc, musiques émergentes, 35 000 personnes). Préparation."},
      {taux:0.63,mult:0.94,events:"🎵 Trans Musicales (1ère sem. déc, Parc des Expositions). Demande forte ces 5 jours. Marché de Noël. Fêtes."},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.00,
      info:"Rennes : limite 120 nuits/an résidence principale. Enregistrement obligatoire. Taxe de séjour ~2 EUR/nuit/pers." },
  },
  nantes: {
    label: "Nantes",
    saisons: [
      {taux:0.54,mult:0.82,events:"Basse saison. Vie culturelle forte (Machines de l'Île ouvertes). Congrès La Cité. Étudiants (50 000)."},
      {taux:0.56,mult:0.84,events:"Carnaval de Nantes (très populaire). Basse saison. Le Voyage à Nantes prépare son programme."},
      {taux:0.62,mult:0.92,events:"Printemps nantais. Jardin des plantes. Quartier créatif effervescent. Tourisme doux reprend."},
      {taux:0.68,mult:1.00,events:"Pâques. Sortie machines de l'Île (Éléphant de 50 tonnes). Le Voyage à Nantes ouverture approche."},
      {taux:0.72,mult:1.06,events:"Floraison jardin des Plantes. Festival Scopitone (musiques électroniques, mai). Le Voyage à Nantes prépare."},
      {taux:0.76,mult:1.11,events:"🎨 Le Voyage à Nantes (parcours art contemporain in situ, juin à sept, 700 000 visiteurs). Début très fort."},
      {taux:0.80,mult:1.18,events:"🎨 Le Voyage à Nantes (pic). Machines de l'Île, Éléphant, Carrousel des Mondes Marins. Nantes capitale créative."},
      {taux:0.78,mult:1.14,events:"Le Voyage à Nantes (jusqu'à fin août). Estivales de nuit. Île de Noirmoutier proche (1h). Loire animée."},
      {taux:0.74,mult:1.08,events:"Fin Voyage à Nantes. Rentrée. Festival Les Rendez-vous de l'Erdre (jazz, août-sept, 250 000 personnes)."},
      {taux:0.68,mult:1.00,events:"Basse saison. Musées. Congrès. Vie étudiante. Vignoble Muscadet vendanges (15 min de Nantes)."},
      {taux:0.56,mult:0.84,events:"Basse saison. Nuits de l'Erdre. Vie culturelle. Machines de l'Île. Le château des Ducs sans queue."},
      {taux:0.60,mult:0.90,events:"Marché de Noël place Royale. Fêtes. Illuminations. Ambiance festive. Château des Ducs illuminé."},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.00,
      info:"Nantes : limite 120 nuits/an résidence principale. Enregistrement obligatoire. Taxe de séjour ~2 EUR/nuit/pers." },
  },
  lille: {
    label: "Lille",
    saisons: [
      {taux:0.55,mult:0.83,events:"Basse saison. Euralille actif (commerce). Congrès Grand Palais. Vie estudiantine (100 000 étudiants). Proximity Bruxelles."},
      {taux:0.57,mult:0.85,events:"Carnaval de Dunkerque (proche, très célèbre, 100 000 personnes). Basse saison mais week-end Dunkerque fort."},
      {taux:0.62,mult:0.92,events:"Printemps nordiste. Marchés Vieux-Lille. Braderie en préparation. Tourisme transfrontalier (Belgique, UK Eurostar)."},
      {taux:0.68,mult:1.01,events:"Pâques. Week-end fort (Eurostar Paris-Londres passe par Lille). Tourisme culturel. Vieux-Lille animé."},
      {taux:0.72,mult:1.06,events:"Tournoi WTA Nordea Open (tennis, mai). Printemps citadin. Terrasses Vieux-Lille. Concerts."},
      {taux:0.73,mult:1.07,events:"Début été. Week-ends Belges/Anglais. Comité Régional Tourisme actif. Fêtes de Gayant Douai (1ère sem. juil)."},
      {taux:0.74,mult:1.08,events:"Haute saison modérée (Lille = ville intérieure). Tourisme Côte d'Opale (Boulogne, Le Touquet, 1h30). Estivants."},
      {taux:0.72,mult:1.05,events:"Été stable. Braderie de Lille en préparation (1er WE sept, 2 millions visiteurs). Résidents partis = calme."},
      {taux:0.72,mult:1.06,events:"🛍️ Braderie de Lille (1er WE sept, 2 millions de visiteurs, 100km de bric-à-brac). Demande x2 ce week-end."},
      {taux:0.70,mult:1.03,events:"Festival Lille 3000 (culture urbaine, tous les 3 ans). Foire commerciale. Vie culturelle Opéra. Congrès."},
      {taux:0.65,mult:0.96,events:"Basse saison touristique. Vie universitaire pleine. Lille Grand Palais congrès. Shopping Euralille."},
      {taux:0.68,mult:1.00,events:"Marché de Noël Grande-Place (très couru). Fêtes. Transfrontaliers belges et anglais. Ambiance flamande."},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.00,
      info:"Lille : limite 120 nuits/an résidence principale. Enregistrement obligatoire. Taxe de séjour ~2 EUR/nuit/pers. Braderie de Lille (1er week-end sept) : forte demande." },
  },
  // ── AUTRE ────────────────────────────────────────────────────────────────
  autre: {
    label: "Autre ville / zone rurale",
    saisons: [
      {taux:0.38,mult:0.78,events:"Morte-saison rurale. Quelques touristes si station de ski ou ville avec patrimoine. Prix très bas."},
      {taux:0.38,mult:0.78,events:"Basse saison. Carnaval local parfois. Peu de demande touristique extérieure."},
      {taux:0.43,mult:0.83,events:"Printemps. Randonnées. Retour premiers touristes. Campagnes fleuries. Marchés locaux."},
      {taux:0.53,mult:0.93,events:"Pâques fort (week-ends familles). Campagne printanière. Activités outdoor."},
      {taux:0.59,mult:0.99,events:"Montée progressive. Fêtes locales. Randonnées. Activités en plein air."},
      {taux:0.64,mult:1.06,events:"Début saison estivale. Gîtes et chambres d'hôtes se remplissent. Marchés nocturnes."},
      {taux:0.81,mult:1.33,events:"Haute saison. Festivals locaux. Vacances familles. Fêtes de village. Tourisme vert."},
      {taux:0.86,mult:1.43,events:"Pic absolu. Familles. Festivals. Marchés artisanaux. Tourisme rural à son maximum."},
      {taux:0.61,mult:1.01,events:"Arrière-saison agréable. Moins de monde. Vendanges si vignoble. Randonnées automne."},
      {taux:0.46,mult:0.86,events:"Basse saison. Couleurs d'automne. Cueillette champignons. Week-ends ressourcement."},
      {taux:0.33,mult:0.73,events:"Basse saison. Préparations Noël. Peu de demande touristique. Prix minimum."},
      {taux:0.39,mult:0.81,events:"Fêtes de Noël et Nouvel An. Quelques touristes familiaux. Marchés de Noël si ville moyenne."},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:1.00,
      info:"Zone hors grandes villes : réglementation souple. Déclaration en mairie recommandée si meublé tourisme. Taxe de séjour ~1 EUR/nuit/pers." },
  },
};

// National market barometer - refreshed from public sources (Notaires de France,
// Banque de France, Meilleurs Agents). Update the figures + date periodically.
const BAROMETRE = {
  date: "juin 2026",
  prix: "+0,5 a +1 %/an (notaires : +1,4 % appartements anciens)",
  taux: "~3,4 % sur 20 ans",
  demande: "acheteurs +3,2 % depuis janvier 2026, volumes encore -25 % vs 2021",
  resume: "Marche a l'equilibre mais fragile : reprise moderee, soutenue par la detente des taux et une offre limitee. Forte prime aux bons DPE.",
};

// Barometre des taux de credit immobilier - a rafraichir periodiquement.
// Sources : Banque de France & barometres courtiers (Cafpi, Meilleurtaux, Pretto).
const TAUX_MARCHE = {
  date: "juin 2026",
  trend: "hausse", // "hausse" | "baisse" | "stable"
  trendNote: "Legere hausse depuis mai 2026 (tensions geopolitiques, prix de l'energie).",
  rates: { 15: 3.20, 20: 3.37, 25: 3.48 }, // taux moyens constates
  best: { 15: 2.85, 20: 3.05, 25: 3.20 },   // meilleurs profils
  source: "Banque de France & barometres courtiers",
};
const rateForDuration = (years) => {
  const d = years <= 17 ? 15 : years <= 22 ? 20 : 25;
  return { key: d, rate: TAUX_MARCHE.rates[d], best: TAUX_MARCHE.best[d] };
};

// Interactive map of the subject property + comparable sales (Leaflet + OSM).
function CompMap({ center, comps }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      const map = L.map(ref.current, { scrollWheelZoom: false }).setView([center.lat, center.lon], 15);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      const pts = [[center.lat, center.lon]];
      L.circleMarker([center.lat, center.lon], {
        radius: 10, color: "#fff", weight: 3, fillColor: "#22c55e", fillOpacity: 1,
      }).addTo(map).bindPopup("<b>Bien estime</b>");

      comps.forEach((c) => {
        if (!c.lat || !c.lon) return;
        pts.push([c.lat, c.lon]);
        L.circleMarker([c.lat, c.lon], {
          radius: 6, color: "#1e3a8a", weight: 1, fillColor: "#3b82f6", fillOpacity: 0.85,
        }).addTo(map).bindPopup(
          `${c.adresse || c.commune}<br>${c.surface} m2 &middot; ${c.prix.toLocaleString("fr-FR")} EUR<br><b>${c.pm2.toLocaleString("fr-FR")} EUR/m2</b> &middot; a ${c.dist} m`
        );
      });
      if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30], maxZoom: 16 });
      setTimeout(() => map.invalidateSize(), 100);
    })();
    return () => { cancelled = true; };
  }, [center.lat, center.lon, comps.length]);

  return <div ref={ref} className="map" />;
}

function MarketBarometer() {
  return (
    <div className="barometre">
      <div className="baro-head">Barometre national &middot; {BAROMETRE.date}</div>
      <div className="baro-grid">
        <div><span>Prix</span>{BAROMETRE.prix}</div>
        <div><span>Taux</span>{BAROMETRE.taux}</div>
        <div><span>Demande</span>{BAROMETRE.demande}</div>
      </div>
      <p className="baro-note">{BAROMETRE.resume}</p>
      <p className="baro-src">Sources : Notaires de France, Banque de France, Meilleurs Agents.</p>
    </div>
  );
}

// city name → Airbnb zone key
const CITY_TO_AIRBNB = {
  "Paris":"paris","Versailles":"versailles",
  "Cannes":"cannes","Nice":"nice","Antibes":"antibes",
  "Saint-Tropez":"saint_tropez","Cogolin":"saint_tropez","Grimaud":"saint_tropez",
  "Menton":"menton",
  "Chamonix-Mont-Blanc":"chamonix","Chamonix":"chamonix",
  "Annecy":"annecy",
  "Courchevel":"courchevel","Val-d'Isère":"courchevel","Méribel":"courchevel",
  "Toulouse":"toulouse","Montpellier":"montpellier",
  "Avignon":"avignon",
  "Aix-en-Provence":"aix_en_provence","Marseille":"marseille",
  "Biarritz":"biarritz",
  "Saint-Jean-de-Luz":"saint_jean_luz","Hendaye":"saint_jean_luz",
  "La Rochelle":"la_rochelle","Bordeaux":"bordeaux",
  "Saint-Malo":"saint_malo","Vannes":"vannes_morbihan",
  "Deauville":"deauville","Honfleur":"deauville","Trouville-sur-Mer":"deauville",
  "Lyon":"lyon","Strasbourg":"strasbourg",
  "Nantes":"nantes","Rennes":"rennes","Lille":"lille",
};

export default function Page() {
  const [tab, setTab] = useState("estim");
  const [estValue, setEstValue] = useState(0);
  const [estCity, setEstCity] = useState(null); // city name from geocoder
  const [travauxCost, setTravauxCost] = useState(0); // cout net des travaux -> Rentabilite

  // ---- auth / premium ----
  const [user, setUser] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [loadProject, setLoadProject] = useState(null); // estimation a charger
  const [estimData, setEstimData] = useState(null);     // {form,res,geo} courant
  const [travauxData, setTravauxData] = useState(null); // etat courant onglet Travaux
  const [rentaData, setRentaData] = useState(null);     // etat courant onglet Rentabilite
  const [loadTravaux, setLoadTravaux] = useState(null); // travaux a restaurer
  const [loadRenta, setLoadRenta] = useState(null);     // renta a restaurer
  const [saveMsg, setSaveMsg] = useState("");

  function openProject(p) {
    const d = p.data || {};
    const estim = d.estim || d; // nouveau format imbrique OU ancien format plat
    setLoadProject(estim || null);
    if (d.type === "projet") { setLoadTravaux(d.travaux || null); setLoadRenta(d.renta || null); }
    setTab("estim");
  }

  async function saveBien() {
    if (!supabase || !user || !estimData || !estimData.res) return;
    const nom = window.prompt("Nom du bien :", (estimData.res.location && estimData.res.location.area) || "Mon bien");
    if (!nom) return;
    const { error } = await supabase.from("projects").insert({ user_id: user.id, nom, data: { type: "bien", estim: estimData } });
    setSaveMsg(error ? "Erreur : " + error.message : "✓ Bien sauvegarde dans « Mes projets »");
    setTimeout(() => setSaveMsg(""), 4000);
  }

  async function saveProjetComplet() {
    if (!supabase || !user) return;
    if (!estimData || !estimData.res) { setSaveMsg("Fais d'abord une estimation."); setTimeout(() => setSaveMsg(""), 3000); return; }
    const nom = window.prompt("Nom du projet complet :", (estimData.res.location && estimData.res.location.area) || "Mon projet");
    if (!nom) return;
    const { error } = await supabase.from("projects").insert({
      user_id: user.id, nom,
      data: { type: "projet", estim: estimData, travaux: travauxData, renta: rentaData },
    });
    setSaveMsg(error ? "Erreur : " + error.message : "✓ Projet complet sauvegarde");
    setTimeout(() => setSaveMsg(""), 4000);
  }

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user || null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !user) { setIsPremium(false); return; }
    // Comptes proprietaire : premium automatique (acces complet)
    if (ADMIN_EMAILS.includes((user.email || "").toLowerCase())) { setIsPremium(true); return; }
    supabase.from("profiles").select("is_premium").eq("id", user.id).single()
      .then(({ data }) => setIsPremium(!!data?.is_premium));
  }, [user]);

  async function logout() { if (supabase) await supabase.auth.signOut(); }

  const PREMIUM_TABS = ["travaux", "renta", "capacite"];
  const locked = PREMIUM_TABS.includes(tab) && !isPremium;

  function handleEstimate(val, city) {
    setEstValue(val);
    if (city) setEstCity(city);
  }

  return (
    <>
      <div className="authbar">
        {saveMsg && <span className="save-msg">{saveMsg}</span>}
        {user ? (
          <>
            {isPremium && estimData && estimData.res && (
              <button className="auth-btn" onClick={saveProjetComplet}>💾 Sauver le projet complet</button>
            )}
            <span className={"auth-badge" + (isPremium ? " premium" : "")}>{isPremium ? "★ Premium" : "Gratuit"}</span>
            <span className="auth-email">{user.email}</span>
            <button className="auth-btn" onClick={logout}>Deconnexion</button>
          </>
        ) : (
          <button className="auth-btn primary" onClick={() => setAuthOpen(true)}>Se connecter</button>
        )}
      </div>

      <header className="top">
        <h1>Estim<span>Immo</span></h1>
        <p>Estimation par transactions reelles (DVF) &amp; analyse de rentabilite</p>
      </header>

      <div className="wrap">
        <div className="tabs">
          <button className={"tab" + (tab === "estim" ? " active" : "")} onClick={() => setTab("estim")}>
            1. Estimation
          </button>
          <button className={"tab" + (tab === "travaux" ? " active" : "")} onClick={() => setTab("travaux")}>
            2. Travaux{!isPremium ? " 🔒" : ""}
          </button>
          <button className={"tab" + (tab === "renta" ? " active" : "")} onClick={() => setTab("renta")}>
            3. Rentabilite{!isPremium ? " 🔒" : ""}
          </button>
          <button className={"tab" + (tab === "capacite" ? " active" : "")} onClick={() => setTab("capacite")}>
            4. Capacite d'emprunt{!isPremium ? " 🔒" : ""}
          </button>
          <button className={"tab" + (tab === "sources" ? " active" : "")} onClick={() => setTab("sources")}>
            5. Sources &amp; Données
          </button>
          {user && (
            <button className={"tab" + (tab === "projets" ? " active" : "")} onClick={() => setTab("projets")}>
              📁 Mes projets{!isPremium ? " 🔒" : ""}
            </button>
          )}
        </div>

        {tab === "estim" && <Estimation onEstimate={handleEstimate} onGoToCapacite={() => setTab("capacite")} user={user} initialProject={loadProject} onLoaded={() => setLoadProject(null)} onEstimData={setEstimData} onSaveBien={saveBien} />}
        {tab === "sources" && <Sources />}
        {locked || (tab === "projets" && !isPremium) ? (
          <Paywall isLoggedIn={!!user} onLogin={() => setAuthOpen(true)} />
        ) : (
          <>
            {tab === "travaux" && <SimulateurTravaux estValue={estValue} onTravaux={setTravauxCost} onGoToRenta={() => setTab("renta")} initialData={loadTravaux} onData={setTravauxData} onLoaded={() => setLoadTravaux(null)} />}
            {tab === "renta" && <Rentabilite estValue={estValue} estCity={CITY_TO_AIRBNB[estCity] || null} estCityRaw={estCity} travauxCost={travauxCost} initialData={loadRenta} onData={setRentaData} onLoaded={() => setLoadRenta(null)} />}
            {tab === "capacite" && <CapaciteEmprunt estValue={estValue} />}
            {tab === "projets" && <MesProjets user={user} onOpen={openProject} />}
          </>
        )}
        {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

        <button className="btn-print" onClick={() => window.print()}>
          ⬇ Télécharger / Imprimer PDF
        </button>
      </div>

      <footer>
        EstimImmo &middot; Donnees : DVF (DGFiP/Etalab), IGN, ADEME, INSEE. Estimation indicative, ne constitue pas une expertise.
      </footer>
    </>
  );
}

/* ======================= CAPACITE D'EMPRUNT ================================ */
function CapaciteEmprunt({ estValue }) {
  const [f, setF] = useState({
    income: 3800,          // revenus nets mensuels du foyer
    charges: 0,            // mensualites de credits en cours
    apport: 40000,
    duration: 20,
    rate: 3.4,
    insurance: 0.34,
    endettement: 35,       // taux d'endettement max (HCSF)
    notaryRate: 0.075,
  });
  const set = (k, val) => setF((s) => ({ ...s, [k]: val }));
  const v = (k) => Number(f[k]) || 0;

  // Taux officiel auto-actualise (Banque de France / BCE), recupere au chargement
  const [liveTaux, setLiveTaux] = useState(null);
  useEffect(() => {
    let on = true;
    fetch("/api/taux")
      .then((r) => r.json())
      .then((d) => { if (on && d && d.rate != null) setLiveTaux(d); })
      .catch(() => {});
    return () => { on = false; };
  }, []);
  const moisFr = (p) => {
    if (!p) return "";
    const [y, m] = p.split("-");
    const noms = ["", "janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
    return `${noms[parseInt(m)]} ${y}`;
  };

  // Mensualite max selon la regle HCSF (assurance comprise)
  const maxMensualite = Math.max(0, v("income") * (v("endettement") / 100) - v("charges"));

  const r = v("rate") / 100 / 12;
  const n = v("duration") * 12;
  const annuity = r > 0 ? r / (1 - Math.pow(1 + r, -n)) : 1 / n; // mensualite par EUR emprunte
  const insMonthly = v("insurance") / 100 / 12;                  // assurance par EUR emprunte

  // mensualite = loan*annuity (capital+interets) + loan*insMonthly (assurance)
  const loan = maxMensualite > 0 ? maxMensualite / (annuity + insMonthly) : 0;
  const mInsurance = loan * insMonthly;
  const mCapitalInterest = loan * annuity;
  const budget = loan + v("apport");
  const maxPrice = budget / (1 + v("notaryRate")); // prix du bien, frais de notaire deduits
  const notaire = maxPrice * v("notaryRate");
  const totalInterest = mCapitalInterest * n - loan;

  let verdict = null, vClass = "";
  if (estValue > 0 && loan > 0) {
    if (maxPrice >= estValue) { verdict = `Le bien estime (${euro(estValue)}) est DANS votre budget. Marge : ${euro(maxPrice - estValue)}.`; vClass = "g"; }
    else { verdict = `Le bien estime (${euro(estValue)}) depasse votre budget de ${euro(estValue - maxPrice)}. Augmentez l'apport, la duree ou les revenus.`; vClass = "w"; }
  }

  return (
    <>
    <div className="grid">
      {/* inputs */}
      <div>
        <div className="card">
          <h2>Vos revenus</h2>
          <div className="sub">Revenus nets du foyer (avant impot), tous emprunteurs confondus</div>
          <div className="row">
            <div>
              <label>Revenus nets mensuels</label>
              <div className="unit"><input type="number" value={f.income} onChange={(e) => set("income", e.target.value)} /><small>EUR</small></div>
            </div>
            <div>
              <label>Credits en cours / mois</label>
              <div className="unit"><input type="number" value={f.charges} onChange={(e) => set("charges", e.target.value)} /><small>EUR</small></div>
            </div>
          </div>
          <label>Taux d'endettement maximal</label>
          <select value={f.endettement} onChange={(e) => set("endettement", e.target.value)}>
            <option value="35">35 % (plafond HCSF standard)</option>
            <option value="33">33 % (prudent)</option>
            <option value="40">40 % (revenus eleves / derogation)</option>
          </select>
          <p className="hint">Regle HCSF : la mensualite totale (assurance comprise) ne doit pas depasser ce taux de vos revenus.</p>
        </div>

        <div className="card">
          <h2>Conditions du pret</h2>
          <div className="row">
            <div>
              <label>Apport personnel</label>
              <div className="unit"><input type="number" value={f.apport} onChange={(e) => set("apport", e.target.value)} /><small>EUR</small></div>
            </div>
            <div>
              <label>Duree</label>
              <div className="unit"><input type="number" value={f.duration} onChange={(e) => set("duration", e.target.value)} /><small>ans</small></div>
            </div>
          </div>
          <div className="row">
            <div>
              <label>Taux d'interet</label>
              <div className="unit"><input type="number" step="0.01" value={f.rate} onChange={(e) => set("rate", e.target.value)} /><small>%</small></div>
            </div>
            <div>
              <label>Assurance emprunteur</label>
              <div className="unit"><input type="number" step="0.01" value={f.insurance} onChange={(e) => set("insurance", e.target.value)} /><small>%/an</small></div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Taux du marche <span className={"taux-trend " + TAUX_MARCHE.trend}>{TAUX_MARCHE.trend === "hausse" ? "▲ en hausse" : TAUX_MARCHE.trend === "baisse" ? "▼ en baisse" : "= stable"}</span></h2>
          <div className="sub">Taux moyens constates &middot; {TAUX_MARCHE.date}</div>

          {liveTaux && (
            <div className="taux-live">
              <div className="taux-live-dot" />
              <div>
                <b>Taux officiel : {liveTaux.rate.toFixed(2).replace(".", ",")}%</b>
                <span> &middot; {moisFr(liveTaux.period)} &middot; auto-actualise (BdF/BCE)</span>
              </div>
              <button className="taux-live-apply" onClick={() => set("rate", liveTaux.rate)}>Appliquer</button>
            </div>
          )}
          <div className="taux-grid">
            {[15, 20, 25].map((d) => {
              const active = rateForDuration(v("duration")).key === d;
              return (
                <div className={"taux-cell" + (active ? " active" : "")} key={d}>
                  <div className="taux-dur">{d} ans</div>
                  <div className="taux-val">{TAUX_MARCHE.rates[d].toFixed(2).replace(".", ",")}%</div>
                  <div className="taux-best">top profils {TAUX_MARCHE.best[d].toFixed(2).replace(".", ",")}%</div>
                </div>
              );
            })}
          </div>
          <button className="btn-budget" style={{ marginTop: 14 }} onClick={() => set("rate", rateForDuration(v("duration")).rate)}>
            Appliquer le taux marche ({rateForDuration(v("duration")).rate.toFixed(2).replace(".", ",")}% sur {rateForDuration(v("duration")).key} ans)
          </button>
          <p className="hint">{TAUX_MARCHE.trendNote} Source : {TAUX_MARCHE.source}. Barometre indicatif, mis a jour periodiquement.</p>
        </div>
      </div>

      {/* results */}
      <div>
        <div className="card">
          <h2>Votre capacite</h2>
          <div className="sub">Mise a jour en temps reel</div>

          <div className="hero">
            <div className="lbl">Capacite d'emprunt</div>
            <div className="val">{euro(loan)}</div>
            <div className="range">Budget total avec apport : {euro(budget)}</div>
          </div>

          <div className="kpis">
            <div className="kpi"><div className="k">Mensualite max</div><div className="v">{euro0(maxMensualite)} EUR</div></div>
            <div className="kpi"><div className="k">Prix de bien max</div><div className="v g">{euro0(maxPrice)} EUR</div></div>
            <div className="kpi"><div className="k">Apport</div><div className="v">{euro0(v("apport"))} EUR</div></div>
          </div>

          <div className="section-t">Detail</div>
          <div className="line-items">
            <div className="li"><span className="lbl">Mensualite maximale (assurance comprise)</span><span>{euro(maxMensualite)}</span></div>
            <div className="li"><span className="lbl">dont assurance emprunteur</span><span className="neg">{euro(mInsurance)}</span></div>
            <div className="li"><span className="lbl">dont capital + interets</span><span>{euro(mCapitalInterest)}</span></div>
            <div className="li total"><span>Capacite d'emprunt</span><span className="v">{euro(loan)}</span></div>
            <div className="li"><span className="lbl">+ Apport</span><span className="pos">+ {euro(v("apport"))}</span></div>
            <div className="li"><span className="lbl">Budget total</span><span>{euro(budget)}</span></div>
            <div className="li"><span className="lbl">- Frais de notaire ({(v("notaryRate") * 100).toFixed(1).replace(".", ",")}%)</span><span className="neg">- {euro(notaire)}</span></div>
            <div className="li total"><span>Prix de bien maximal</span><span className="v">{euro(maxPrice)}</span></div>
            <div className="li"><span className="lbl">Cout total des interets ({v("duration")} ans)</span><span className="neg">{euro(totalInterest)}</span></div>
          </div>

          {verdict && <div className={"badge " + vClass}>{verdict}</div>}
          <p className="hint" style={{ marginTop: 10 }}>Estimation indicative. Les banques tiennent aussi compte du reste a vivre, du saut de charge, de la stabilite professionnelle et du profil global. Duree de pret en general limitee a 25 ans.</p>
        </div>
      </div>
    </div>
    <NegoTips />
    </>
  );
}

/* ======================= CONSEILS NEGOCIATION PRET ======================== */
const NEGO_STEPS = [
  { n: 1, t: "Prepare ton dossier (2-3 mois avant)", d: "Apport pret, 3 mois de comptes sans decouvert, petits credits soldes. Un dossier propre = un meilleur taux." },
  { n: 2, t: "Mets les banques en concurrence", d: "Vois un courtier (gratuit, paye seulement si ca marche) ET 2-3 banques toi-meme. But : plusieurs offres ecrites." },
  { n: 3, t: "Compare le bon chiffre : le TAEG", d: "Jamais le 'taux' affiche seul. Le TAEG inclut TOUT (interets + assurance + frais). C'est le seul vrai cout." },
  { n: 4, t: "Negocie les 3 gros postes", d: "L'assurance (le plus gros levier), les penalites de remboursement anticipe (IRA), et les frais de dossier." },
  { n: 5, t: "Prends ton temps", d: "Tu as 10 jours de reflexion obligatoires. Ne signe JAMAIS sous pression. Relis chaque ligne." },
];

const NEGO_TIPS = [
  {
    icon: "🛡️", titre: "L'assurance emprunteur", sous: "le plus gros levier", impact: "jusqu'a 15 000 EUR",
    tips: [
      "C'est 25 a 35% du cout total du credit. La banque te vend la sienne, mais tu n'es PAS oblige de la prendre.",
      "Loi Lemoine : tu peux la changer A TOUT MOMENT, sans frais. Prends un devis externe (delegation) et compare.",
      "Compare le TAEA (le cout de l'assurance), a garanties equivalentes.",
    ],
    dire: "Je prends une delegation d'assurance, voici mon devis externe a X EUR/mois. Merci d'en tenir compte.",
  },
  {
    icon: "🏦", titre: "Mettre en concurrence", sous: "ton vrai pouvoir", impact: "0,2 a 0,5 pt de taux",
    tips: [
      "Une banque baisse son taux quand elle sait que tu en vois d'autres. Sans concurrence, tu paies le prix fort.",
      "Le courtier interroge des dizaines de banques pour toi ; ses frais sont souvent couverts par les economies.",
    ],
    dire: "J'ai une offre concurrente a X%. Pouvez-vous faire mieux ? Sinon je signe ailleurs.",
  },
  {
    icon: "🔓", titre: "Faire sauter les penalites (IRA)", sous: "clause cle", impact: "jusqu'a 3% du capital",
    tips: [
      "Les IRA = penalites si tu rembourses ton pret en avance (revente, rachat). Plafond : 6 mois d'interets ou 3% du capital restant.",
      "Elles se negocient a la baisse, voire a zero, AVANT de signer. Apres, c'est trop tard.",
    ],
    dire: "Je veux que les indemnites de remboursement anticipe soient supprimees dans le contrat.",
  },
  {
    icon: "💸", titre: "Reduire les frais", sous: "souvent offerts", impact: "300 a 1500 EUR",
    tips: [
      "Frais de dossier : negociables, voire offerts. Demande-le systematiquement.",
      "Garantie : la caution (Credit Logement) est souvent moins chere que l'hypotheque ET partiellement remboursee a la fin.",
      "Refuse les produits 'imposes' inutiles (carte premium...) sauf vraie contrepartie sur le taux.",
    ],
    dire: "Pouvez-vous offrir les frais de dossier ?",
  },
  {
    icon: "🔧", titre: "Demander de la flexibilite", sous: "gratuit a demander", impact: "securite",
    tips: [
      "Modularite : pouvoir augmenter ou baisser tes mensualites (souvent +/-30%) selon tes revenus.",
      "Report d'echeances : suspendre 1 a 12 mensualites en cas de coup dur.",
      "Ces clauses ne coutent rien mais te protegent. Demande-les des le depart.",
    ],
  },
  {
    icon: "🎁", titre: "Les prets aides", sous: "a cumuler", impact: "argent gratuit",
    tips: [
      "PTZ : pret a taux zero pour un 1er achat, sous conditions de ressources.",
      "Pret Action Logement (1% patronal) : taux tres bas si ton employeur cotise.",
      "PEL/CEL et prets regionaux : verifie tes droits, ils se cumulent.",
    ],
  },
];

const NEGO_GLOSSAIRE = [
  ["TAEG", "Le cout TOTAL du credit en % (interets + assurance + frais + garantie). LE chiffre a comparer entre banques."],
  ["Taux nominal", "Le taux 'affiche', SANS l'assurance ni les frais. Trompeur si on le compare seul."],
  ["TAEA", "La part du cout liee a l'assurance. Sert a comparer les assurances entre elles."],
  ["Delegation d'assurance", "Prendre son assurance emprunteur ailleurs qu'a la banque (souvent bien moins chere)."],
  ["IRA", "Indemnites de Remboursement Anticipe : penalites si tu soldes le pret en avance. A negocier a zero."],
  ["Caution vs hypotheque", "Deux types de garantie. La caution (Credit Logement) est souvent moins chere et partiellement remboursee."],
  ["Apport", "L'argent que tu mets toi-meme. Plus il est eleve, meilleur le taux. Vise 10% minimum."],
  ["Taux d'endettement", "Part de tes revenus qui part dans les credits. Plafond 35% (assurance comprise)."],
];

// Explications detaillees qui s'ouvrent au clic (accordeon, sans redirection)
const NEGO_DETAILS = [
  { icon: "🎁", titre: "Le PTZ (Pret a Taux Zero)", paras: [
    "Le PTZ est un pret SANS interets ni frais, accorde par l'Etat pour aider a acheter sa premiere residence principale. Tu rembourses uniquement le capital : 40 000 EUR de PTZ = 40 000 EUR a rendre, zero interet.",
    "Pour qui ? Les 'primo-accedants' : ne pas avoir ete proprietaire de sa residence principale durant les 2 dernieres annees. Avec des plafonds de revenus selon la zone et la taille du foyer.",
    "Combien ? Jusqu'a 50% du prix dans le neuf (depuis 2025 le PTZ est elargi a toute la France pour le neuf). Dans l'ancien, surtout en zones detendues avec gros travaux.",
    "L'atout : le 'differe' de remboursement. Tu peux ne RIEN payer sur le PTZ pendant 5 a 15 ans, puis commencer ensuite — ca allege fortement les premieres annees.",
    "Il se CUMULE avec ton pret principal : il reduit la somme empruntee au taux normal, donc ton cout total.",
  ]},
  { icon: "🛡️", titre: "La delegation d'assurance & la loi Lemoine", paras: [
    "La banque exige une assurance qui rembourse le pret en cas de deces ou d'incapacite. Elle te propose la sienne, mais tu as le DROIT d'en prendre une ailleurs : la 'delegation'.",
    "Une assurance externe est souvent 2 a 3 fois moins chere a garanties egales, surtout si tu es jeune et en bonne sante : 5 000 a 15 000 EUR d'economie sur la duree.",
    "Loi Lemoine (2022) : tu peux changer d'assurance A TOUT MOMENT, gratuitement — meme apres la signature. Aucune excuse pour rester sur une offre chere.",
    "Compare le TAEA et verifie que les garanties (deces, invalidite, incapacite) sont equivalentes a celles demandees par la banque.",
  ]},
  { icon: "🔓", titre: "Les IRA (penalites de remboursement anticipe)", paras: [
    "Si tu rembourses ton pret en avance (revente, rentree d'argent, rachat par une autre banque), la banque peut te facturer des penalites : les IRA.",
    "Elles sont plafonnees par la loi : maximum 6 mois d'interets OU 3% du capital restant du (le plus petit des deux). Sur un gros pret, ca peut chiffrer en milliers d'euros.",
    "Bonne nouvelle : elles se negocient a la baisse, voire a ZERO, mais uniquement AVANT de signer. Demande leur suppression dans l'offre. Apres signature, c'est fige.",
  ]},
  { icon: "⚖️", titre: "Caution ou hypotheque : la garantie", paras: [
    "La banque veut une garantie au cas ou tu ne rembourses plus. Deux options principales : la caution ou l'hypotheque.",
    "La caution (ex : Credit Logement) : un organisme se porte garant. Souvent moins chere, plus rapide, et une partie est REMBOURSEE a la fin du pret si tout s'est bien passe.",
    "L'hypotheque (ou PPD) : ton bien est mis en garantie. Frais notaires en plus, et des frais de mainlevee si tu revends avant la fin. Generalement plus couteuse.",
    "Pour la plupart des dossiers, la caution est preferable. Demande-la.",
  ]},
  { icon: "🧭", titre: "Le courtier : a quoi il sert vraiment", paras: [
    "Un courtier est un intermediaire qui presente ton dossier a des dizaines de banques et negocie le taux, l'assurance et les frais a ta place.",
    "Il est en general paye uniquement SI le pret aboutit (honoraires ~1% du montant ou forfait 990-1500 EUR). Souvent, l'economie qu'il obtient depasse ses frais.",
    "Avantage : gain de temps + acces a des taux 'negocies' que tu n'aurais pas seul. Tu peux aussi le mettre en concurrence avec ta propre banque.",
  ]},
];

// Location classique (longue duree) : le locataire habite le logement a l'annee
const NEGO_FISC_CLASSIQUE = [
  { icon: "🔑", titre: "Nu — Micro-foncier (abattement 30%)", paras: [
    "Location VIDE (non meublee). Abattement forfaitaire de 30% : tu es impose sur 70% des loyers (TMI + 17,2% de prelevements sociaux).",
    "Pour qui : loyers nus < 15 000 EUR/an et peu de charges. Tres simple, aucune comptabilite.",
  ]},
  { icon: "🧱", titre: "Nu — Reel (charges + deficit foncier)", paras: [
    "Tu deduis tes charges reelles et tes interets d'emprunt. Si le total depasse les loyers, tu crees un 'deficit foncier'.",
    "Ce deficit s'impute sur ton REVENU GLOBAL (salaire) jusqu'a 10 700 EUR/an, reduisant ton impot ; le surplus se reporte 10 ans.",
    "Ideal si gros travaux ou beaucoup d'interets. En nu, PAS d'amortissement (contrairement au meuble).",
  ]},
  { icon: "🛋️", titre: "Meuble longue duree — Micro-BIC (50%)", paras: [
    "Location MEUBLEE a l'annee (bail 1 an, ou 9 mois etudiant). Abattement de 50% : tu n'es impose que sur la MOITIE des loyers.",
    "Plafond : 77 700 EUR (revenus 2025) puis 83 600 EUR (revenus 2026). Au-dela, passage au reel.",
    "Simple, mais avec un credit le LMNP reel est presque toujours plus avantageux.",
  ]},
  { icon: "🏆", titre: "Meuble longue duree — LMNP reel", paras: [
    "Deduction de TOUTES les charges reelles (interets, taxe fonciere, charges, travaux, comptable) + AMORTISSEMENT du bien (~2-3%/an, une charge 'sur papier').",
    "Resultat : l'impot sur les loyers tombe souvent a ZERO pendant 8 a 12 ans. Le regime roi des investisseurs meubles avec credit.",
    "Contrepartie : un comptable (~300-500 EUR/an, deductible). Nuance 2025 : les amortissements deduits sont desormais reintegres dans le calcul de la plus-value a la revente.",
  ]},
];

// Location courte duree / Airbnb (meuble de tourisme) — fiscalite durcie par la loi Le Meur
const NEGO_FISC_TOURISME = [
  { icon: "🏖️", titre: "Tourisme NON classe — Micro-BIC 30%", paras: [
    "Airbnb / courte duree NON classe. La loi Le Meur (2024) a fait TOMBER l'abattement de 50% a 30%, et le plafond de 77 700 EUR a seulement 15 000 EUR/an.",
    "C'est la grosse perte fiscale de 2025 : le tourisme non classe est desormais aligne sur la location nue. Au-dela de 15 000 EUR, tu bascules automatiquement au reel.",
  ]},
  { icon: "⭐", titre: "Tourisme CLASSE — Micro-BIC 50%", paras: [
    "Si tu fais CLASSER ton meuble de tourisme (1 a 5 etoiles, via un organisme agree / Atout France), l'abattement reste a 50%, plafond 77 700 EUR.",
    "Le classement coute peu (~150-300 EUR, valable 5 ans) et quasiment DOUBLE ton abattement vs non classe. Quasi indispensable si tu restes au micro.",
  ]},
  { icon: "🏆", titre: "Tourisme — LMNP reel (amortissement)", paras: [
    "Comme en meuble classique : deduction des charges + amortissement du bien -> impot souvent nul. Souvent le meilleur choix des que les recettes montent.",
    "Meme nuance qu'en LMNP : reintegration des amortissements dans la plus-value depuis 2025. Comptable recommande.",
  ]},
  { icon: "⚠️", titre: "Les regles Airbnb a respecter (non fiscal, mais crucial)", paras: [
    "Numero d'enregistrement en mairie : desormais generalise par la loi Le Meur.",
    "Grandes villes : autorisation de changement d'usage souvent exigee pour un logement entier dedie a la courte duree.",
    "Ta RESIDENCE PRINCIPALE : location courte duree limitee a 120 nuits/an (parfois 90 selon la ville).",
    "DPE obligatoire : interdiction progressive des passoires thermiques en meuble de tourisme.",
  ]},
];

const NEGO_FISC_CHOIX = {
  icon: "🤔", titre: "Location classique ou Airbnb ? Comment choisir", paras: [
    "Airbnb rapporte souvent 2 a 3x plus de loyer qu'une location classique... mais beaucoup plus de gestion, de rotation, de reglementation, et une fiscalite durcie (loi Le Meur).",
    "Classique = revenus stables, peu de gestion, moins de contraintes. Airbnb = rendement max mais chronophage et tres regule.",
    "Cote fiscal au micro : la location meublee classique (50%) bat desormais le tourisme NON classe (30%). Se faire CLASSER ou passer au REEL remet le tourisme devant.",
    "L'onglet Rentabilite a un mode Airbnb (revenus saisonniers) et un comparateur qui calcule l'impot des regimes sur ton bien reel.",
  ],
};

function Explainer({ icon, titre, paras }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={"explain" + (open ? " open" : "")}>
      <button className="explain-head" onClick={() => setOpen((o) => !o)}>
        <span className="explain-ico">{icon}</span>
        <span className="explain-title">{titre}</span>
        <span className="explain-chevron">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="explain-body">
          {paras.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      )}
    </div>
  );
}

function NegoTips() {
  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h2>💡 Negocier son pret immobilier : le guide complet</h2>
      <div className="sub">Meme si tu n'y connais rien : comprends, prepare, et obtiens le meilleur credit.</div>

      <div className="nego-mindset">
        <b>La regle d'or :</b> la 1re offre d'une banque n'est qu'un point de depart. <b>Tout se negocie</b> &mdash; le taux, l'assurance, les frais, les clauses. Ton vrai pouvoir : faire jouer plusieurs banques. Ne sois jamais presse de signer.
      </div>

      <div className="section-t">Le parcours en 5 etapes</div>
      <div className="nego-steps">
        {NEGO_STEPS.map((s) => (
          <div className="nego-step" key={s.n}>
            <div className="nego-step-n">{s.n}</div>
            <div><div className="nego-step-t">{s.t}</div><div className="nego-step-d">{s.d}</div></div>
          </div>
        ))}
      </div>

      <div className="section-t">Les leviers, du plus rentable au moins</div>
      <div className="nego-grid">
        {NEGO_TIPS.map((b, i) => (
          <div className="nego-block" key={i}>
            <div className="nego-block-head">
              <span className="nego-ico">{b.icon}</span>
              <span className="nego-titre">{b.titre}<span className="nego-sous">{b.sous}</span></span>
              <span className="nego-impact">{b.impact}</span>
            </div>
            <ul className="nego-list">{b.tips.map((t, j) => <li key={j}>{t}</li>)}</ul>
            {b.dire && <div className="nego-dire"><span>💬 A dire au banquier</span>&laquo; {b.dire} &raquo;</div>}
          </div>
        ))}
      </div>

      <div className="section-t">Le lexique (les mots compliques, en simple)</div>
      <div className="nego-glossaire">
        {NEGO_GLOSSAIRE.map(([term, def], i) => (
          <div className="nego-gl" key={i}><b>{term}</b><span>{def}</span></div>
        ))}
      </div>

      <div className="section-t">Comprendre en detail (clique pour ouvrir)</div>
      <div className="explain-list">
        {NEGO_DETAILS.map((d, i) => <Explainer key={i} {...d} />)}
      </div>

      <div className="section-t">🧾 Quel regime fiscal locatif choisir ? (clique pour ouvrir)</div>
      <div className="fisc-sub">🏠 Location classique (longue duree)</div>
      <div className="explain-list">
        {NEGO_FISC_CLASSIQUE.map((d, i) => <Explainer key={i} {...d} />)}
      </div>
      <div className="fisc-sub" style={{ marginTop: 14 }}>🏖️ Location courte duree / Airbnb (meuble de tourisme)</div>
      <div className="explain-list">
        {NEGO_FISC_TOURISME.map((d, i) => <Explainer key={i} {...d} />)}
      </div>
      <div className="explain-list" style={{ marginTop: 14 }}>
        <Explainer {...NEGO_FISC_CHOIX} />
      </div>

      <p className="hint" style={{ marginTop: 14 }}>Conseils generaux a adapter a ta situation (regles applicables aux revenus 2025/2026). Un comptable est vivement recommande pour le regime reel et l'Airbnb.</p>
    </div>
  );
}

/* ======================= AMORTISSEMENT ===================================== */
function buildAmortization(loan, annualRate, durationYears, mInsurance) {
  const n = durationYears * 12;
  const r = annualRate / 100 / 12;
  const mPayment = r > 0 ? loan * r / (1 - Math.pow(1 + r, -n)) : loan / n;
  const rows = [];
  let balance = loan;
  for (let m = 1; m <= n; m++) {
    const interest = balance * r;
    const principal = mPayment - interest;
    balance = Math.max(0, balance - principal);
    rows.push({ m, year: Math.ceil(m / 12), interest, principal, insurance: mInsurance, payment: mPayment + mInsurance, balance });
  }
  return rows;
}

function TableauAmortissement({ loan, rate, duration, mInsurance }) {
  const [view, setView] = useState("annual"); // "annual" | "monthly"
  const [open, setOpen] = useState(false);

  if (loan <= 0) return null;

  const rows = buildAmortization(loan, rate, duration, mInsurance);

  // aggregate by year
  const years = [];
  for (let y = 1; y <= duration; y++) {
    const yRows = rows.filter((r) => r.year === y);
    const last = yRows[yRows.length - 1];
    years.push({
      year: y,
      totalPayment: yRows.reduce((s, r) => s + r.payment, 0),
      totalInterest: yRows.reduce((s, r) => s + r.interest, 0),
      totalPrincipal: yRows.reduce((s, r) => s + r.principal, 0),
      totalInsurance: yRows.reduce((s, r) => s + r.insurance, 0),
      balance: last.balance,
    });
  }

  const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
  const totalInsurance = rows.reduce((s, r) => s + r.insurance, 0);
  const totalCost = rows.reduce((s, r) => s + r.payment, 0);

  return (
    <div style={{ marginTop: 14 }}>
      <button className="amort-toggle" onClick={() => setOpen((o) => !o)}>
        📊 {open ? "Masquer le" : "Afficher le"} tableau d'amortissement
      </button>

      {open && (
        <div className="amort-wrap">
          <div className="amort-summary">
            <div className="amort-sum-item"><span>Capital emprunté</span><b>{euro(loan)}</b></div>
            <div className="amort-sum-item"><span>Total intérêts</span><b className="neg">{euro(Math.round(totalInterest))}</b></div>
            <div className="amort-sum-item"><span>Total assurance</span><b className="neg">{euro(Math.round(totalInsurance))}</b></div>
            <div className="amort-sum-item"><span>Coût total crédit</span><b>{euro(Math.round(totalCost))}</b></div>
          </div>

          <div className="amort-view-toggle">
            <button className={"avt" + (view === "annual" ? " avt-active" : "")} onClick={() => setView("annual")}>Par année</button>
            <button className={"avt" + (view === "monthly" ? " avt-active" : "")} onClick={() => setView("monthly")}>Par mois</button>
          </div>

          <div className="amort-scroll">
            <table className="amort-table">
              <thead>
                <tr>
                  <th>{view === "annual" ? "Année" : "Mois"}</th>
                  <th className="num">Mensualité</th>
                  <th className="num">Capital</th>
                  <th className="num">Intérêts</th>
                  <th className="num">Assurance</th>
                  <th className="num">Capital restant</th>
                  <th className="num">% remboursé</th>
                </tr>
              </thead>
              <tbody>
                {view === "annual" ? years.map((y) => {
                  const pctPaid = Math.round(((loan - y.balance) / loan) * 100);
                  return (
                    <tr key={y.year}>
                      <td><b>An {y.year}</b></td>
                      <td className="num">{euro0(Math.round(y.totalPayment / 12))}/m</td>
                      <td className="num pos">{euro0(Math.round(y.totalPrincipal))}</td>
                      <td className="num neg">{euro0(Math.round(y.totalInterest))}</td>
                      <td className="num neg">{euro0(Math.round(y.totalInsurance))}</td>
                      <td className="num"><b>{euro(Math.round(y.balance))}</b></td>
                      <td className="num">
                        <div className="amort-bar-wrap">
                          <div className="amort-bar-fill" style={{ width: pctPaid + "%" }} />
                          <span>{pctPaid} %</span>
                        </div>
                      </td>
                    </tr>
                  );
                }) : rows.map((r) => {
                  const pctPaid = Math.round(((loan - r.balance) / loan) * 100);
                  return (
                    <tr key={r.m} className={r.m % 12 === 0 ? "amort-year-end" : ""}>
                      <td>M{r.m}{r.m % 12 === 0 ? <b> ★ An {r.year}</b> : ""}</td>
                      <td className="num">{euro0(Math.round(r.payment))}</td>
                      <td className="num pos">{euro0(Math.round(r.principal))}</td>
                      <td className="num neg">{euro0(Math.round(r.interest))}</td>
                      <td className="num neg">{euro0(Math.round(r.insurance))}</td>
                      <td className="num">{euro(Math.round(r.balance))}</td>
                      <td className="num">
                        <div className="amort-bar-wrap">
                          <div className="amort-bar-fill" style={{ width: pctPaid + "%" }} />
                          <span>{pctPaid} %</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>Tableau indicatif — taux fixe, amortissement constant. Les mensualités réelles peuvent varier si taux révisable ou remboursement anticipé.</p>
        </div>
      )}
    </div>
  );
}

/* ======================= AUTH & PAYWALL =================================== */
function pwdStrength(p) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4);
}
function authErrorFr(msg) {
  const m = (msg || "").toLowerCase();
  if (m.includes("invalid login")) return "Email ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "Confirme ton email avant de te connecter (lien recu par mail).";
  if (m.includes("already registered") || m.includes("already been registered")) return "Un compte existe deja avec cet email. Connecte-toi.";
  if (m.includes("password should be")) return "Mot de passe trop court (8 caracteres minimum).";
  if (m.includes("unable to validate email")) return "Adresse email invalide.";
  if (m.includes("rate limit")) return "Trop de tentatives, reessaie dans quelques minutes.";
  return msg;
}

function AuthModal({ onClose }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const strength = pwdStrength(pwd);
  const strengthLabel = ["Trop faible", "Faible", "Moyen", "Bon", "Fort"][strength];
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const canSubmit = emailOk && (mode === "login" ? pwd.length > 0 : pwd.length >= 8);

  async function submit() {
    if (!supabase) { setError("Service d'authentification non configure."); return; }
    if (mode === "signup" && pwd.length < 8) { setError("Choisis un mot de passe d'au moins 8 caracteres."); return; }
    setLoading(true); setError(""); setInfo("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password: pwd });
        if (error) { setError(authErrorFr(error.message)); return; }
        setInfo("Compte cree ! Verifie ta boite mail pour confirmer, puis connecte-toi.");
        setMode("login"); setPwd("");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
        if (error) { setError(authErrorFr(error.message)); return; }
        onClose();
      }
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Fermer">&times;</button>
        <div className="auth-logo">Estim<span>Immo</span></div>
        <h2>{mode === "login" ? "Bon retour 👋" : "Cree ton compte"}</h2>
        <div className="sub">{mode === "login" ? "Connecte-toi pour retrouver tes analyses et projets." : "Gratuit : l'estimation. Premium : rentabilite, travaux, capacite et projets sauvegardes."}</div>

        <label>Email</label>
        <input type="email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} placeholder="toi@email.com" />

        <label>Mot de passe</label>
        <div className="pwd-wrap">
          <input type={showPwd ? "text" : "password"} value={pwd} autoComplete={mode === "login" ? "current-password" : "new-password"}
            onChange={(e) => setPwd(e.target.value)} placeholder={mode === "signup" ? "8 caracteres minimum" : "Ton mot de passe"}
            onKeyDown={(e) => e.key === "Enter" && canSubmit && submit()} />
          <button type="button" className="pwd-toggle" onClick={() => setShowPwd((s) => !s)} aria-label="Afficher / masquer">
            {showPwd ? "🙈" : "👁"}
          </button>
        </div>

        {mode === "signup" && pwd.length > 0 && (
          <div className="pwd-strength">
            <div className="pwd-bars">
              {[0, 1, 2, 3].map((i) => <span key={i} className={i < strength ? "on s" + strength : ""} />)}
            </div>
            <span className="pwd-label">{strengthLabel}</span>
          </div>
        )}

        {error && <div className="error">{error}</div>}
        {info && <div className="geo-ok" style={{ marginTop: 10 }}>{info}</div>}

        <button className="btn" onClick={submit} disabled={loading || !canSubmit}>
          {loading ? "..." : mode === "login" ? "Se connecter" : "Creer mon compte"}
        </button>

        <p className="hint" style={{ textAlign: "center", marginTop: 14 }}>
          {mode === "login" ? "Pas encore de compte ? " : "Deja un compte ? "}
          <a style={{ cursor: "pointer", fontWeight: 600 }} onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setInfo(""); }}>
            {mode === "login" ? "Creer un compte" : "Se connecter"}
          </a>
        </p>
        <p className="hint" style={{ textAlign: "center", fontSize: 11 }}>🔒 Connexion chiffree. Ton mot de passe est stocke de facon securisee (jamais en clair).</p>
      </div>
    </div>
  );
}

function Paywall({ isLoggedIn, onLogin }) {
  return (
    <div className="card paywall">
      <div className="paywall-ico">🔒</div>
      <h2>Fonctionnalite Premium</h2>
      <p className="paywall-txt">
        L'estimation est <b>gratuite</b>. Pour la <b>rentabilite</b>, les <b>travaux</b>, la <b>capacite d'emprunt</b> et la <b>sauvegarde de tes projets</b>, passe Premium.
      </p>
      <div className="paywall-price">7,90 EUR<span>/mois</span></div>
      <ul className="paywall-list">
        <li>Analyse de rentabilite complete (fiscalite, TRI, cashflow)</li>
        <li>Simulateur de travaux &amp; capacite d'emprunt</li>
        <li>Projets immobiliers illimites, sauvegardes</li>
      </ul>
      {isLoggedIn ? (
        <button className="btn" disabled title="Paiement bientot disponible">Passer Premium (bientot)</button>
      ) : (
        <button className="btn" onClick={onLogin}>Se connecter / creer un compte</button>
      )}
      <p className="hint" style={{ textAlign: "center", marginTop: 10 }}>Le paiement securise arrive tres bientot.</p>
    </div>
  );
}

/* ======================= MES PROJETS ===================================== */
function MesProjets({ user, onOpen }) {
  const [projects, setProjects] = useState(null);
  const [err, setErr] = useState("");

  async function load() {
    if (!supabase || !user) return;
    const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (error) setErr(error.message);
    else setProjects(data || []);
  }
  useEffect(() => { load(); }, [user]);

  async function del(id) {
    if (!window.confirm("Supprimer ce projet ?")) return;
    await supabase.from("projects").delete().eq("id", id);
    load();
  }

  const euroP = (n) => Math.round(n).toLocaleString("fr-FR") + " EUR";

  return (
    <div className="card projets-wrap">
      <h2>📁 Mes projets</h2>
      <div className="sub">Tes biens sauvegardes, prives et securises (visibles seulement par toi).</div>
      {err && <div className="error">{err}</div>}
      {projects === null && <div className="placeholder">Chargement...</div>}
      {projects && projects.length === 0 && (
        <div className="placeholder">Aucun projet pour l'instant.<br />Fais une estimation, puis clique « 💾 Sauvegarder ce bien ».</div>
      )}
      {projects && projects.length > 0 && (
        <div className="projets-list">
          {projects.map((p) => {
            const estim = (p.data && (p.data.estim || p.data)) || {};
            const est = estim.res && estim.res.estimate;
            const area = estim.res && estim.res.location && estim.res.location.area;
            const isProjet = p.data && p.data.type === "projet";
            return (
              <div className="projet-item" key={p.id}>
                <div className="projet-info">
                  <div className="projet-nom">{isProjet ? "📁 " : "🏠 "}{p.nom}</div>
                  <div className="projet-meta">
                    <span className={"projet-type " + (isProjet ? "t-projet" : "t-bien")}>{isProjet ? "Projet complet" : "Bien"}</span>
                    {area ? " · " + area : ""}{est ? " · " + euroP(est) : ""} · {new Date(p.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <div className="projet-actions">
                  <button className="btn-sm" onClick={() => onOpen(p)}>Ouvrir</button>
                  <button className="projet-del" onClick={() => del(p.id)} aria-label="Supprimer">🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ======================= TAB 1 : ESTIMATION ============================== */
function Estimation({ onEstimate, onGoToCapacite, user, initialProject, onLoaded, onEstimData, onSaveBien }) {
  const [form, setForm] = useState((initialProject && initialProject.form) || {
    address: "10 rue de la Paix, Paris",
    surface: 65,
    type: "Appartement",
    pieces: 3,
    floor: 3,
    elevator: true,
    condition: 1,
    dpe: "D",
    period: "1948-1974",
    balcony: false,
    parking: false,
    cave: false,
    vue: "standard",
    occupation: "libre",
    prixDemande: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState((initialProject && initialProject.res) || null);

  useEffect(() => {
    if (initialProject) {
      if (initialProject.res && onEstimate) onEstimate(initialProject.res.estimate, (initialProject.geo && initialProject.geo.city) || null);
      if (onLoaded) onLoaded();
    }
  }, []);

  // address autocomplete state
  const [sugg, setSugg] = useState([]);
  const [geo, setGeo] = useState((initialProject && initialProject.geo) || null);     // exact location once picked
  const [openSug, setOpenSug] = useState(false);
  const debRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // remonte l'etat courant vers la Page (pour la sauvegarde)
  useEffect(() => { if (onEstimData) onEstimData({ form, res, geo }); }, [form, res, geo]);

  function onAddressChange(val) {
    set("address", val);
    setGeo(null); // typing invalidates any previous selection
    if (debRef.current) clearTimeout(debRef.current);
    if (val.trim().length < 3) { setSugg([]); setOpenSug(false); return; }
    debRef.current = setTimeout(async () => {
      try {
        const r = await fetch("/api/geocode?q=" + encodeURIComponent(val));
        const d = await r.json();
        setSugg(d.results || []);
        setOpenSug((d.results || []).length > 0);
      } catch { setSugg([]); }
    }, 250);
  }

  function pick(s) {
    setForm((f) => ({ ...f, address: s.label }));
    setGeo(s);
    setSugg([]);
    setOpenSug(false);
  }

  async function run() {
    setLoading(true);
    setError("");
    setRes(null);
    try {
      const r = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          surface: Number(form.surface),
          floor: Number(form.floor),
          pieces: Number(form.pieces),
          condition: Number(form.condition),
          geo: geo
            ? { lat: geo.lat, lon: geo.lon, insee: geo.citycode, label: geo.label, area: geo.area, city: geo.city }
            : null,
        }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || "Erreur."); return; }
      setRes(data);
      onEstimate(data.estimate, geo?.city || null);
    } catch (e) {
      setError("Connexion impossible : " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid">
      {/* ---- inputs ---- */}
      <div>
        <div className="card">
          <h2>Le bien a estimer</h2>
          <div className="sub">Adresse precise = comparables plus proches</div>

          <label>Adresse complete</label>
          <div className="autocomplete">
            <input
              value={form.address}
              onChange={(e) => onAddressChange(e.target.value)}
              onFocus={() => { if (sugg.length) setOpenSug(true); }}
              onBlur={() => setTimeout(() => setOpenSug(false), 150)}
              placeholder="Tapez puis choisissez : 12 rue Victor Hugo, Lyon..."
              autoComplete="off"
            />
            {openSug && (
              <ul className="sug">
                {sugg.map((s, i) => (
                  <li key={i} onMouseDown={() => pick(s)}>
                    <span className="sug-l">{s.label}</span>
                    <span className="sug-c">{s.context}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {geo ? (
            <div className="geo-ok">✓ Localise : {geo.postcode} {geo.city}{geo.type !== "housenumber" ? " — precisez le numero pour plus de precision" : ""}</div>
          ) : (
            <div className="geo-warn">Choisissez une adresse dans la liste pour localiser precisement le bien.</div>
          )}

          <div className="row">
            <div>
              <label>Surface habitable</label>
              <div className="unit"><input type="number" value={form.surface}
                   onChange={(e) => set("surface", e.target.value)} /><small>m2</small></div>
            </div>
            <div>
              <label>Type de bien</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value)}>
                <option>Appartement</option>
                <option>Maison</option>
              </select>
            </div>
          </div>

          <div className="row">
            <div>
              <label>Nombre de pièces</label>
              <select value={form.pieces} onChange={(e) => set("pieces", e.target.value)}>
                <option value="1">T1 — Studio (1 pièce)</option>
                <option value="2">T2 — 2 pièces</option>
                <option value="3">T3 — 3 pièces</option>
                <option value="4">T4 — 4 pièces</option>
                <option value="5">T5 — 5 pièces</option>
                <option value="6">T6+ — 6 pièces et plus</option>
              </select>
            </div>
            <div>
              <label>Statut d'occupation</label>
              <select value={form.occupation} onChange={(e) => set("occupation", e.target.value)}>
                <option value="libre">Libre à la vente</option>
                <option value="bail_cours">Occupé — bail en cours (-15 %)</option>
                <option value="loi_1948">Occupé — loi 1948 / locataire protégé (-25 %)</option>
              </select>
            </div>
          </div>

          <div className="auto-detect-note">
            🤖 <b>Conjoncture locale</b> (Notaires de France) est détectée <b>automatiquement</b> selon l'adresse saisie.
          </div>

          <div className="row">
            <div>
              <label>Etage</label>
              <input type="number" value={form.floor} onChange={(e) => set("floor", e.target.value)} />
            </div>
            <div>
              <label>Ascenseur</label>
              <select value={form.elevator ? "1" : "0"} onChange={(e) => set("elevator", e.target.value === "1")}>
                <option value="1">Oui</option><option value="0">Non</option>
              </select>
            </div>
          </div>

          <div className="row">
            <div>
              <label>Etat / standing</label>
              <select value={form.condition} onChange={(e) => set("condition", e.target.value)}>
                <option value="1.10">Refait a neuf (+10%)</option>
                <option value="1">Bon etat</option>
                <option value="0.92">Travaux a prevoir (-8%)</option>
                <option value="0.82">Gros travaux (-18%)</option>
              </select>
            </div>
            <div>
              <label>DPE</label>
              <select value={form.dpe} onChange={(e) => set("dpe", e.target.value)}>
                {["A","B","C","D","E","F","G"].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="row">
            <div>
              <label>Periode de construction</label>
              <select value={form.period} onChange={(e) => set("period", e.target.value)}>
                <option>avant 1914</option>
                <option>1914-1947</option>
                <option>1948-1974</option>
                <option>1975-2000</option>
                <option>apres 2000</option>
              </select>
            </div>
            <div>
              <label>Exterieur</label>
              <select value={form.balcony ? "1" : "0"} onChange={(e) => set("balcony", e.target.value === "1")}>
                <option value="0">Sans balcon</option>
                <option value="1">Balcon / terrasse</option>
              </select>
            </div>
          </div>

          <div className="row">
            <div>
              <label>Cave</label>
              <select value={form.cave ? "1" : "0"} onChange={(e) => set("cave", e.target.value === "1")}>
                <option value="0">Sans cave</option>
                <option value="1">Avec cave (+1,5%)</option>
              </select>
            </div>
            <div>
              <label>Vue / vis-a-vis</label>
              <select value={form.vue} onChange={(e) => set("vue", e.target.value)}>
                <option value="exceptionnelle">Vue exceptionnelle (+8%)</option>
                <option value="degagee">Vue degagee (+4%)</option>
                <option value="standard">Standard</option>
                <option value="visavis">Vis-a-vis / sombre (-4%)</option>
              </select>
            </div>
          </div>

          <div className="row">
            <div>
              <label>Stationnement</label>
              <select value={form.parking ? "1" : "0"} onChange={(e) => set("parking", e.target.value === "1")}>
                <option value="0">Sans parking</option>
                <option value="1">Parking / box</option>
              </select>
            </div>
          </div>
          <label>Prix demandé par le vendeur <span style={{color:"#64748b",fontWeight:400}}>(optionnel — pour analyser la marge de négociation)</span></label>
          <div className="unit">
            <input type="number" value={form.prixDemande}
              onChange={(e) => set("prixDemande", e.target.value)}
              placeholder="ex: 320000" />
            <small>EUR</small>
          </div>

          <MarketBarometer />

          <button className="btn" onClick={run} disabled={loading}>
            {loading ? <><span className="spinner" />Analyse des transactions...</> : "Estimer avec les donnees reelles"}
          </button>
          {error && <div className="error">{error}</div>}
          <p className="hint">L'outil interroge les ventes officielles enregistrees (DVF) autour de l'adresse, puis ajuste selon les caracteristiques du bien.</p>
        </div>
      </div>

      {/* ---- results ---- */}
      <div>
        <div className="card">
          <h2>Resultat de l'estimation</h2>
          {!res && !loading && <div className="placeholder">Renseignez le bien puis lancez l'analyse.<br/>Les comparables reels s'afficheront ici.</div>}
          {loading && <div className="placeholder"><span className="spinner" style={{borderTopColor:'#3a7bd5',borderColor:'#e3e9f2'}}/><br/>Recuperation des transactions DVF...</div>}
          {res && <EstimResult res={res} surface={Number(form.surface)} prixDemande={Number(form.prixDemande) || 0} period={form.period} onGoToCapacite={onGoToCapacite} />}
          {res && user && (
            <button className="btn-budget" style={{ marginTop: 14 }} onClick={onSaveBien}>💾 Sauvegarder ce bien (estimation seule)</button>
          )}
          {res && !user && <p className="hint" style={{ marginTop: 12 }}>Connecte-toi pour sauvegarder ce bien et le retrouver plus tard.</p>}
        </div>
      </div>
    </div>
  );
}

function fraisNotaire(prix, period) {
  const neuf = period === "apres 2000" || period === "2010-2023" || period === "2024+";
  const taux = neuf ? 0.025 : 0.075;
  return { montant: Math.round(prix * taux), taux, neuf };
}

function EstimResult({ res, surface, prixDemande, period, onGoToCapacite }) {
  const confColor = res.confidence === "Elevee" ? "g" : res.confidence === "Moyenne" ? "w" : "b";
  const fn = fraisNotaire(res.estimate, period);
  const gap = prixDemande ? Math.round(((prixDemande - res.estimate) / res.estimate) * 100) : null;

  return (
    <>
      <div className="hero">
        <div className="lbl">Valeur estimee</div>
        <div className="val">{euro(res.estimate)}</div>
        <div className="range">Fourchette : {euro(res.low)} &ndash; {euro(res.high)}</div>
        <div className="loc">{res.location.area} &middot; {euro0(res.adjustedPm2)} EUR/m2</div>
      </div>

      {onGoToCapacite && (
        <button className="btn-budget" onClick={onGoToCapacite}>
          🏦 Ce bien est-il dans mon budget ?
        </button>
      )}

      {gap !== null && (
        <div className={"nego-signal " + (gap <= -5 ? "nego-good" : gap <= 5 ? "nego-ok" : "nego-bad")}>
          {gap <= -5 && <><b>✅ Bonne affaire</b> — prix demandé {Math.abs(gap)} % <b>sous</b> l'estimation de marché.<br/>Marge de négociation : {euro(res.estimate - prixDemande)} EUR disponible.</>}
          {gap > -5 && gap <= 5 && <><b>🟡 Prix dans la norme</b> — écart de {gap >= 0 ? "+" : ""}{gap} % vs estimation. Négociation possible de 2 à 5 %.</>}
          {gap > 5 && <><b>⚠️ Bien surcoté</b> — prix demandé {gap} % <b>au-dessus</b> du marché.<br/>Surcote estimée : {euro(prixDemande - res.estimate)} EUR. Négociez ou passez votre chemin.</>}
          <div style={{marginTop:6, fontSize:12, color:"#94a3b8"}}>
            Prix demandé : {euro(prixDemande)} &nbsp;|&nbsp; Estimé : {euro(res.estimate)}
          </div>
        </div>
      )}

      <div className="kpis">
        <div className="kpi"><div className="k">Prix/m2 du marche local</div><div className="v">{euro0(res.basePm2)}</div></div>
        <div className="kpi"><div className="k">Prix/m2 ajuste au bien</div><div className="v">{euro0(res.adjustedPm2)}</div></div>
        <div className="kpi"><div className="k">Fiabilite</div><div className={"v " + confColor}>{res.confidence}</div></div>
      </div>

      <div className="notaire-box">
        <div className="notaire-title">🏛️ Frais de notaire estimés ({fn.neuf ? "bien neuf ~2,5%" : "bien ancien ~7,5%"})</div>
        <div className="notaire-row">
          <span>Frais de notaire</span><b>{euro(fn.montant)}</b>
        </div>
        <div className="notaire-row">
          <span>Budget total acquisition</span><b>{euro(res.estimate + fn.montant)}</b>
        </div>
        <div className="notaire-row">
          <span>Avec frais d'agence estimés (3 %)</span><b>{euro(res.estimate + fn.montant + Math.round(res.estimate * 0.03))}</b>
        </div>
        <p style={{fontSize:11,color:"#64748b",margin:"6px 0 0"}}>Les frais de notaire comprennent les droits d'enregistrement, honoraires du notaire et débours. Estimation indicative.</p>
      </div>

      <div className="badge g">{res.compCount} ventes comparables retenues &middot; {res.totalSales} ventes analysees ({res.yearsUsed.join(", ")})</div>

      {res.conjoncture && (
        <div className={"auto-badge " + (res.conjoncture.pct > 0 ? "ab-pos" : res.conjoncture.pct < 0 ? "ab-neg" : "ab-neu")}>
          📈 {res.conjoncture.label}
          {res.conjoncture.pct !== 0 && <b> ({res.conjoncture.pct > 0 ? "+" : ""}{Math.round(res.conjoncture.pct * 100)} %)</b>}
        </div>
      )}

      {res.amenities && res.amenities.length > 0 && (
        <>
          <div className="section-t">Commodites a proximite</div>
          <div className="amenities">
            {res.amenities.map((a) => (
              <div className="amenity" key={a.key}>
                <span className="am-ico">{AM_ICON[a.key] || "•"}</span>
                <div className="am-body">
                  <div className="am-label">{a.label}</div>
                  <div className="am-meta">
                    {a.nearest ? <><b>{a.nearest.dist} m</b> &middot; {a.nearest.name}</> : "-"}
                    {a.count > 1 && <span className="am-count">{a.count} a proximite</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {res.amenities === null && (
        <p className="hint" style={{ marginTop: 10 }}>Commodites a proximite momentanement indisponibles (service cartographique sature). L'estimation reste valable ; reessayez dans un instant pour les afficher.</p>
      )}

      {res.marketTrend && res.marketTrend.annualPct != null && (
        <div className="trend">
          <div className="trend-head">
            <span>Tendance locale du marche</span>
            <b className={res.marketTrend.annualPct >= 0 ? "pos" : "neg"}>
              {res.marketTrend.annualPct >= 0 ? "+" : ""}{res.marketTrend.annualPct.toString().replace(".", ",")} %/an
            </b>
          </div>
          <div className="trend-bars">
            {res.marketTrend.points.map((p, i) => {
              const max = Math.max(...res.marketTrend.points.map((x) => x.med));
              return (
                <div key={i} className="trend-bar">
                  <div className="tb-fill" style={{ height: Math.round((p.med / max) * 100) + "%" }} />
                  <div className="tb-val">{euro0(p.med)}</div>
                  <div className="tb-year">{p.year}</div>
                </div>
              );
            })}
          </div>
          <p className="hint">Prix/m2 median par annee dans la commune. Les ventes anciennes sont reindexees a aujourd'hui selon cette tendance, pour refleter la demande actuelle.</p>
        </div>
      )}

      {res.adjustments.length > 0 && (
        <>
          <div className="section-t">Ajustements appliques au prix/m2 local</div>
          <div className="line-items">
            {res.adjustments.map((a, i) => (
              <div className="li" key={i}>
                <span className="lbl">{a.label}</span>
                <span className={a.pct >= 0 ? "pos" : "neg"}>{a.pct >= 0 ? "+" : ""}{a.pct.toString().replace(".", ",")} %</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-t">Localisation des comparables</div>
      <CompMap center={res.location} comps={res.comparables} />
      <p className="hint"><span className="dot-green" /> Bien estime &nbsp; <span className="dot-blue" /> Ventes comparables (cliquez un point pour le detail).</p>

      <div className="section-t">Transactions reelles comparables ({res.comparables.length})</div>
      <div className="tbl-scroll">
        <table>
          <thead>
            <tr><th>Date</th><th>Adresse</th><th className="num">Surface</th><th className="num">Prix</th><th className="num">Prix/m2</th><th className="num">Dist.</th></tr>
          </thead>
          <tbody>
            {res.comparables.map((c, i) => (
              <tr key={i}>
                <td>{c.date}</td>
                <td>{c.adresse || c.commune}{c.pieces ? ` · ${c.pieces}p` : ""}</td>
                <td className="num">{c.surface} m2</td>
                <td className="num">{euro0(c.prix)}</td>
                <td className="num">{euro0(c.pm2)}</td>
                <td className="num">{c.dist < 1000 ? c.dist + " m" : (c.dist/1000).toFixed(1) + " km"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="src">Source : Demandes de Valeurs Foncieres (DGFiP / Etalab), geocodage IGN.</p>
    </>
  );
}

/* ======================= TAB 2 : RENTABILITE ============================= */
function pmt(principal, annualRate, years) {
  const r = annualRate / 100 / 12, n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

// Plus-value immobiliere : abattement pour duree de detention (hors residence principale)
// IR (19%) : exoneration totale a 22 ans. PS (17,2%) : exoneration totale a 30 ans.
function abattementIR(y) {
  if (y <= 5) return 0;
  if (y >= 22) return 1;
  return (y - 5) * 0.06; // 6%/an de la 6e a la 21e annee
}
function abattementPS(y) {
  if (y <= 5) return 0;
  if (y >= 30) return 1;
  if (y <= 21) return (y - 5) * 0.0165;   // 1,65%/an
  if (y === 22) return 16 * 0.0165 + 0.016; // 28%
  return Math.min(1, 0.28 + (y - 22) * 0.09); // 9%/an de la 23e a la 30e
}

// Taux de rendement interne (TRI / IRR) par bissection
function computeIRR(flows) {
  const npv = (r) => flows.reduce((s, f, i) => s + f / Math.pow(1 + r, i), 0);
  let lo = -0.9, hi = 1.0;
  let flo = npv(lo), fhi = npv(hi);
  if (flo * fhi > 0) return null; // pas de changement de signe -> TRI non defini
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2, fm = npv(mid);
    if (Math.abs(fm) < 0.5) return mid;
    if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}

/* Encadrement des loyers 2024 — données officielles DRIHL/DDTM
   Structure : city → meuble|nu → pieces (1,2,3,4) → {ref, maj, min} en €/m²/mois */
const ENCADREMENT = {
  paris: {
    label: "Paris",
    meuble: {
      1: { ref: 31.9, maj: 38.3, min: 23.9 },
      2: { ref: 24.0, maj: 28.8, min: 18.0 },
      3: { ref: 20.2, maj: 24.2, min: 15.2 },
      4: { ref: 18.5, maj: 22.2, min: 13.9 },
    },
    nu: {
      1: { ref: 26.0, maj: 31.2, min: 19.5 },
      2: { ref: 21.4, maj: 25.7, min: 16.1 },
      3: { ref: 18.3, maj: 22.0, min: 13.7 },
      4: { ref: 16.3, maj: 19.6, min: 12.2 },
    },
  },
  lille: {
    label: "Lille",
    meuble: {
      1: { ref: 16.9, maj: 20.3, min: 12.7 },
      2: { ref: 13.2, maj: 15.8, min: 9.9 },
      3: { ref: 11.4, maj: 13.7, min: 8.6 },
      4: { ref: 9.8,  maj: 11.8, min: 7.4 },
    },
    nu: {
      1: { ref: 13.8, maj: 16.6, min: 10.4 },
      2: { ref: 10.5, maj: 12.6, min: 7.9 },
      3: { ref: 9.5,  maj: 11.4, min: 7.1 },
      4: { ref: 8.3,  maj: 10.0, min: 6.2 },
    },
  },
  lyon: {
    label: "Lyon",
    meuble: {
      1: { ref: 16.6, maj: 19.9, min: 12.5 },
      2: { ref: 13.4, maj: 16.1, min: 10.1 },
      3: { ref: 11.9, maj: 14.3, min: 8.9 },
      4: { ref: 10.5, maj: 12.6, min: 7.9 },
    },
    nu: {
      1: { ref: 13.8, maj: 16.6, min: 10.4 },
      2: { ref: 11.0, maj: 13.2, min: 8.3 },
      3: { ref: 9.8,  maj: 11.8, min: 7.4 },
      4: { ref: 8.8,  maj: 10.6, min: 6.6 },
    },
  },
  bordeaux: {
    label: "Bordeaux",
    meuble: {
      1: { ref: 16.5, maj: 19.8, min: 12.4 },
      2: { ref: 13.0, maj: 15.6, min: 9.8 },
      3: { ref: 11.2, maj: 13.4, min: 8.4 },
      4: { ref: 9.9,  maj: 11.9, min: 7.4 },
    },
    nu: {
      1: { ref: 13.5, maj: 16.2, min: 10.1 },
      2: { ref: 10.7, maj: 12.8, min: 8.0 },
      3: { ref: 9.2,  maj: 11.0, min: 6.9 },
      4: { ref: 8.2,  maj: 9.8,  min: 6.2 },
    },
  },
  montpellier: {
    label: "Montpellier",
    meuble: {
      1: { ref: 15.6, maj: 18.7, min: 11.7 },
      2: { ref: 12.3, maj: 14.8, min: 9.2 },
      3: { ref: 10.8, maj: 13.0, min: 8.1 },
      4: { ref: 9.4,  maj: 11.3, min: 7.1 },
    },
    nu: {
      1: { ref: 12.9, maj: 15.5, min: 9.7 },
      2: { ref: 10.2, maj: 12.2, min: 7.7 },
      3: { ref: 9.0,  maj: 10.8, min: 6.8 },
      4: { ref: 7.9,  maj: 9.5,  min: 5.9 },
    },
  },
};

/* Map ville estimée → clé ENCADREMENT */
const CITY_TO_ENCADREMENT = {
  "Paris":"paris","Versailles":"paris",
  "Lille":"lille","Roubaix":"lille","Tourcoing":"lille","Villeneuve-d'Ascq":"lille",
  "Lyon":"lyon","Villeurbanne":"lyon","Caluire-et-Cuire":"lyon",
  "Bordeaux":"bordeaux","Mérignac":"bordeaux","Pessac":"bordeaux",
  "Montpellier":"montpellier",
};

function EncadrementCard({ estCity, surface, pieces, meuble, loyerSaisi }) {
  const cityKey = CITY_TO_ENCADREMENT[estCity] || null;
  if (!cityKey) return null;
  const data = ENCADREMENT[cityKey];
  const typeKey = meuble ? "meuble" : "nu";
  const p = Math.min(4, Math.max(1, pieces));
  const enc = data[typeKey][p];
  const loyerRef   = Math.round(enc.ref * surface);
  const loyerMaj   = Math.round(enc.maj * surface);
  const loyerMin   = Math.round(enc.min * surface);
  const loyerSaisiN = Number(loyerSaisi) || 0;
  const overPlafond = loyerSaisiN > loyerMaj;
  const pct = loyerMaj > 0 ? Math.round(((loyerSaisiN - loyerMaj) / loyerMaj) * 100) : 0;

  return (
    <div className="card enc-card">
      <h2>🏛️ Encadrement des loyers — {data.label}</h2>
      <p className="hint">Valeurs officielles 2024 — {meuble ? "meublé" : "non meublé"}, {p === 4 ? "4 pièces+" : `${p} pièce${p > 1 ? "s" : ""}`}, {surface} m²</p>
      <div className="enc-bars">
        <div className="enc-bar-row">
          <span className="enc-bar-label">Loyer minoré</span>
          <div className="enc-bar-track">
            <div className="enc-bar-fill enc-min" style={{width:`${Math.round(enc.min/enc.maj*100)}%`}}/>
          </div>
          <span className="enc-bar-val">{loyerMin} €/mois</span>
          <span className="enc-bar-sqm">{enc.min} €/m²</span>
        </div>
        <div className="enc-bar-row">
          <span className="enc-bar-label">Loyer référence</span>
          <div className="enc-bar-track">
            <div className="enc-bar-fill enc-ref" style={{width:`${Math.round(enc.ref/enc.maj*100)}%`}}/>
          </div>
          <span className="enc-bar-val">{loyerRef} €/mois</span>
          <span className="enc-bar-sqm">{enc.ref} €/m²</span>
        </div>
        <div className="enc-bar-row">
          <span className="enc-bar-label">Plafond (+20%)</span>
          <div className="enc-bar-track">
            <div className="enc-bar-fill enc-maj" style={{width:"100%"}}/>
          </div>
          <span className="enc-bar-val">{loyerMaj} €/mois</span>
          <span className="enc-bar-sqm">{enc.maj} €/m²</span>
        </div>
        {loyerSaisiN > 0 && (
          <div className="enc-bar-row">
            <span className="enc-bar-label">Votre loyer</span>
            <div className="enc-bar-track">
              <div className={"enc-bar-fill " + (overPlafond ? "enc-over" : "enc-ok")}
                style={{width:`${Math.min(120, Math.round(loyerSaisiN/loyerMaj*100))}%`}}/>
            </div>
            <span className="enc-bar-val" style={{color: overPlafond ? "var(--bad)" : "var(--green)"}}>{loyerSaisiN} €/mois</span>
            <span className="enc-bar-sqm" style={{color: overPlafond ? "var(--bad)" : "var(--green)"}}>
              {overPlafond ? `⚠️ +${pct}% au-dessus du plafond` : "✅ Conforme"}
            </span>
          </div>
        )}
      </div>
      <div className="enc-reco">
        <div className="enc-reco-item">
          <div className="enc-reco-val">{loyerRef} €</div>
          <div className="enc-reco-label">Loyer médian marché</div>
        </div>
        <div className="enc-reco-item">
          <div className="enc-reco-val" style={{color:"var(--green)"}}>{loyerMaj} €</div>
          <div className="enc-reco-label">Plafond légal</div>
        </div>
        <div className="enc-reco-item">
          <div className="enc-reco-val" style={{color:"var(--muted)"}}>{Math.round(enc.ref * surface * 12 / (loyerSaisiN > 0 ? loyerSaisiN * 12 : 1) * 100)} %</div>
          <div className="enc-reco-label">Réf. / votre loyer</div>
        </div>
      </div>
      <p className="hint" style={{marginTop:8}}>
        Source : DRIHL/DDTM — valeurs moyennes de zone. Le plafond exact dépend du quartier précis.
        <a href="https://www.encadrementdesloyers.gouv.fr" target="_blank" rel="noreferrer" style={{marginLeft:6,color:"var(--accent)"}}>Vérifier exactement →</a>
      </p>
    </div>
  );
}

function Rentabilite({ estValue, estCity, estCityRaw, travauxCost, initialData, onData, onLoaded }) {
  const [rentaTab, setRentaTab] = useState("classique");
  const [f, setF] = useState(initialData || {
    price: estValue || 300000,
    notaryRate: 0.075,
    works: travauxCost || 0,
    surface: 40,          // surface en m²
    pieces: 2,            // nombre de pièces
    meuble: 1,            // 1 = meublé, 0 = nu
    rent: 1150,           // loyer mensuel hors charges (HC)
    chargesProvision: 150,// charges mensuelles refacturees au locataire
    vacancy: 0.04,        // scenario realiste par defaut
    chargesCopro: 2400,   // charges de copropriete annuelles TOTALES
    taxe: 1100,           // taxe fonciere / an
    mgmt: 0.06,           // frais de gestion (% loyers)
    insurancePNO: 180,    // assurance PNO / an
    apport: 40000,
    duration: 20,
    rate: 3.5,
    loanInsurance: 0.34,
    regime: "microbic",
    tmi: 0.3,
    horizon: 10,         // duree de detention avant revente (ans)
    appreciation: 1,     // evolution annuelle du prix (%)
  });
  useEffect(() => { if (onData) onData(f); }, [f]);
  useEffect(() => { if (initialData && onLoaded) onLoaded(); }, []);
  // keep price synced when arriving from estimation (sauf si projet charge)
  const [synced, setSynced] = useState(false);
  if (!synced && !initialData && estValue && f.price !== estValue) {
    setF((x) => ({ ...x, price: estValue }));
    setSynced(true);
  }
  const set = (k, v) => setF((s) => ({ ...s, [k]: Number(v) }));
  const v = (k) => Number(f[k]) || 0;

  // ---- calculations ----
  const price = v("price");
  const notaire = price * v("notaryRate");
  const totalCost = price + notaire + v("works");

  const loan = Math.max(0, totalCost - v("apport"));
  const mPrincipal = pmt(loan, v("rate"), v("duration"));
  const mLoanIns = (loan * (v("loanInsurance") / 100)) / 12;
  const mPayment = mPrincipal + mLoanIns;
  const totalInterest = mPrincipal * v("duration") * 12 - loan;

  const annualRentGross = v("rent") * 12;                  // loyer HC annuel = revenu reel
  const recoveredCharges = v("chargesProvision") * 12;     // refacture au locataire (pass-through)
  const nonRecovCopro = Math.max(0, v("chargesCopro") - recoveredCharges); // reste a votre charge
  const annualRentNet = annualRentGross * (1 - v("vacancy"));
  const mgmtCost = annualRentNet * v("mgmt");
  const annualOperating = nonRecovCopro + v("taxe") + v("insurancePNO") + mgmtCost;

  const yieldGross = price > 0 ? (annualRentGross / price) * 100 : 0;
  const yieldNet = totalCost > 0 ? ((annualRentNet - annualOperating) / totalCost) * 100 : 0;

  const annualLoan = mPayment * 12;
  const annualCashflow = annualRentNet - annualOperating - annualLoan;
  const mCashflow = annualCashflow / 12;
  const cashOnCash = v("apport") > 0 ? (annualCashflow / v("apport")) * 100 : 0;

  // ---- fiscalite (impot sur les revenus locatifs) ----
  const PS = 0.172; // prelevements sociaux
  const taxRate = v("tmi") + PS;
  const annualInterest = loan * (v("rate") / 100);        // approx interets annee 1
  const loanInsAnnual = loan * (v("loanInsurance") / 100);
  const deductible = nonRecovCopro + v("taxe") + v("insurancePNO") + mgmtCost + annualInterest + loanInsAnnual;
  const amort = (price * 0.85) / 30 + v("works") / 10;    // amortissement LMNP (approx)
  const regime = f.regime;
  let taxableBase, regimeLabel;
  if (regime === "microfoncier") { taxableBase = annualRentGross * 0.7; regimeLabel = "Nu - Micro-foncier (abattement 30%)"; }
  else if (regime === "microbic") { taxableBase = annualRentGross * 0.5; regimeLabel = "Meuble - Micro-BIC (abattement 50%)"; }
  else if (regime === "reel") { taxableBase = Math.max(0, annualRentNet - deductible); regimeLabel = "Nu - Reel (charges deduites)"; }
  else { taxableBase = Math.max(0, annualRentNet - deductible - amort); regimeLabel = "Meuble - LMNP reel (amortissement)"; }
  const incomeTax = Math.max(0, taxableBase) * taxRate;
  const cashflowAfterTax = annualCashflow - incomeTax;
  const mCashflowAT = cashflowAfterTax / 12;
  const yieldNetNet = totalCost > 0 ? ((annualRentNet - annualOperating - incomeTax) / totalCost) * 100 : 0;

  // ---- comparateur des 4 regimes fiscaux ----
  const tmi = v("tmi");
  const chargesHorsInterets = nonRecovCopro + v("taxe") + v("insurancePNO") + mgmtCost; // hors interets
  // Deficit foncier (location nue, reel) : les loyers absorbent d'abord les interets.
  const rentAfterInterest = annualRentNet - annualInterest - loanInsAnnual;
  const reelResult = annualRentNet - deductible; // resultat foncier
  let deficitImputable = 0, deficitReporte = 0;
  if (reelResult < 0) {
    const deficit = -reelResult;
    // part hors interets imputable sur revenu global (plafond 10 700 EUR), le reste reporte
    const otherPart = rentAfterInterest >= 0 ? deficit : chargesHorsInterets;
    deficitImputable = Math.min(Math.max(0, otherPart), 10700);
    deficitReporte = deficit - deficitImputable;
  }
  const regimes = [
    {
      key: "microfoncier", label: "Nu — Micro-foncier", abatt: "−30%",
      base: annualRentGross * 0.7, tax: annualRentGross * 0.7 * taxRate,
      eligible: annualRentGross <= 15000, interest: false,
    },
    {
      key: "reel", label: "Nu — Réel", abatt: "charges + déficit",
      base: Math.max(0, reelResult),
      // impot foncier (0 si deficit) MOINS l'economie d'impot du deficit imputable (a la TMI)
      tax: Math.max(0, reelResult) * taxRate - deficitImputable * tmi,
      eligible: true, interest: true, deficitImputable, deficitReporte,
    },
    {
      key: "microbic", label: "Meublé — Micro-BIC", abatt: "−50%",
      base: annualRentGross * 0.5, tax: annualRentGross * 0.5 * taxRate,
      eligible: annualRentGross <= 77700, interest: false,
    },
    {
      key: "lmnp", label: "Meublé — LMNP réel", abatt: "charges + amortissement",
      base: Math.max(0, annualRentNet - deductible - amort),
      tax: Math.max(0, annualRentNet - deductible - amort) * taxRate,
      eligible: true, interest: true,
    },
  ];
  const bestRegime = regimes.reduce((a, b) => (b.tax < a.tax ? b : a));
  // economie d'impot grace aux interets (regimes au reel) : impot sans vs avec deduction des interets
  const taxReelSansInterets = Math.max(0, annualRentNet - (deductible - annualInterest - loanInsAnnual)) * taxRate;
  const interestSaving = Math.max(0, taxReelSansInterets - Math.max(0, reelResult) * taxRate + deficitImputable * tmi);

  // ---- revente, plus-value & TRI ----
  const horizon = Math.max(1, Math.min(30, Math.round(v("horizon"))));
  const appr = v("appreciation") / 100;
  const resalePrice = price * Math.pow(1 + appr, horizon);
  // capital restant du a la revente (depuis l'echeancier)
  const sched = loan > 0 ? buildAmortization(loan, v("rate"), v("duration"), mLoanIns) : [];
  let crd = 0;
  if (loan > 0 && horizon < v("duration")) crd = sched[horizon * 12 - 1] ? sched[horizon * 12 - 1].balance : 0;
  const capitalRembourse = loan - crd;
  // plus-value imposable (base = prix de revente - cout total d'acquisition)
  const pvBrute = Math.max(0, resalePrice - totalCost);
  const abIR = abattementIR(horizon), abPS = abattementPS(horizon);
  const pvIR = pvBrute * (1 - abIR) * 0.19;
  const pvPS = pvBrute * (1 - abPS) * 0.172;
  const pvTax = pvIR + pvPS;
  const pvNette = pvBrute - pvTax;
  // capitaux propres recuperes a la revente
  const exitEquity = resalePrice - crd - pvTax;
  const cumulCashflow = cashflowAfterTax * horizon; // approx : cashflow annuel constant
  const patrimoineNet = exitEquity + cumulCashflow - v("apport");
  // TRI : -apport en t0, cashflow chaque annee, + revente la derniere annee
  const flows = [-v("apport")];
  for (let y = 1; y <= horizon; y++) flows.push(cashflowAfterTax + (y === horizon ? exitEquity : 0));
  const triRaw = computeIRR(flows);
  const tri = triRaw != null ? triRaw * 100 : null;

  const yClass = (y) => (y >= 5 ? "g" : y >= 3 ? "w" : "b");
  const cClass = (x) => (x >= 0 ? "g" : "b");

  // ---- Score d'investissement global (0-100) ----
  const clampS = (x) => Math.max(0, Math.min(100, x));
  const subScores = [
    { key: "renta", label: "Rentabilite nette-nette", val: clampS(((yieldNetNet - 1) / 6) * 100), weight: 0.30 },
    { key: "tri", label: "Rendement total (TRI)", val: tri != null ? clampS(((tri - 2) / 8) * 100) : 50, weight: 0.30 },
    { key: "cashflow", label: "Cashflow mensuel", val: clampS(((mCashflowAT + 400) / 600) * 100), weight: 0.25 },
    { key: "prix", label: "Prix vs marche", val: estValue > 0 ? clampS(((0.10 - (price - estValue) / estValue) / 0.20) * 100) : 50, weight: 0.15 },
  ];
  const scoreGlobal = Math.round(subScores.reduce((s, x) => s + x.val * x.weight, 0));
  let scoreLabel, scoreColor;
  if (scoreGlobal >= 80) { scoreLabel = "Excellent"; scoreColor = "var(--green)"; }
  else if (scoreGlobal >= 60) { scoreLabel = "Bon"; scoreColor = "var(--accent)"; }
  else if (scoreGlobal >= 40) { scoreLabel = "Moyen"; scoreColor = "var(--warn)"; }
  else { scoreLabel = "Faible"; scoreColor = "var(--bad)"; }
  const scoreCirc = 2 * Math.PI * 52;

  let verdict, vClass;
  if (cashflowAfterTax >= 0) { verdict = "Rentable : apres impot, les loyers couvrent le credit et toutes les charges. Cashflow positif."; vClass = "g"; }
  else if (mCashflowAT >= -200) { verdict = "Equilibre : effort d'epargne mensuel modere apres impot. A arbitrer selon la plus-value attendue."; vClass = "w"; }
  else { verdict = "Non rentable en l'etat : effort d'epargne mensuel important apres impot. Renegociez le prix, l'apport, le loyer ou changez de regime fiscal."; vClass = "b"; }

  return (
    <>
      <div className="subtabs">
        <button className={"subtab" + (rentaTab === "classique" ? " active" : "")} onClick={() => setRentaTab("classique")}>
          📋 Location classique
        </button>
        <button className={"subtab" + (rentaTab === "airbnb" ? " active" : "")} onClick={() => setRentaTab("airbnb")}>
          🏠 Airbnb / Saisonnier
        </button>
      </div>
      {rentaTab === "airbnb" ? (
        <RentabiliteAirbnb estValue={estValue} estCity={estCity} classicYieldGross={yieldGross} classicCashflowAT={mCashflowAT} />
      ) : (
      <div className="grid">
      {/* inputs */}
      <div>
        <div className="card">
          <h2>Acquisition</h2>
          <div className="sub">{estValue ? "Prix pre-rempli depuis votre estimation." : "Saisissez le prix d'achat."}</div>
          <div className="row">
            <div>
              <label>Prix d'achat</label>
              <div className="unit"><input type="number" value={f.price} onChange={(e) => set("price", e.target.value)} /><small>EUR</small></div>
            </div>
            <div>
              <label>Type (frais de notaire)</label>
              <select value={f.notaryRate} onChange={(e) => set("notaryRate", e.target.value)}>
                <option value="0.075">Ancien (~7,5%)</option>
                <option value="0.025">Neuf / VEFA (~2,5%)</option>
              </select>
            </div>
          </div>
          <label>Travaux / ameublement</label>
          <div className="unit"><input type="number" value={f.works} onChange={(e) => set("works", e.target.value)} /><small>EUR</small></div>
        </div>

        <div className="card">
          <h2>Revenus &amp; charges</h2>
          <div className="row">
            <div>
              <label>Surface habitable</label>
              <div className="unit"><input type="number" value={f.surface} onChange={(e) => set("surface", e.target.value)} /><small>m²</small></div>
            </div>
            <div>
              <label>Nombre de pièces</label>
              <select value={f.pieces} onChange={(e) => set("pieces", e.target.value)}>
                <option value="1">Studio / 1 pièce</option>
                <option value="2">2 pièces</option>
                <option value="3">3 pièces</option>
                <option value="4">4 pièces et +</option>
              </select>
            </div>
          </div>
          <div className="row">
            <div>
              <label>Type de location</label>
              <select value={f.meuble} onChange={(e) => set("meuble", e.target.value)}>
                <option value="1">Meublé</option>
                <option value="0">Non meublé (nu)</option>
              </select>
            </div>
            <div>
              <label>Loyer mensuel hors charges (HC)</label>
              <div className="unit"><input type="number" value={f.rent} onChange={(e) => set("rent", e.target.value)} /><small>EUR</small></div>
            </div>
            <div>
              <label>Charges mensuelles (locataire)</label>
              <div className="unit"><input type="number" value={f.chargesProvision} onChange={(e) => set("chargesProvision", e.target.value)} /><small>EUR</small></div>
            </div>
          </div>
          <div className="row">
            <div>
              <label>Charges de copro / an (total)</label>
              <div className="unit"><input type="number" value={f.chargesCopro} onChange={(e) => set("chargesCopro", e.target.value)} /><small>EUR</small></div>
            </div>
            <div>
              <label>Taxe fonciere / an</label>
              <div className="unit"><input type="number" value={f.taxe} onChange={(e) => set("taxe", e.target.value)} /><small>EUR</small></div>
            </div>
          </div>
          <p className="hint">
            Loyer charges comprises encaisse : <b>{euro0(v("rent") + v("chargesProvision"))} EUR/mois</b>.
            Sur les {euro0(v("chargesCopro"))} EUR de copro annuels, {euro0(recoveredCharges)} EUR sont refactures au locataire ;
            <b> {euro0(nonRecovCopro)} EUR/an restent a votre charge</b> (charges non recuperables).
          </p>
          <div className="row">
            <div>
              <label>Vacance locative</label>
              <select value={f.vacancy} onChange={(e) => set("vacancy", e.target.value)}>
                <option value="0.02">✅ Optimiste — 2 % (grandes villes tendues)</option>
                <option value="0.04">⚖️ Réaliste — 4 % (~15 jours/an)</option>
                <option value="0.08">⚠️ Prudent — 8 % (1 mois/an)</option>
                <option value="0.125">🔴 Pessimiste — 12,5 % (1,5 mois/an)</option>
              </select>
              <p className="hint">Paris/Lyon/Bordeaux : souvent 2–4 %. Villes moyennes : 6–10 %. Zones rurales : 10–15 %.</p>
            </div>
            <div>
              <label>Gestion locative</label>
              <select value={f.mgmt} onChange={(e) => set("mgmt", e.target.value)}>
                <option value="0">Gestion perso (0%)</option>
                <option value="0.06">Agence (~6%)</option>
                <option value="0.08">Agence (~8%)</option>
              </select>
            </div>
          </div>
          <label>Assurance PNO / an</label>
          <div className="unit"><input type="number" value={f.insurancePNO} onChange={(e) => set("insurancePNO", e.target.value)} /><small>EUR</small></div>
        </div>

        <div className="card">
          <h2>Financement</h2>
          <div className="row">
            <div>
              <label>Apport</label>
              <div className="unit"><input type="number" value={f.apport} onChange={(e) => set("apport", e.target.value)} /><small>EUR</small></div>
            </div>
            <div>
              <label>Duree</label>
              <div className="unit"><input type="number" value={f.duration} onChange={(e) => set("duration", e.target.value)} /><small>ans</small></div>
            </div>
          </div>
          <div className="row">
            <div>
              <label>Taux d'interet</label>
              <div className="unit"><input type="number" step="0.01" value={f.rate} onChange={(e) => set("rate", e.target.value)} /><small>%</small></div>
            </div>
            <div>
              <label>Assurance emprunteur</label>
              <div className="unit"><input type="number" step="0.01" value={f.loanInsurance} onChange={(e) => set("loanInsurance", e.target.value)} /><small>%/an</small></div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Fiscalite</h2>
          <div className="sub">Impot sur les revenus locatifs (IR + prelevements sociaux 17,2%)</div>
          <label>Regime fiscal</label>
          <select value={f.regime} onChange={(e) => setF((s) => ({ ...s, regime: e.target.value }))}>
            <option value="microbic">Meuble - Micro-BIC (abattement 50%)</option>
            <option value="lmnp">Meuble - LMNP reel (amortissement)</option>
            <option value="microfoncier">Nu - Micro-foncier (abattement 30%)</option>
            <option value="reel">Nu - Reel (deduction des charges)</option>
          </select>
          <label>Tranche marginale d'imposition (TMI)</label>
          <select value={f.tmi} onChange={(e) => set("tmi", e.target.value)}>
            <option value="0">0% (non imposable)</option>
            <option value="0.11">11%</option>
            <option value="0.3">30%</option>
            <option value="0.41">41%</option>
            <option value="0.45">45%</option>
          </select>
          <p className="hint">LMNP reel : l'amortissement du bien efface souvent l'impot pendant des annees (estimation simplifiee). Le reel deduit interets et charges. A confirmer avec un comptable.</p>
        </div>

        <div className="card">
          <h2>Revente &amp; plus-value</h2>
          <div className="sub">Projection patrimoniale et rendement total (TRI)</div>
          <div className="row">
            <div>
              <label>Horizon de revente</label>
              <div className="unit"><input type="number" value={f.horizon} onChange={(e) => set("horizon", e.target.value)} /><small>ans</small></div>
            </div>
            <div>
              <label>Evolution annuelle du prix</label>
              <div className="unit"><input type="number" step="0.1" value={f.appreciation} onChange={(e) => set("appreciation", e.target.value)} /><small>%/an</small></div>
            </div>
          </div>
          <p className="hint">Plus-value : exoneration d'IR a 22 ans, de prelevements sociaux a 30 ans (residence secondaire / locatif). La residence principale est totalement exoneree.</p>
        </div>
      </div>

      {/* results */}
      <div>
        <EncadrementCard
          estCity={estCityRaw}
          surface={v("surface")}
          pieces={v("pieces")}
          meuble={v("meuble") === 1}
          loyerSaisi={v("rent")}
        />
        <div className="card">
          <h2>Score d'investissement</h2>
          <div className="sub">Synthese globale de la qualite de l'operation</div>
          <div className="score-wrap">
            <div className="score-gauge">
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--line)" strokeWidth="12" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={scoreColor} strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={scoreCirc} strokeDashoffset={scoreCirc * (1 - scoreGlobal / 100)}
                  transform="rotate(-90 60 60)" style={{ transition: "stroke-dashoffset .5s" }} />
                <text x="60" y="58" textAnchor="middle" fontSize="30" fontWeight="700" fill="var(--txt)">{scoreGlobal}</text>
                <text x="60" y="76" textAnchor="middle" fontSize="11" fill="var(--muted)">/ 100</text>
              </svg>
              <div className="score-label" style={{ color: scoreColor }}>{scoreLabel}</div>
            </div>
            <div className="score-bars">
              {subScores.map((s) => (
                <div className="score-bar-row" key={s.key}>
                  <div className="score-bar-top"><span>{s.label}</span><b>{Math.round(s.val)}</b></div>
                  <div className="score-bar-track"><div className="score-bar-fill" style={{ width: s.val + "%", background: s.val >= 60 ? "var(--green)" : s.val >= 40 ? "var(--warn)" : "var(--bad)" }} /></div>
                </div>
              ))}
            </div>
          </div>
          <p className="hint">Score pondere : rentabilite nette-nette (30%), TRI (30%), cashflow (25%), prix vs marche (15%). Base sur tes hypotheses ci-contre.</p>
        </div>

        <div className="card">
          <h2>Analyse de rentabilite</h2>
          <div className="sub">Mise a jour en temps reel</div>

          <div className="kpis">
            <div className="kpi"><div className="k">Rentabilite brute</div><div className={"v " + yClass(yieldGross)}>{pct(yieldGross)}</div></div>
            <div className="kpi"><div className="k">Rentabilite nette</div><div className={"v " + yClass(yieldNet)}>{pct(yieldNet)}</div></div>
            <div className="kpi"><div className="k">Rendement / apport</div><div className={"v " + cClass(cashOnCash)}>{pct(cashOnCash)}</div></div>
          </div>

          <div className="section-t">Cout total de l'operation</div>
          <div className="line-items">
            <div className="li"><span className="lbl">Prix d'achat</span><span>{euro(price)}</span></div>
            <div className="li"><span className="lbl">Frais de notaire ({(v("notaryRate")*100).toFixed(1).replace(".",",")}%)</span><span>{euro(notaire)}</span></div>
            {v("works") > 0 && <div className="li"><span className="lbl">Travaux</span><span>{euro(v("works"))}</span></div>}
            <div className="li total"><span>Cout total</span><span className="v">{euro(totalCost)}</span></div>
          </div>

          <div className="section-t">Credit</div>
          <div className="line-items">
            <div className="li"><span className="lbl">Montant emprunte</span><span>{euro(loan)}</span></div>
            <div className="li"><span className="lbl">Mensualite (capital + interets)</span><span>{euro(mPrincipal)}</span></div>
            <div className="li"><span className="lbl">Assurance emprunteur / mois</span><span>{euro(mLoanIns)}</span></div>
            <div className="li total"><span>Mensualite totale</span><span className="v">{euro(mPayment)}</span></div>
            <div className="li"><span className="lbl">Cout total des interets</span><span>{euro(totalInterest)}</span></div>
          </div>

          <div className="section-t">Flux annuel (apres credit)</div>
          <div className="line-items">
            <div className="li"><span className="lbl">Loyers HC encaisses</span><span className="pos">+ {euro(annualRentNet)}</span></div>
            <div className="li"><span className="lbl">Charges copro non recuperables</span><span className="neg">- {euro(nonRecovCopro)}</span></div>
            <div className="li"><span className="lbl">Taxe fonciere</span><span className="neg">- {euro(v("taxe"))}</span></div>
            <div className="li"><span className="lbl">Gestion + assurance PNO</span><span className="neg">- {euro(mgmtCost + v("insurancePNO"))}</span></div>
            <div className="li"><span className="lbl">Remboursement credit</span><span className="neg">- {euro(annualLoan)}</span></div>
            <div className="li total"><span>Cashflow annuel</span>
              <span className={annualCashflow >= 0 ? "pos" : "neg"}>{annualCashflow >= 0 ? "+ " : "- "}{euro(Math.abs(annualCashflow))}</span></div>
          </div>

          <div className="kpis" style={{ marginTop: 14 }}>
            <div className="kpi"><div className="k">Cashflow / mois (av. impot)</div><div className={"v " + cClass(mCashflow)}>{mCashflow >= 0 ? "+" : "-"}{euro0(Math.abs(mCashflow))} EUR</div></div>
            <div className="kpi"><div className="k">Effort d'epargne / mois</div><div className={"v " + (mCashflow >= 0 ? "g" : "w")}>{mCashflow >= 0 ? "0 EUR" : euro0(-mCashflow) + " EUR"}</div></div>
            <div className="kpi"><div className="k">Mensualite</div><div className="v">{euro0(mPayment)} EUR</div></div>
          </div>

          <div className="section-t">Impot &amp; rentabilite nette-nette</div>
          <div className="line-items">
            <div className="li"><span className="lbl">Regime</span><span style={{ fontSize: 12.5 }}>{regimeLabel}</span></div>
            <div className="li"><span className="lbl">Base imposable / an</span><span>{euro(taxableBase)}</span></div>
            <div className="li"><span className="lbl">Impot estime (IR {Math.round(v("tmi") * 100)}% + PS 17,2%)</span><span className="neg">- {euro(incomeTax)}/an</span></div>
            <div className="li total"><span>Cashflow apres impot</span>
              <span className={cashflowAfterTax >= 0 ? "pos" : "neg"}>{cashflowAfterTax >= 0 ? "+ " : "- "}{euro(Math.abs(cashflowAfterTax))}/an</span></div>
          </div>

          <div className="kpis" style={{ marginTop: 14 }}>
            <div className="kpi"><div className="k">Rentabilite nette-nette</div><div className={"v " + yClass(yieldNetNet)}>{pct(yieldNetNet)}</div></div>
            <div className="kpi"><div className="k">Cashflow / mois (ap. impot)</div><div className={"v " + cClass(mCashflowAT)}>{mCashflowAT >= 0 ? "+" : "-"}{euro0(Math.abs(mCashflowAT))} EUR</div></div>
            <div className="kpi"><div className="k">Impot / mois</div><div className="v w">{euro0(incomeTax / 12)} EUR</div></div>
          </div>

          <div className="section-t">Comparateur des 4 regimes fiscaux</div>
          <div className="tbl-scroll" style={{ maxHeight: "none" }}>
            <table>
              <thead>
                <tr><th>Regime</th><th>Deduction</th><th className="num">Base / an</th><th className="num">Impot / an</th></tr>
              </thead>
              <tbody>
                {regimes.map((rg) => (
                  <tr key={rg.key} style={rg.key === bestRegime.key ? { background: "rgba(34,197,94,.12)" } : undefined}>
                    <td>{rg.key === bestRegime.key ? "★ " : ""}{rg.label}{!rg.eligible ? <span className="neg" style={{ fontSize: 11 }}> (seuil dépassé)</span> : ""}</td>
                    <td style={{ fontSize: 12, color: "var(--muted)" }}>{rg.abatt}</td>
                    <td className="num">{euro0(rg.base)}</td>
                    <td className={"num " + (rg.tax <= 0 ? "pos" : "neg")}>{rg.tax < 0 ? "+ " + euro0(-rg.tax) : euro0(rg.tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="badge g" style={{ display: "block", marginTop: 10 }}>
            ★ Regime optimal : <b>{bestRegime.label}</b> &middot; impot {bestRegime.tax <= 0 ? "nul (voire economie de " + euro(-bestRegime.tax) + ")" : euro(bestRegime.tax) + "/an"}
            {bestRegime.tax < incomeTax && <> &middot; soit {euro(incomeTax - bestRegime.tax)}/an de moins que votre choix actuel</>}
          </div>

          {interestSaving > 0 && (
            <div className="line-items" style={{ marginTop: 10 }}>
              <div className="li"><span className="lbl">Economie d'impot grace aux interets d'emprunt (au reel)</span><span className="pos">{euro(interestSaving)}/an</span></div>
              {deficitImputable > 0 && <div className="li"><span className="lbl">Deficit foncier imputable sur revenu global</span><span className="pos">{euro(deficitImputable)}</span></div>}
              {deficitReporte > 0 && <div className="li"><span className="lbl">Deficit reporte (10 ans, sur revenus fonciers)</span><span>{euro(deficitReporte)}</span></div>}
            </div>
          )}
          <p className="hint" style={{ marginTop: 8 }}>Les interets ne sont deductibles qu'au reel (nu ou LMNP), jamais en micro ni sur une residence principale. Deduire 1 EUR d'interet economise votre TMI, pas 1 EUR : ca allege le cout, ne le rend pas gratuit. Estimation simplifiee, a valider avec un comptable.</p>

          <div className="section-t">Revente &amp; plus-value a {horizon} ans</div>
          <div className="hero" style={{ background: tri != null && tri >= 0 ? "linear-gradient(135deg,#14532d,#22c55e)" : "linear-gradient(135deg,#7f1d1d,#ef4444)" }}>
            <div className="lbl">Rendement total de l'operation (TRI)</div>
            <div className="val">{tri != null ? pct(tri) : "n/a"}</div>
            <div className="range">Patrimoine net cree : {patrimoineNet >= 0 ? "+ " : "- "}{euro(Math.abs(patrimoineNet))}</div>
          </div>

          <div className="line-items">
            <div className="li"><span className="lbl">Prix de revente estime ({pct(v("appreciation"))}/an)</span><span>{euro(resalePrice)}</span></div>
            <div className="li"><span className="lbl">Cout total d'acquisition</span><span>{euro(totalCost)}</span></div>
            <div className="li"><span className="lbl">Plus-value brute</span><span className={pvBrute > 0 ? "pos" : ""}>{euro(pvBrute)}</span></div>
            <div className="li"><span className="lbl">Abattement IR / PS (detention {horizon} ans)</span><span>{Math.round(abIR * 100)}% / {Math.round(abPS * 100)}%</span></div>
            <div className="li"><span className="lbl">Impot sur la plus-value (IR 19% + PS 17,2%)</span><span className="neg">- {euro(pvTax)}</span></div>
            <div className="li total"><span>Plus-value nette</span><span className="v">{euro(pvNette)}</span></div>
          </div>

          <div className="section-t">A la revente</div>
          <div className="line-items">
            <div className="li"><span className="lbl">Capital rembourse sur {horizon} ans</span><span className="pos">{euro(capitalRembourse)}</span></div>
            <div className="li"><span className="lbl">Capital restant du (solde du pret)</span><span className="neg">{euro(crd)}</span></div>
            <div className="li"><span className="lbl">Cashflow cumule apres impot ({horizon} ans)</span><span className={cumulCashflow >= 0 ? "pos" : "neg"}>{cumulCashflow >= 0 ? "+ " : "- "}{euro(Math.abs(cumulCashflow))}</span></div>
            <div className="li"><span className="lbl">Capitaux recuperes a la revente</span><span>{euro(exitEquity)}</span></div>
            <div className="li total"><span>Patrimoine net cree (vs apport)</span><span className={patrimoineNet >= 0 ? "pos" : "neg"}>{patrimoineNet >= 0 ? "+ " : "- "}{euro(Math.abs(patrimoineNet))}</span></div>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>Le TRI agrege apport, cashflows annuels et revente : c'est le vrai rendement de l'operation. Hypotheses : cashflow annuel constant, prix +{pct(v("appreciation"))}/an, hors frais d'agence a la revente et surtaxe sur plus-value &gt; 50 000 EUR.</p>

          <div className={"badge " + vClass}>{verdict}</div>
        </div>
      </div>
    </div>
      )}
      {rentaTab === "classique" && (
        <TableauAmortissement loan={loan} rate={v("rate")} duration={v("duration")} mInsurance={mLoanIns} />
      )}
    </>
  );
}

/* ======================= AIRBNB / SAISONNIER ============================= */
function initCustomCal(zone, tarifBase) {
  return zone.saisons.map((s, i) => ({
    nuits: Math.round(DAYS_IN_MONTH[i] * s.taux),
    tarif: Math.round(tarifBase * s.mult),
  }));
}

function AirbnbPredictif({ months, annualNetAirbnb, annualOperating, totalNuits, occupancyRate, zone, tarifBase }) {
  const euro0 = (n) => new Intl.NumberFormat("fr-FR", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n);
  const GROWTH_SCENARIOS = [
    { label:"Pessimiste", color:"var(--bad)",    tarifGrowth:-0.05, occGrowth:-0.03 },
    { label:"Réaliste",   color:"var(--warn)",   tarifGrowth: 0.03, occGrowth: 0.01 },
    { label:"Optimiste",  color:"var(--green)",  tarifGrowth: 0.07, occGrowth: 0.03 },
  ];

  // Project 3 years of monthly revenue for each scenario
  const years = [1, 2, 3];
  const scenarios = GROWTH_SCENARIOS.map(sc => {
    const yearlyRevs = years.map(yr => {
      return months.reduce((sum, m) => {
        const tarif = Math.round(m.tarif * Math.pow(1 + sc.tarifGrowth, yr - 1));
        const nuits = Math.round(m.nuits * Math.pow(1 + sc.occGrowth, yr - 1));
        const sejours = Math.max(1, Math.round(nuits / 4));
        return sum + nuits * tarif;
      }, 0);
    });
    return { ...sc, yearlyRevs };
  });

  // Monthly bars for Year 1 (realistic) vs Year 3 (realistic)
  const realisticIdx = 1;
  const realisticSc = scenarios[realisticIdx];
  const maxMonthlyRev = Math.max(...months.map(m => m.nuits * m.tarif * Math.pow(1 + realisticSc.tarifGrowth, 2)));

  // Key metrics
  const adr = totalNuits > 0 ? Math.round(months.reduce((s,m) => s + m.nuits * m.tarif, 0) / totalNuits) : 0;
  const revpar = Math.round(adr * (occupancyRate / 100));

  return (
    <div className="card">
      <h2>🔮 Prévisionnel sur 3 ans — {zone.label}</h2>
      <p className="hint">Projection basée sur vos paramètres actuels avec 3 scénarios de croissance (tarifs + occupation).</p>

      {/* KPIs année 0 */}
      <div className="pred-kpis">
        <div className="pred-kpi">
          <div className="pred-kpi-val">{adr} €</div>
          <div className="pred-kpi-label">ADR — Tarif moy./nuit</div>
        </div>
        <div className="pred-kpi">
          <div className="pred-kpi-val">{revpar} €</div>
          <div className="pred-kpi-label">RevPAR</div>
        </div>
        <div className="pred-kpi">
          <div className="pred-kpi-val">{totalNuits} nuits</div>
          <div className="pred-kpi-label">Nuits louées / an</div>
        </div>
        <div className="pred-kpi">
          <div className="pred-kpi-val">{occupancyRate} %</div>
          <div className="pred-kpi-label">Taux d'occupation</div>
        </div>
      </div>

      {/* 3-year projection table */}
      <div className="pred-table-wrap">
        <table className="pred-table">
          <thead>
            <tr>
              <th>Scénario</th>
              <th className="num">Hypothèses</th>
              <th className="num">An 1</th>
              <th className="num">An 2</th>
              <th className="num">An 3</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((sc, i) => (
              <tr key={i}>
                <td><span className="pred-dot" style={{background:sc.color}}/><b>{sc.label}</b></td>
                <td className="num" style={{fontSize:11,color:"var(--muted)"}}>
                  tarif {sc.tarifGrowth > 0 ? "+" : ""}{Math.round(sc.tarifGrowth*100)}%/an<br/>
                  occ. {sc.occGrowth > 0 ? "+" : ""}{Math.round(sc.occGrowth*100)}%/an
                </td>
                {sc.yearlyRevs.map((rev, j) => (
                  <td key={j} className="num" style={{color: sc.color, fontWeight: j === 2 ? 700 : 400}}>
                    {euro0(rev)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Monthly bars: Year 1 vs Year 3 (realistic) */}
      <div className="section-t" style={{marginTop:18}}>Revenu mensuel — Réaliste : An 1 vs An 3</div>
      <div className="pred-chart">
        {months.map((m, i) => {
          const rev1 = m.nuits * m.tarif;
          const rev3 = Math.round(m.nuits * Math.pow(1 + realisticSc.occGrowth, 2) * m.tarif * Math.pow(1 + realisticSc.tarifGrowth, 2));
          const maxRev = Math.max(...months.map(x => x.nuits * x.tarif * Math.pow(1 + realisticSc.tarifGrowth, 2) * Math.pow(1 + realisticSc.occGrowth, 2)));
          return (
            <div key={i} className="pred-bar-col">
              <div className="pred-bar-group">
                <div className="pred-bar pred-bar-y1" style={{height:`${Math.round(rev1/maxRev*80)}px`}} title={`An 1 : ${euro0(rev1)}`}/>
                <div className="pred-bar pred-bar-y3" style={{height:`${Math.round(rev3/maxRev*80)}px`}} title={`An 3 : ${euro0(rev3)}`}/>
              </div>
              <div className="pred-bar-label">{m.name.slice(0,3)}</div>
            </div>
          );
        })}
      </div>
      <div className="pred-legend">
        <span><span className="pred-dot" style={{background:"var(--accent)"}}/>An 1</span>
        <span><span className="pred-dot" style={{background:"var(--green)"}}/>An 3</span>
      </div>

      <p className="hint" style={{marginTop:12}}>
        ⚠️ Projections indicatives — basées sur les tendances saisonnières de {zone.label}. La réglementation locale, la concurrence et la qualité de l'annonce impactent significativement les résultats réels.
      </p>
    </div>
  );
}

function RentabiliteAirbnb({ estValue, estCity, classicYieldGross, classicCashflowAT }) {
  const [f, setF] = useState({
    zone: "paris",
    isPrimary: true,
    tarifBase: 120,
    nPersonnes: 4,
    cleaningFee: 60,
    avgStay: 3,
    platformFee: 0.15,
    mgmt: 0,
    insuranceAirbnb: 350,
    price: estValue || 300000,
    notaryRate: 0.075,
    works: 0,
    apport: 40000,
    duration: 20,
    rate: 3.5,
    loanInsurance: 0.34,
    taxe: 1100,
    chargesCopro: 2400,
    tmi: 0.3,
    regime: "microbic",
    vacancyAdj: 0,      // global vacancy adjustment in auto mode (0 = use zone data as-is)
    calMode: "auto",    // "auto" | "manual"
  });

  const [airbnbTab, setAirbnbTab] = useState("analyse"); // "analyse" | "predictif"

  // manual calendar: 12 objects {nuits, tarif} — initialized from zone data
  const [customCal, setCustomCal] = useState(() =>
    initCustomCal(AIRBNB_ZONES["paris"], 120)
  );

  const [synced, setSynced] = useState(false);
  if (!synced && estValue && f.price !== estValue) {
    setF((x) => ({ ...x, price: estValue }));
    setSynced(true);
  }

  // auto-sync city from estimation tab
  const [citySynced, setCitySynced] = useState(false);
  if (!citySynced && estCity && AIRBNB_ZONES[estCity] && f.zone !== estCity) {
    setF((x) => ({ ...x, zone: estCity }));
    setCustomCal(initCustomCal(AIRBNB_ZONES[estCity], f.tarifBase));
    setCitySynced(true);
  }

  const setV = (k, v) => setF((s) => ({ ...s, [k]: isNaN(Number(v)) || v === "" ? v : Number(v) }));
  const setS = (k, v) => setF((s) => ({ ...s, [k]: v }));

  // when zone changes in auto mode, reset custom cal
  function handleZoneChange(newZone) {
    setS("zone", newZone);
    setCustomCal(initCustomCal(AIRBNB_ZONES[newZone], f.tarifBase));
  }

  // when switching to manual, pre-fill with current auto data
  function handleCalMode(mode) {
    if (mode === "manual") {
      const zone = AIRBNB_ZONES[f.zone];
      const vacAdj = 1 - (f.vacancyAdj / 100);
      setCustomCal(zone.saisons.map((s, i) => ({
        nuits: Math.max(0, Math.round(DAYS_IN_MONTH[i] * s.taux * vacAdj)),
        tarif: Math.round(f.tarifBase * s.mult),
      })));
    }
    setS("calMode", mode);
  }

  function updateCustomMonth(i, field, val) {
    setCustomCal((prev) => prev.map((m, idx) =>
      idx === i ? { ...m, [field]: Math.max(0, Number(val) || 0) } : m
    ));
  }

  const zone = AIRBNB_ZONES[f.zone];
  const loi = zone.loi;

  // Monthly revenue simulation
  const months = zone.saisons.map((s, i) => {
    const days = DAYS_IN_MONTH[i];
    let nuits, tarif;
    if (f.calMode === "manual") {
      nuits = Math.min(customCal[i].nuits, days);
      tarif = customCal[i].tarif;
    } else {
      const vacAdj = 1 - (f.vacancyAdj / 100);
      nuits = Math.round(days * s.taux * vacAdj);
      tarif = Math.round(f.tarifBase * s.mult);
    }
    const sejours = Math.max(1, Math.round(nuits / Math.max(1, f.avgStay)));
    const revenueGross = nuits * tarif + sejours * f.cleaningFee;
    const platformCut = revenueGross * f.platformFee;
    const netHost = revenueGross - platformCut;
    const taux = nuits / days;
    return {
      name: MONTH_NAMES[i], days, nuits, tarif, sejours, revenueGross, platformCut, netHost, taux,
      isHaute: taux >= 0.75, isMoyenne: taux >= 0.45 && taux < 0.75,
      events: s.events || "",
    };
  });

  const totalNuits = months.reduce((a, m) => a + m.nuits, 0);
  const annualRevenueGross = months.reduce((a, m) => a + m.revenueGross, 0);
  const annualPlatformFee = months.reduce((a, m) => a + m.platformCut, 0);
  const annualNetAirbnb = months.reduce((a, m) => a + m.netHost, 0);
  const occupancyRate = Math.round((totalNuits / 365) * 100);

  const isCapped = f.isPrimary && loi.limite && totalNuits > loi.limite;
  const ratio = isCapped ? loi.limite / totalNuits : 1;
  const annualRevenueCapped = annualNetAirbnb * ratio;
  const effectiveNuits = isCapped ? loi.limite : totalNuits;

  const annualMgmt = annualRevenueCapped * f.mgmt;
  const annualInsurance = Number(f.insuranceAirbnb);
  const annualCopro = Number(f.chargesCopro);
  const annualTaxe = Number(f.taxe);
  const annualOperating = annualMgmt + annualInsurance + annualCopro + annualTaxe;

  const price = Number(f.price) || 0;
  const notaire = price * f.notaryRate;
  const totalCost = price + notaire + Number(f.works);
  const loan = Math.max(0, totalCost - Number(f.apport));
  const mPrincipal = pmt(loan, Number(f.rate), Number(f.duration));
  const mLoanIns = (loan * (Number(f.loanInsurance) / 100)) / 12;
  const mPayment = mPrincipal + mLoanIns;
  const annualLoan = mPayment * 12;

  const annualCashflow = annualRevenueCapped - annualOperating - annualLoan;

  const abatt = f.regime === "microbic71" ? 0.71 : 0.50;
  const taxableBase = Math.max(0, annualRevenueCapped * (1 - abatt));
  const PS = 0.172;
  const incomeTax = taxableBase * (Number(f.tmi) + PS);
  const cashflowAfterTax = annualCashflow - incomeTax;
  const mCashflowAT = cashflowAfterTax / 12;

  const yieldGross = price > 0 ? (annualRevenueGross / price) * 100 : 0;
  const yieldNet = totalCost > 0 ? ((annualRevenueCapped - annualOperating) / totalCost) * 100 : 0;
  const yieldNetNet = totalCost > 0 ? ((annualRevenueCapped - annualOperating - incomeTax) / totalCost) * 100 : 0;

  const yClass = (y) => (y >= 6 ? "g" : y >= 4 ? "w" : "b");
  const cClass = (x) => (x >= 0 ? "g" : "b");

  return (
    <div className="grid">
      {/* --- INPUTS --- */}
      <div>
        <div className="card">
          <h2>Zone &amp; type de location</h2>
          <label>Ville / Région</label>
          <select value={f.zone} onChange={(e) => handleZoneChange(e.target.value)}>
            <optgroup label="── Paris & Île-de-France">
              <option value="paris">Paris</option>
              <option value="versailles">Versailles & Yvelines</option>
            </optgroup>
            <optgroup label="── Côte d'Azur">
              <option value="cannes">Cannes</option>
              <option value="nice">Nice</option>
              <option value="antibes">Antibes / Juan-les-Pins</option>
              <option value="saint_tropez">Saint-Tropez & Golfe de Saint-Tropez</option>
              <option value="menton">Menton</option>
            </optgroup>
            <optgroup label="── Alpes & Montagne">
              <option value="chamonix">Chamonix</option>
              <option value="courchevel">Courchevel / Val d'Isère / Méribel</option>
              <option value="annecy">Annecy</option>
            </optgroup>
            <optgroup label="── Occitanie & Provence">
              <option value="toulouse">Toulouse</option>
              <option value="montpellier">Montpellier</option>
              <option value="avignon">Avignon</option>
              <option value="aix_en_provence">Aix-en-Provence</option>
              <option value="marseille">Marseille</option>
            </optgroup>
            <optgroup label="── Atlantique & Pays Basque">
              <option value="biarritz">Biarritz</option>
              <option value="saint_jean_luz">Saint-Jean-de-Luz / Hendaye</option>
              <option value="la_rochelle">La Rochelle & Île de Ré</option>
              <option value="bordeaux">Bordeaux</option>
            </optgroup>
            <optgroup label="── Bretagne & Normandie">
              <option value="saint_malo">Saint-Malo</option>
              <option value="vannes_morbihan">Vannes & Golfe du Morbihan</option>
              <option value="deauville">Deauville / Honfleur / Côte Fleurie</option>
            </optgroup>
            <optgroup label="── Grandes villes">
              <option value="lyon">Lyon</option>
              <option value="strasbourg">Strasbourg</option>
              <option value="nantes">Nantes</option>
              <option value="rennes">Rennes</option>
              <option value="lille">Lille</option>
            </optgroup>
            <optgroup label="── Autre">
              <option value="autre">Autre ville / zone rurale</option>
            </optgroup>
          </select>
          <label>Type de résidence</label>
          <select value={f.isPrimary ? "1" : "0"} onChange={(e) => setV("isPrimary", e.target.value === "1" ? 1 : 0)}>
            <option value="1">Résidence principale</option>
            <option value="0">Résidence secondaire / investissement</option>
          </select>
          <div className={"loi-alert " + (loi.limite && f.isPrimary ? "warn" : "ok")}>
            <div className="loi-title">⚖️ Réglementation locale</div>
            <p style={{margin:"6px 0 0",fontSize:12.5}}>{loi.info}</p>
            {loi.limite && f.isPrimary && (
              <p style={{margin:"8px 0 0",fontSize:12.5}} className={isCapped ? "neg" : "pos"}>
                {isCapped
                  ? `⚠️ Votre calendrier (${totalNuits} nuits) dépasse la limite légale de ${loi.limite} nuits. Revenus plafonnés automatiquement.`
                  : `✓ Votre calendrier (${totalNuits} nuits) respecte la limite de ${loi.limite} nuits.`}
              </p>
            )}
            {loi.enregistrement && (
              <p style={{margin:"6px 0 0",fontSize:12}} className="warn">
                📋 Numéro d'enregistrement obligatoire — à demander en mairie avant toute mise en location.
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <h2>Tarification &amp; séjours</h2>
          <div className="row">
            <div>
              <label>Tarif nuit de base</label>
              <div className="unit"><input type="number" value={f.tarifBase} onChange={(e) => setV("tarifBase", e.target.value)} /><small>EUR</small></div>
            </div>
            <div>
              <label>Capacité</label>
              <div className="unit"><input type="number" value={f.nPersonnes} onChange={(e) => setV("nPersonnes", e.target.value)} /><small>pers.</small></div>
            </div>
          </div>
          <div className="row">
            <div>
              <label>Durée moyenne séjour</label>
              <div className="unit"><input type="number" value={f.avgStay} onChange={(e) => setV("avgStay", e.target.value)} /><small>jours</small></div>
            </div>
            <div>
              <label>Frais de ménage / séjour</label>
              <div className="unit"><input type="number" value={f.cleaningFee} onChange={(e) => setV("cleaningFee", e.target.value)} /><small>EUR</small></div>
            </div>
          </div>
          <div className="row">
            <div>
              <label>Commission plateforme</label>
              <select value={f.platformFee} onChange={(e) => setV("platformFee", e.target.value)}>
                <option value="0.03">3 % — frais hôte split (Airbnb)</option>
                <option value="0.15">15 % — frais hôte seul (Airbnb)</option>
                <option value="0.20">20 % — Booking / autres</option>
              </select>
            </div>
            <div>
              <label>Conciergerie / gestion</label>
              <select value={f.mgmt} onChange={(e) => setV("mgmt", e.target.value)}>
                <option value="0">Gestion perso (0 %)</option>
                <option value="0.15">Conciergerie (15 %)</option>
                <option value="0.20">Conciergerie premium (20 %)</option>
                <option value="0.25">Full-service (25 %)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Calendrier &amp; occupation — {zone.label}</h2>
          <div className="cal-mode-toggle">
            <button className={"cmt" + (f.calMode === "auto" ? " cmt-active" : "")} onClick={() => handleCalMode("auto")}>
              🤖 Automatique (données {zone.label})
            </button>
            <button className={"cmt" + (f.calMode === "manual" ? " cmt-active" : "")} onClick={() => handleCalMode("manual")}>
              ✏️ Saisie manuelle par mois
            </button>
          </div>

          {f.calMode === "auto" && (
            <>
              <label style={{marginTop:14,display:"block"}}>
                Ajustement taux d'occupation global
                <span className="vacancy-val"> {f.vacancyAdj > 0 ? `-${f.vacancyAdj}` : f.vacancyAdj < 0 ? `+${Math.abs(f.vacancyAdj)}` : "aucun"} %</span>
              </label>
              <div className="vacancy-slider-wrap">
                <span className="vs-label">Optimiste</span>
                <input type="range" min="-10" max="40" step="1" value={f.vacancyAdj}
                  onChange={(e) => setV("vacancyAdj", e.target.value)}
                  className="vacancy-slider" />
                <span className="vs-label">Prudent</span>
              </div>
              <div className="season-grid" style={{marginTop:12}}>
                {months.map((m, i) => (
                  <div key={i} className={"season-cell " + (m.isHaute ? "haute" : m.isMoyenne ? "moyenne" : "basse")}>
                    <div className="sc-month">{m.name}</div>
                    <div className="sc-tarif">{m.tarif}€/n</div>
                    <div className="sc-taux">{Math.round(m.taux * 100)}%</div>
                    <div className="sc-nuits">{m.nuits}n</div>
                  </div>
                ))}
              </div>
              <div className="season-legend">
                <span className="sl haute">■ Haute saison ≥75%</span>
                <span className="sl moyenne">■ Moyenne 45-75%</span>
                <span className="sl basse">■ Basse &lt;45%</span>
              </div>
              <div className="cal-annual-summary">
                <div className="cas-item">
                  <div className="cas-val">{totalNuits} nuits</div>
                  <div className="cas-label">Nuits louées / an</div>
                </div>
                <div className="cas-sep"/>
                <div className="cas-item">
                  <div className="cas-val" style={{color: occupancyRate >= 75 ? "var(--green)" : occupancyRate >= 45 ? "var(--warn)" : "var(--muted)"}}>{occupancyRate} %</div>
                  <div className="cas-label">Taux d'occupation annuel</div>
                </div>
                <div className="cas-sep"/>
                <div className="cas-item">
                  <div className="cas-val">{Math.round(365 - totalNuits)} jours</div>
                  <div className="cas-label">Jours non loués / an</div>
                </div>
                <div className="cas-sep"/>
                <div className="cas-item">
                  <div className="cas-val" style={{color:"var(--accent)"}}>{euro0(annualRevenueGross)}</div>
                  <div className="cas-label">Revenu brut estimé / an</div>
                </div>
              </div>
            </>
          )}

          {f.calMode === "manual" && (
            <>
              <p className="hint" style={{marginTop:10}}>Saisissez le nombre de nuits louées et le tarif/nuit pour chaque mois. Les frais de ménage s'ajoutent par séjour.</p>
              <div className="cal-manual-scroll">
                <table className="cal-manual-table">
                  <thead>
                    <tr>
                      <th>Mois</th>
                      <th>Jours dispo</th>
                      <th className="num">Nuits louées</th>
                      <th className="num">Taux occ.</th>
                      <th className="num">Tarif/nuit</th>
                      <th className="num">Revenu brut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((m, i) => (
                      <tr key={i} className={"season-row " + (m.isHaute ? "haute" : m.isMoyenne ? "moyenne" : "basse")}>
                        <td>
                          <b>{m.name}</b>
                          {m.events && <div className="month-events">{m.events}</div>}
                        </td>
                        <td style={{color:"var(--muted)",fontSize:12}}>{m.days}j</td>
                        <td>
                          <input type="number" min="0" max={m.days} value={customCal[i].nuits}
                            onChange={(e) => updateCustomMonth(i, "nuits", e.target.value)}
                            className="cal-input" />
                        </td>
                        <td className="num" style={{fontSize:12}}>
                          <span className={"taux-pill " + (m.isHaute ? "haute" : m.isMoyenne ? "moyenne" : "basse")}>
                            {Math.round(m.taux * 100)} %
                          </span>
                        </td>
                        <td>
                          <input type="number" min="0" value={customCal[i].tarif}
                            onChange={(e) => updateCustomMonth(i, "tarif", e.target.value)}
                            className="cal-input" />
                        </td>
                        <td className="num"><b>{euro0(m.revenueGross)}</b></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="cal-total-row">
                      <td colSpan="2"><b>Total</b></td>
                      <td className="num"><b>{totalNuits} nuits</b></td>
                      <td className="num"><b>{occupancyRate} %</b></td>
                      <td></td>
                      <td className="num"><b>{euro0(annualRevenueGross)}</b></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <h2>Charges annuelles</h2>
          <div className="row">
            <div>
              <label>Charges de copro / an</label>
              <div className="unit"><input type="number" value={f.chargesCopro} onChange={(e) => setV("chargesCopro", e.target.value)} /><small>EUR</small></div>
            </div>
            <div>
              <label>Taxe foncière / an</label>
              <div className="unit"><input type="number" value={f.taxe} onChange={(e) => setV("taxe", e.target.value)} /><small>EUR</small></div>
            </div>
          </div>
          <label>Assurance PNO + loc. saisonnière / an</label>
          <div className="unit"><input type="number" value={f.insuranceAirbnb} onChange={(e) => setV("insuranceAirbnb", e.target.value)} /><small>EUR</small></div>
          <p className="hint">Airbnb fournit AirCover (protection hôte), mais une assurance dédiée courte durée est fortement recommandée.</p>
        </div>

        <div className="card">
          <h2>Acquisition &amp; financement</h2>
          <div className="row">
            <div>
              <label>Prix d'achat</label>
              <div className="unit"><input type="number" value={f.price} onChange={(e) => setV("price", e.target.value)} /><small>EUR</small></div>
            </div>
            <div>
              <label>Frais de notaire</label>
              <select value={f.notaryRate} onChange={(e) => setV("notaryRate", e.target.value)}>
                <option value="0.075">Ancien (~7,5 %)</option>
                <option value="0.025">Neuf (~2,5 %)</option>
              </select>
            </div>
          </div>
          <div className="row">
            <div>
              <label>Apport</label>
              <div className="unit"><input type="number" value={f.apport} onChange={(e) => setV("apport", e.target.value)} /><small>EUR</small></div>
            </div>
            <div>
              <label>Durée crédit</label>
              <div className="unit"><input type="number" value={f.duration} onChange={(e) => setV("duration", e.target.value)} /><small>ans</small></div>
            </div>
          </div>
          <div className="row">
            <div>
              <label>Taux d'intérêt</label>
              <div className="unit"><input type="number" step="0.01" value={f.rate} onChange={(e) => setV("rate", e.target.value)} /><small>%</small></div>
            </div>
            <div>
              <label>Assurance emprunteur</label>
              <div className="unit"><input type="number" step="0.01" value={f.loanInsurance} onChange={(e) => setV("loanInsurance", e.target.value)} /><small>%/an</small></div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Fiscalité</h2>
          <div className="sub">Location Airbnb = meublé = régime BIC (jamais micro-foncier)</div>
          <label>Régime fiscal</label>
          <select value={f.regime} onChange={(e) => setS("regime", e.target.value)}>
            <option value="microbic">Micro-BIC — abattement 50 %</option>
            <option value="microbic71">Micro-BIC meublé tourisme classé — abattement 71 %</option>
            <option value="lmnp">LMNP réel (amortissement — estimation indicative)</option>
          </select>
          <label>Tranche marginale d'imposition (TMI)</label>
          <select value={f.tmi} onChange={(e) => setV("tmi", e.target.value)}>
            <option value="0">0 % (non imposable)</option>
            <option value="0.11">11 %</option>
            <option value="0.3">30 %</option>
            <option value="0.41">41 %</option>
            <option value="0.45">45 %</option>
          </select>
          <p className="hint">LMNP réel : l'amortissement peut effacer l'impôt plusieurs années. Consultez un expert-comptable pour une simulation précise.</p>
        </div>
      </div>

      {/* --- RESULTS --- */}
      <div>
        <div className="airbnb-tabs">
          <button className={"abt" + (airbnbTab === "analyse" ? " abt-active" : "")} onClick={() => setAirbnbTab("analyse")}>📊 Analyse actuelle</button>
          <button className={"abt" + (airbnbTab === "predictif" ? " abt-active" : "")} onClick={() => setAirbnbTab("predictif")}>🔮 Prévisionnel N+3</button>
        </div>

        {airbnbTab === "predictif" && (
          <AirbnbPredictif
            months={months}
            annualNetAirbnb={annualNetAirbnb}
            annualOperating={annualOperating}
            totalNuits={totalNuits}
            occupancyRate={occupancyRate}
            zone={zone}
            tarifBase={f.tarifBase}
          />
        )}
        {airbnbTab === "analyse" && (<>
        <div className="card">
          <h2>Analyse Airbnb / Saisonnier</h2>
          <div className="sub">{zone.label} &mdash; {effectiveNuits} nuits louées / an{isCapped ? " (plafonnées)" : ""} &mdash; taux d'occupation moyen <b>{occupancyRate} %</b></div>

          <div className="kpis">
            <div className="kpi"><div className="k">Rendement brut</div><div className={"v " + yClass(yieldGross)}>{pct(yieldGross)}</div></div>
            <div className="kpi"><div className="k">Rendement net</div><div className={"v " + yClass(yieldNet)}>{pct(yieldNet)}</div></div>
            <div className="kpi"><div className="k">Rendement net-net</div><div className={"v " + yClass(yieldNetNet)}>{pct(yieldNetNet)}</div></div>
          </div>

          <div className="section-t">Revenus annuels</div>
          <div className="line-items">
            <div className="li"><span className="lbl">Revenu brut (nuits + ménage)</span><span className="pos">+ {euro(annualRevenueGross * ratio)}</span></div>
            <div className="li"><span className="lbl">Commission plateforme ({Math.round(f.platformFee * 100)} %)</span><span className="neg">- {euro(annualPlatformFee * ratio)}</span></div>
            <div className="li total"><span>Revenu net hôte</span><span className="v">{euro(annualRevenueCapped)}</span></div>
          </div>

          <div className="section-t">Charges &amp; crédit</div>
          <div className="line-items">
            <div className="li"><span className="lbl">Charges copro (100 % propriétaire)</span><span className="neg">- {euro(annualCopro)}</span></div>
            <div className="li"><span className="lbl">Taxe foncière</span><span className="neg">- {euro(annualTaxe)}</span></div>
            <div className="li"><span className="lbl">Assurance</span><span className="neg">- {euro(annualInsurance)}</span></div>
            {f.mgmt > 0 && <div className="li"><span className="lbl">Conciergerie ({Math.round(f.mgmt * 100)} %)</span><span className="neg">- {euro(annualMgmt)}</span></div>}
            <div className="li"><span className="lbl">Remboursement crédit / an</span><span className="neg">- {euro(annualLoan)}</span></div>
            <div className="li total"><span>Cashflow annuel (av. impôt)</span>
              <span className={annualCashflow >= 0 ? "pos" : "neg"}>{annualCashflow >= 0 ? "+ " : "- "}{euro(Math.abs(annualCashflow))}</span>
            </div>
          </div>

          <div className="section-t">Fiscalité</div>
          <div className="line-items">
            <div className="li"><span className="lbl">Base imposable / an</span><span>{euro(taxableBase)}</span></div>
            <div className="li"><span className="lbl">Impôt (IR {Math.round(f.tmi * 100)} % + PS 17,2 %)</span><span className="neg">- {euro(incomeTax)}/an</span></div>
            <div className="li total"><span>Cashflow après impôt</span>
              <span className={cashflowAfterTax >= 0 ? "pos" : "neg"}>{cashflowAfterTax >= 0 ? "+ " : "- "}{euro(Math.abs(cashflowAfterTax))}/an</span>
            </div>
          </div>

          <div className="kpis" style={{ marginTop: 14 }}>
            <div className="kpi"><div className="k">Cashflow / mois (ap. impôt)</div><div className={"v " + cClass(mCashflowAT)}>{mCashflowAT >= 0 ? "+" : "-"}{euro0(Math.abs(mCashflowAT))} EUR</div></div>
            <div className="kpi"><div className="k">Mensualité crédit</div><div className="v">{euro0(mPayment)} EUR</div></div>
            <div className="kpi"><div className="k">Impôt / mois</div><div className="v w">{euro0(incomeTax / 12)} EUR</div></div>
          </div>

          <div className="section-t">Détail mensuel</div>
          <div className="cal-result-scroll">
            <table className="cal-result-table">
              <thead>
                <tr>
                  <th>Mois</th>
                  <th className="num">Nuits</th>
                  <th className="num">Occ.</th>
                  <th className="num">Tarif/n</th>
                  <th className="num">Brut</th>
                  <th className="num">Plateforme</th>
                  <th className="num">Net hôte</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => (
                  <tr key={i} className={"season-row " + (m.isHaute ? "haute" : m.isMoyenne ? "moyenne" : "basse")}>
                    <td>
                      <b>{m.name}</b>
                      {m.events && <div className="month-events">{m.events}</div>}
                    </td>
                    <td className="num">{m.nuits}</td>
                    <td className="num">
                      <span className={"taux-pill " + (m.isHaute ? "haute" : m.isMoyenne ? "moyenne" : "basse")}>
                        {Math.round(m.taux * 100)} %
                      </span>
                    </td>
                    <td className="num">{m.tarif} €</td>
                    <td className="num">{euro0(m.revenueGross)}</td>
                    <td className="num neg">-{euro0(m.platformCut)}</td>
                    <td className="num"><b>{euro0(m.netHost)}</b></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="cal-total-row">
                  <td><b>Total</b></td>
                  <td className="num"><b>{totalNuits}</b></td>
                  <td className="num"><b>{occupancyRate} %</b></td>
                  <td></td>
                  <td className="num"><b>{euro0(annualRevenueGross * ratio)}</b></td>
                  <td className="num neg"><b>-{euro0(annualPlatformFee * ratio)}</b></td>
                  <td className="num pos"><b>{euro0(annualRevenueCapped)}</b></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {classicYieldGross !== undefined && (
          <div className="card">
            <h2>Comparaison : Classique vs Airbnb</h2>
            <div className="sub">Même bien, même financement</div>
            <div className="compare-grid">
              <div className="cmp-col">
                <div className="cmp-head">📋 Location classique</div>
                <div className="cmp-row"><span>Rendement brut</span><span className={classicYieldGross >= 5 ? "pos" : classicYieldGross < 3 ? "neg" : "warn"}>{pct(classicYieldGross)}</span></div>
                <div className="cmp-row"><span>Cashflow / mois</span><span className={classicCashflowAT >= 0 ? "pos" : "neg"}>{classicCashflowAT >= 0 ? "+" : "-"}{euro0(Math.abs(classicCashflowAT))} EUR</span></div>
                <div className="cmp-row"><span>Gestion</span><span>Simple</span></div>
                <div className="cmp-row"><span>Vacance</span><span>Faible</span></div>
                <div className="cmp-row"><span>Réglementation</span><span className="pos">Stable</span></div>
              </div>
              <div className="cmp-col">
                <div className="cmp-head airbnb">🏠 Airbnb / Saisonnier</div>
                <div className="cmp-row"><span>Rendement brut</span><span className={yieldGross >= 5 ? "pos" : yieldGross < 3 ? "neg" : "warn"}>{pct(yieldGross)}</span></div>
                <div className="cmp-row"><span>Cashflow / mois</span><span className={mCashflowAT >= 0 ? "pos" : "neg"}>{mCashflowAT >= 0 ? "+" : "-"}{euro0(Math.abs(mCashflowAT))} EUR</span></div>
                <div className="cmp-row"><span>Gestion</span><span className="warn">Intensive</span></div>
                <div className="cmp-row"><span>Vacance</span><span className="warn">Saisonnière</span></div>
                <div className="cmp-row"><span>Réglementation</span><span className={loi.limite ? "warn" : "pos"}>{loi.limite ? `⚠️ ${loi.limite} n/an max` : "✓ Souple"}</span></div>
              </div>
            </div>
            <p className="hint">Les revenus Airbnb sont estimatifs et dépendent de la qualité de l'annonce, des avis, et d'une gestion active du calendrier.</p>
          </div>
        )}
        </>)}
      </div>
    </div>
  );
}

/* ======================= TAB 3 : SOURCES & DONNÉES ======================= */
const SOURCES_DATA = [
  {
    categorie: "Transactions immobilières",
    sources: [
      {
        nom: "DVF — Demandes de Valeurs Foncières",
        organisme: "DGFiP / Etalab",
        utilisation: "Base de toutes les estimations de prix. Contient chaque vente immobilière depuis 2018 avec adresse, surface, prix, date.",
        frequence: "Mise à jour semestrielle (avril & octobre)",
        refresh: "auto",
        url: "https://files.data.gouv.fr/geo-dvf/latest/",
        statut: "✅ Actif — appelé en temps réel à chaque estimation",
      },
      {
        nom: "DVF+ / DV3F",
        organisme: "Cerema",
        utilisation: "DVF enrichi avec contexte urbanistique, type de logement précisé, mutations complexes analysées.",
        frequence: "Annuelle",
        refresh: "a_integrer",
        url: "https://datafoncier.cerema.fr",
        statut: "⏳ Non intégré — enrichirait la fiabilité des comparables",
      },
      {
        nom: "Indices Notaires-INSEE",
        organisme: "INSEE / Notaires de France",
        utilisation: "Prix/m² médian par département et type de bien, évolution trimestrielle sur 20 ans.",
        frequence: "Trimestrielle",
        refresh: "manuel",
        url: "https://www.insee.fr/fr/statistiques/1913143",
        statut: "⚠️ Partiellement intégré — baromètre manuel, intégration API possible",
      },
    ],
  },
  {
    categorie: "Géocodage & Cartographie",
    sources: [
      {
        nom: "BAN — Base Adresses Nationale (IGN Géoplateforme)",
        organisme: "IGN / DINUM",
        utilisation: "Autocomplétion d'adresses, conversion adresse → coordonnées GPS précises.",
        frequence: "Continue (base vivante)",
        refresh: "auto",
        url: "https://geoplateforme.ign.fr",
        statut: "✅ Actif — utilisé pour chaque saisie d'adresse",
      },
      {
        nom: "OpenStreetMap / Overpass API",
        organisme: "OpenStreetMap Foundation",
        utilisation: "Détection des commodités à proximité : transports, commerces, écoles, parcs.",
        frequence: "Continue",
        refresh: "auto",
        url: "https://overpass-api.de",
        statut: "✅ Actif — appelé à chaque estimation",
      },
      {
        nom: "GPU — Géoportail de l'Urbanisme",
        organisme: "DGALN / Ministère du Logement",
        utilisation: "PLU, zonage constructible, hauteurs autorisées, servitudes. Potentiel de surélévation ou division.",
        frequence: "Continue",
        refresh: "a_integrer",
        url: "https://www.geoportail-urbanisme.gouv.fr",
        statut: "⏳ Non intégré — ajouterait une couche urbanistique précieuse",
      },
    ],
  },
  {
    categorie: "DPE & Performance Énergétique",
    sources: [
      {
        nom: "Base DPE nationale",
        organisme: "ADEME",
        utilisation: "DPE réel par adresse (étiquette A→G, consommation kWh/m²/an). Permet un ajustement de prix DPE précis et non estimé.",
        frequence: "Continue (nouveaux DPE en temps réel)",
        refresh: "a_integrer",
        url: "https://data.ademe.fr/datasets/dpe-v2-logements-existants",
        statut: "⏳ Non intégré — priorité haute : +/- 15 à 30 % sur le prix depuis la loi Climat 2021",
      },
      {
        nom: "BDNB — Base de Données Nationale des Bâtiments",
        organisme: "CSTB",
        utilisation: "Caractéristiques thermiques, année de construction précise, type de chauffage par bâtiment.",
        frequence: "Annuelle",
        refresh: "a_integrer",
        url: "https://bdnb.io",
        statut: "⏳ Non intégré — complète la base DPE ADEME",
      },
    ],
  },
  {
    categorie: "Loyers & Encadrement",
    sources: [
      {
        nom: "Encadrement des loyers",
        organisme: "DRIHL / Making Sense Labs",
        utilisation: "Loyers de référence légaux par zone, type et surface à Paris, Lille, Lyon, Bordeaux, Montpellier…",
        frequence: "Annuelle (arrêté préfectoral)",
        refresh: "a_integrer",
        url: "https://encadrement-loyers.makingsenselabs.com/api",
        statut: "⏳ Non intégré — critique pour alerter si loyer saisi dépasse le plafond légal",
      },
      {
        nom: "CLAMEUR — Observatoire des loyers",
        organisme: "CLAMEUR (fédération de bailleurs)",
        utilisation: "Loyers médians de marché par ville et type de bien, évolution sur 10 ans.",
        frequence: "Annuelle",
        refresh: "manuel",
        url: "https://www.clameur.fr",
        statut: "⚠️ Non intégré — permettrait de pré-remplir le loyer réaliste par ville",
      },
    ],
  },
  {
    categorie: "Données socio-économiques (INSEE)",
    sources: [
      {
        nom: "Filosofi — Revenus médians par commune",
        organisme: "INSEE",
        utilisation: "Revenu médian, taux de pauvreté par commune. Indicateur de solvabilité des locataires et de tension du marché.",
        frequence: "Annuelle",
        refresh: "a_integrer",
        url: "https://api.insee.fr",
        statut: "⏳ Non intégré — enrichirait le score de zone",
      },
      {
        nom: "BPE — Base Permanente des Équipements",
        organisme: "INSEE",
        utilisation: "Recensement exhaustif de tous les équipements (médecins, écoles, commerces, transports) par commune. Plus fiable qu'OpenStreetMap.",
        frequence: "Annuelle",
        refresh: "a_integrer",
        url: "https://www.insee.fr/fr/statistiques/3568638",
        statut: "⏳ Non intégré — remplacerait avantageusement Overpass pour le score de quartier",
      },
      {
        nom: "Taux de chômage local",
        organisme: "INSEE",
        utilisation: "Taux de chômage par zone d'emploi. Indicateur de risque de vacance locative.",
        frequence: "Trimestrielle",
        refresh: "a_integrer",
        url: "https://api.insee.fr",
        statut: "⏳ Non intégré",
      },
    ],
  },
  {
    categorie: "Urbanisme & Construction",
    sources: [
      {
        nom: "Sit@del2",
        organisme: "SDES / Ministère de la Transition Écologique",
        utilisation: "Permis de construire accordés et logements commencés par commune. Anticipe la pression sur les prix (suroffre ou pénurie).",
        frequence: "Mensuelle",
        refresh: "a_integrer",
        url: "https://www.statistiques.developpement-durable.gouv.fr",
        statut: "⏳ Non intégré",
      },
      {
        nom: "Zonage A/B/C & PTZ",
        organisme: "DGALN",
        utilisation: "Zones d'éligibilité Pinel, PTZ, dispositifs défiscalisation. Afficher automatiquement les avantages fiscaux disponibles.",
        frequence: "Annuelle",
        refresh: "a_integrer",
        url: "https://www.service-public.fr/simulateur/calcul/zonage-abc",
        statut: "⏳ Non intégré",
      },
    ],
  },
];

const REFRESH_LABEL = {
  auto: { label: "Temps réel", cls: "src-auto" },
  manuel: { label: "Manuel (périodique)", cls: "src-manuel" },
  a_integrer: { label: "À intégrer", cls: "src-todo" },
};

/* ======================= SIMULATEUR DE TRAVAUX ============================ */
const DPE_FACTORS = { A: 0.04, B: 0.03, C: 0.01, D: 0, E: -0.03, F: -0.07, G: -0.11 };
function statutLocation(dpe) {
  if (dpe === "G") return { txt: "Interdit a la location (depuis 2025)", cls: "b" };
  if (dpe === "F") return { txt: "Loyer gele, interdit en 2028", cls: "w" };
  if (dpe === "E") return { txt: "Interdit en 2034", cls: "w" };
  return { txt: "Louable sans restriction", cls: "g" };
}

function SimulateurTravaux({ estValue, onTravaux, onGoToRenta, initialData, onData, onLoaded }) {
  const [f, setF] = useState(initialData || {
    valeur: estValue || 300000,
    dpeAvant: "F",
    dpeApres: "C",
    cout: 25000,
    aides: 8000,
    gainLoyer: 0,
  });
  useEffect(() => { if (onData) onData(f); }, [f]);
  useEffect(() => { if (initialData && onLoaded) onLoaded(); }, []);
  const set = (k, val) => setF((s) => ({ ...s, [k]: val }));
  const v = (k) => Number(f[k]) || 0;
  const [synced, setSynced] = useState(false);
  if (!synced && estValue && f.valeur !== estValue) { setF((x) => ({ ...x, valeur: estValue })); setSynced(true); }

  const fb = DPE_FACTORS[f.dpeAvant], fa = DPE_FACTORS[f.dpeApres];
  const valeur = v("valeur");
  const gainValeur = valeur * ((1 + fa) / (1 + fb) - 1);
  const coutNet = Math.max(0, v("cout") - v("aides"));
  useEffect(() => { if (onTravaux) onTravaux(coutNet); }, [coutNet, onTravaux]);
  const plusValueNette = gainValeur - coutNet;
  const roi = coutNet > 0 ? (gainValeur / coutNet) * 100 : 0;
  const gainLoyerAn = v("gainLoyer") * 12;
  const paybackAns = gainLoyerAn > 0 ? coutNet / gainLoyerAn : null;

  const sAvant = statutLocation(f.dpeAvant), sApres = statutLocation(f.dpeApres);

  let verdict, vClass;
  if (plusValueNette >= 0) { verdict = "Rentable : les travaux creent plus de valeur qu'ils ne coutent (apres aides)."; vClass = "g"; }
  else if (sAvant.cls === "b" || sAvant.cls === "w") { verdict = "A faire malgre tout : la valeur creee ne couvre pas tout le cout, mais tu debloques la location (passoire) et securises ton bien face a la loi Climat."; vClass = "w"; }
  else { verdict = "Peu rentable financierement en l'etat. A justifier surtout par le confort et l'economie d'energie."; vClass = "b"; }

  const dpeOpts = ["A", "B", "C", "D", "E", "F", "G"];

  return (
    <div className="grid">
      {/* inputs */}
      <div>
        <div className="card">
          <h2>Le projet de travaux</h2>
          <div className="sub">{estValue ? "Valeur pre-remplie depuis ton estimation." : "Renseigne la valeur du bien."}</div>
          <label>Valeur actuelle du bien</label>
          <div className="unit"><input type="number" value={f.valeur} onChange={(e) => set("valeur", e.target.value)} /><small>EUR</small></div>
          <div className="row">
            <div>
              <label>DPE actuel</label>
              <select value={f.dpeAvant} onChange={(e) => set("dpeAvant", e.target.value)}>{dpeOpts.map((d) => <option key={d}>{d}</option>)}</select>
            </div>
            <div>
              <label>DPE vise (apres travaux)</label>
              <select value={f.dpeApres} onChange={(e) => set("dpeApres", e.target.value)}>{dpeOpts.map((d) => <option key={d}>{d}</option>)}</select>
            </div>
          </div>
          <div className="row">
            <div>
              <label>Cout des travaux</label>
              <div className="unit"><input type="number" value={f.cout} onChange={(e) => set("cout", e.target.value)} /><small>EUR</small></div>
            </div>
            <div>
              <label>Aides estimees</label>
              <div className="unit"><input type="number" value={f.aides} onChange={(e) => set("aides", e.target.value)} /><small>EUR</small></div>
            </div>
          </div>
          <label>Gain de loyer / mois apres travaux (optionnel)</label>
          <div className="unit"><input type="number" value={f.gainLoyer} onChange={(e) => set("gainLoyer", e.target.value)} /><small>EUR</small></div>
          <p className="hint">Aides cumulables : <b>MaPrimeRenov'</b>, <b>CEE</b> (primes energie), <b>eco-PTZ</b> (pret 0% jusqu'a 50 000 EUR), TVA 5,5%. En locatif, les travaux sont deductibles (deficit foncier). Estime le total ici.</p>
        </div>
      </div>

      {/* results */}
      <div>
        <div className="card">
          <h2>Impact des travaux</h2>
          <div className="sub">Mise a jour en temps reel</div>

          <div className="hero" style={{ background: plusValueNette >= 0 ? "linear-gradient(135deg,#2f9e6a,#4bb583)" : "linear-gradient(135deg,#dd8a2c,#e8a955)" }}>
            <div className="lbl">Plus-value nette creee</div>
            <div className="val">{plusValueNette >= 0 ? "+ " : "- "}{euro(Math.abs(plusValueNette))}</div>
            <div className="range">ROI des travaux : {roi.toFixed(0)}%</div>
          </div>

          <div className="kpis">
            <div className="kpi"><div className="k">Gain de valeur (verte)</div><div className="v g">+ {euro0(gainValeur)}</div></div>
            <div className="kpi"><div className="k">Cout net (apres aides)</div><div className="v">{euro0(coutNet)}</div></div>
            <div className="kpi"><div className="k">ROI travaux</div><div className={"v " + (roi >= 100 ? "g" : roi >= 60 ? "w" : "b")}>{roi.toFixed(0)}%</div></div>
          </div>

          <div className="section-t">Statut location (loi Climat)</div>
          <div className="travaux-statut">
            <div className={"badge " + sAvant.cls}>DPE {f.dpeAvant} : {sAvant.txt}</div>
            <span className="travaux-arrow">→</span>
            <div className={"badge " + sApres.cls}>DPE {f.dpeApres} : {sApres.txt}</div>
          </div>

          <div className="section-t">Detail</div>
          <div className="line-items">
            <div className="li"><span className="lbl">Cout des travaux</span><span className="neg">- {euro(v("cout"))}</span></div>
            <div className="li"><span className="lbl">Aides (MaPrimeRenov', CEE...)</span><span className="pos">+ {euro(v("aides"))}</span></div>
            <div className="li total"><span>Cout net</span><span className="v">{euro(coutNet)}</span></div>
            <div className="li"><span className="lbl">Gain de valeur du bien</span><span className="pos">+ {euro(gainValeur)}</span></div>
            <div className="li total"><span>Plus-value nette</span><span className={plusValueNette >= 0 ? "pos" : "neg"}>{plusValueNette >= 0 ? "+ " : "- "}{euro(Math.abs(plusValueNette))}</span></div>
            {gainLoyerAn > 0 && <div className="li"><span className="lbl">Gain de loyer / an</span><span className="pos">+ {euro(gainLoyerAn)}</span></div>}
            {paybackAns != null && <div className="li"><span className="lbl">Retour sur invest. (via loyer)</span><span>{paybackAns.toFixed(1)} ans</span></div>}
          </div>

          <div className={"badge " + vClass} style={{ marginTop: 10 }}>{verdict}</div>
          {onGoToRenta && (
            <button className="btn-budget" style={{ marginTop: 14 }} onClick={onGoToRenta}>
              🔧 Voir ma rentabilite avec ces travaux ({euro0(coutNet)} inclus)
            </button>
          )}
          <p className="hint" style={{ marginTop: 8 }}>Le gain de valeur estime provient de l'amelioration du DPE (valeur verte), calculee comme dans l'estimation. Le cout net des travaux est reporte dans l'onglet Rentabilite. Les couts et aides reels dependent des devis (France Renov').</p>
        </div>
      </div>
    </div>
  );
}

function Sources() {
  return (
    <div className="sources-wrap">
      <div className="src-intro card">
        <h2>Sources de données &amp; fréquence de mise à jour</h2>
        <p className="sub">EstimImmo s'appuie exclusivement sur des données publiques officielles françaises. Voici l'état de chaque source : active, partielle ou planifiée.</p>
        <div className="src-legend">
          <span className="src-badge src-auto">⚡ Temps réel</span>
          <span className="src-badge src-manuel">🔄 Mise à jour manuelle</span>
          <span className="src-badge src-todo">⏳ À intégrer</span>
        </div>
      </div>

      {SOURCES_DATA.map((cat, i) => (
        <div key={i} className="card" style={{ marginTop: 14 }}>
          <div className="src-cat">{cat.categorie}</div>
          {cat.sources.map((s, j) => (
            <div key={j} className="src-row">
              <div className="src-top">
                <div className="src-nom">{s.nom}</div>
                <span className={"src-badge " + REFRESH_LABEL[s.refresh].cls}>
                  {REFRESH_LABEL[s.refresh].label}
                </span>
              </div>
              <div className="src-org">{s.organisme}</div>
              <div className="src-desc">{s.utilisation}</div>
              <div className="src-meta">
                <span>🗓 {s.frequence}</span>
                <span className={"src-statut " + (s.refresh === "auto" ? "pos" : s.refresh === "manuel" ? "warn" : "muted")}>{s.statut}</span>
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="card" style={{ marginTop: 14 }}>
        <h2>Est-ce que les données se mettent à jour automatiquement ?</h2>
        <div className="src-faq">
          <div className="faq-item">
            <div className="faq-q">⚡ Sources en temps réel (actuellement actives)</div>
            <p>Les APIs IGN, DVF Etalab et Overpass sont appelées <b>à chaque estimation</b>. Tu reçois toujours les dernières données disponibles, sans aucune action de ta part.</p>
          </div>
          <div className="faq-item">
            <div className="faq-q">🔄 Le baromètre national</div>
            <p>Les chiffres du baromètre (taux, évolution des prix) sont <b>codés en dur</b> et doivent être mis à jour manuellement dans le code (~toutes les 3 à 6 mois). Une intégration de l'API INSEE automatiserait cela.</p>
          </div>
          <div className="faq-item">
            <div className="faq-q">📅 Les données DVF elles-mêmes</div>
            <p>DGFiP publie de nouveaux fichiers DVF <b>deux fois par an</b> (avril et octobre). L'API Etalab expose automatiquement ces nouvelles données — EstimImmo les intègre sans action requise.</p>
          </div>
          <div className="faq-item">
            <div className="faq-q">⏳ Sources à intégrer (ADEME, INSEE, encadrement loyers…)</div>
            <p>Ces sources ont toutes des APIs publiques gratuites. Une fois intégrées, elles seraient aussi <b>appelées en temps réel</b>. La base DPE ADEME et l'encadrement des loyers sont les priorités les plus impactantes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
