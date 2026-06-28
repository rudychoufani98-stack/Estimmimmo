"use client";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { useState, useRef, useEffect } from "react";

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
      {taux:0.62,mult:0.88},{taux:0.65,mult:0.90},{taux:0.73,mult:1.02},
      {taux:0.82,mult:1.18},{taux:0.83,mult:1.22},{taux:0.80,mult:1.10},
      {taux:0.86,mult:1.28},{taux:0.89,mult:1.32},{taux:0.82,mult:1.18},
      {taux:0.83,mult:1.22},{taux:0.71,mult:0.96},{taux:0.79,mult:1.12},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:5.20,
      info:"Paris : résidence principale limitée à 120 nuits/an (loi ELAN). Numéro d'enregistrement en mairie obligatoire. Taxe de séjour ~5,20 EUR/nuit/pers." },
  },
  versailles: {
    label: "Versailles & Yvelines",
    saisons: [
      {taux:0.55,mult:0.85},{taux:0.58,mult:0.88},{taux:0.65,mult:0.98},
      {taux:0.75,mult:1.12},{taux:0.80,mult:1.18},{taux:0.78,mult:1.10},
      {taux:0.85,mult:1.30},{taux:0.87,mult:1.35},{taux:0.78,mult:1.15},
      {taux:0.72,mult:1.05},{taux:0.58,mult:0.88},{taux:0.65,mult:0.98},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.50,
      info:"Yvelines : limite 120 nuits/an résidence principale. Enregistrement obligatoire. Taxe de séjour ~2,50 EUR/nuit/pers." },
  },
  // ── CÔTE D'AZUR ──────────────────────────────────────────────────────────
  cannes: {
    label: "Cannes",
    saisons: [
      {taux:0.45,mult:0.80},{taux:0.50,mult:0.85},{taux:0.58,mult:0.92},
      {taux:0.68,mult:1.05},{taux:0.97,mult:2.20},{taux:0.90,mult:1.45}, // mai = Festival !!
      {taux:0.98,mult:1.95},{taux:0.99,mult:2.05},{taux:0.84,mult:1.38},
      {taux:0.65,mult:0.95},{taux:0.48,mult:0.78},{taux:0.52,mult:0.85},
    ],
    loi:{ limite:null, enregistrement:true, taxeSejour:3.30,
      info:"Cannes : résidence secondaire sans limite de nuits. Enregistrement obligatoire. Taxe de séjour ~3,30 EUR/nuit/pers. Festival de Cannes (mai) : tarifs multipliés par 3 à 5." },
  },
  nice: {
    label: "Nice",
    saisons: [
      {taux:0.58,mult:0.82},{taux:0.72,mult:1.12},{taux:0.67,mult:0.97}, // fév = Carnaval
      {taux:0.72,mult:1.07},{taux:0.80,mult:1.18},{taux:0.87,mult:1.38},
      {taux:0.96,mult:1.75},{taux:0.98,mult:1.88},{taux:0.84,mult:1.28},
      {taux:0.67,mult:0.97},{taux:0.53,mult:0.80},{taux:0.62,mult:0.92},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:3.20,
      info:"Nice : limite 120 nuits/an résidence principale. Numéro d'enregistrement obligatoire. Taxe de séjour ~3,20 EUR/nuit/pers. Carnaval de Nice (février) : forte demande." },
  },
  antibes: {
    label: "Antibes / Juan-les-Pins",
    saisons: [
      {taux:0.38,mult:0.68},{taux:0.40,mult:0.72},{taux:0.48,mult:0.80},
      {taux:0.62,mult:0.95},{taux:0.74,mult:1.12},{taux:0.86,mult:1.30},
      {taux:0.95,mult:1.68},{taux:0.97,mult:1.78},{taux:0.81,mult:1.24},
      {taux:0.56,mult:0.87},{taux:0.38,mult:0.68},{taux:0.43,mult:0.75},
    ],
    loi:{ limite:null, enregistrement:true, taxeSejour:3.00,
      info:"Antibes : résidence secondaire sans plafond. Enregistrement obligatoire. Taxe de séjour ~3 EUR/nuit/pers." },
  },
  saint_tropez: {
    label: "Saint-Tropez & Golfe de Saint-Tropez",
    saisons: [
      {taux:0.22,mult:0.55},{taux:0.22,mult:0.55},{taux:0.30,mult:0.68},
      {taux:0.55,mult:1.00},{taux:0.72,mult:1.32},{taux:0.90,mult:1.85},
      {taux:0.98,mult:2.60},{taux:0.99,mult:2.80},{taux:0.82,mult:1.55}, // juil-août ultra premium
      {taux:0.52,mult:0.90},{taux:0.25,mult:0.58},{taux:0.30,mult:0.68},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:3.50,
      info:"Saint-Tropez : résidence secondaire sans plafond. Enregistrement non obligatoire (commune < 200k hab). Taxe de séjour ~3,50 EUR/nuit/pers. Marché très saisonnier (90% du CA en juil-sept)." },
  },
  menton: {
    label: "Menton",
    saisons: [
      {taux:0.42,mult:0.72},{taux:0.58,mult:0.92},{taux:0.60,mult:0.95}, // fév = Fête du Citron
      {taux:0.65,mult:1.00},{taux:0.72,mult:1.10},{taux:0.82,mult:1.28},
      {taux:0.92,mult:1.60},{taux:0.95,mult:1.72},{taux:0.78,mult:1.18},
      {taux:0.58,mult:0.88},{taux:0.42,mult:0.72},{taux:0.48,mult:0.80},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:2.80,
      info:"Menton : résidence secondaire sans plafond. Taxe de séjour ~2,80 EUR/nuit/pers. Fête du Citron (février) : forte demande." },
  },
  // ── ALPES & MONTAGNE ─────────────────────────────────────────────────────
  chamonix: {
    label: "Chamonix",
    saisons: [
      {taux:0.90,mult:1.72},{taux:0.96,mult:1.92},{taux:0.88,mult:1.62}, // ski peak
      {taux:0.48,mult:0.78},{taux:0.32,mult:0.60},{taux:0.58,mult:0.92},
      {taux:0.90,mult:1.55},{taux:0.95,mult:1.70},{taux:0.58,mult:0.88}, // été fort
      {taux:0.32,mult:0.60},{taux:0.42,mult:0.72},{taux:0.86,mult:1.58},
    ],
    loi:{ limite:null, enregistrement:true, taxeSejour:2.80,
      info:"Chamonix : résidence secondaire, pas de plafond. Enregistrement obligatoire. Taxe de séjour ~2,80 EUR/nuit/pers. Marché équilibré été/hiver, demande internationale forte." },
  },
  courchevel: {
    label: "Courchevel / Val d'Isère / Méribel",
    saisons: [
      {taux:0.92,mult:2.20},{taux:0.97,mult:2.50},{taux:0.90,mult:2.00}, // ski ultra premium
      {taux:0.28,mult:0.55},{taux:0.15,mult:0.40},{taux:0.20,mult:0.45},
      {taux:0.62,mult:1.10},{taux:0.72,mult:1.25},{taux:0.22,mult:0.48},
      {taux:0.15,mult:0.40},{taux:0.22,mult:0.48},{taux:0.85,mult:1.85},
    ],
    loi:{ limite:null, enregistrement:true, taxeSejour:3.00,
      info:"Stations Tarentaise (Courchevel, Val d'Isère, Méribel) : résidence secondaire, pas de plafond. Marché ski ultra-premium. Morte-saison très marquée (avril-juin, sept-oct)." },
  },
  annecy: {
    label: "Annecy",
    saisons: [
      {taux:0.46,mult:0.73},{taux:0.55,mult:0.88},{taux:0.52,mult:0.82},
      {taux:0.62,mult:0.94},{taux:0.70,mult:1.07},{taux:0.82,mult:1.28},
      {taux:0.96,mult:1.68},{taux:0.98,mult:1.82},{taux:0.74,mult:1.13},
      {taux:0.52,mult:0.82},{taux:0.40,mult:0.70},{taux:0.50,mult:0.80},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.50,
      info:"Annecy : limite 120 nuits/an résidence principale. Enregistrement obligatoire. Taxe de séjour ~2,50 EUR/nuit/pers. Forte demande lac en été, modérée en hiver." },
  },
  // ── OCCITANIE & PROVENCE ─────────────────────────────────────────────────
  toulouse: {
    label: "Toulouse",
    saisons: [
      {taux:0.58,mult:0.85},{taux:0.60,mult:0.88},{taux:0.65,mult:0.95},
      {taux:0.70,mult:1.02},{taux:0.75,mult:1.08},{taux:0.78,mult:1.12},
      {taux:0.80,mult:1.18},{taux:0.78,mult:1.12},{taux:0.75,mult:1.08},
      {taux:0.72,mult:1.04},{taux:0.62,mult:0.90},{taux:0.65,mult:0.95},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.20,
      info:"Toulouse : limite 120 nuits/an résidence principale. Enregistrement obligatoire. Taxe de séjour ~2,20 EUR/nuit/pers. Demande relativement stable (4e ville France, étudiants, aéro)." },
  },
  montpellier: {
    label: "Montpellier",
    saisons: [
      {taux:0.55,mult:0.83},{taux:0.58,mult:0.87},{taux:0.63,mult:0.94},
      {taux:0.70,mult:1.03},{taux:0.75,mult:1.10},{taux:0.82,mult:1.22},
      {taux:0.88,mult:1.38},{taux:0.90,mult:1.42},{taux:0.78,mult:1.15},
      {taux:0.68,mult:1.00},{taux:0.57,mult:0.85},{taux:0.60,mult:0.90},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.50,
      info:"Montpellier : limite 120 nuits/an résidence principale. Enregistrement obligatoire. Taxe de séjour ~2,50 EUR/nuit/pers." },
  },
  avignon: {
    label: "Avignon",
    saisons: [
      {taux:0.40,mult:0.72},{taux:0.42,mult:0.73},{taux:0.52,mult:0.84},
      {taux:0.62,mult:0.98},{taux:0.68,mult:1.05},{taux:0.74,mult:1.12},
      {taux:0.99,mult:2.25},{taux:0.86,mult:1.52},{taux:0.72,mult:1.10}, // juillet = Festival !!
      {taux:0.57,mult:0.90},{taux:0.40,mult:0.72},{taux:0.48,mult:0.82},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:1.80,
      info:"Avignon : résidence secondaire sans plafond. Taxe de séjour ~1,80 EUR/nuit/pers. Festival d'Avignon (juillet) : demande x3 à x5, réservations 6 mois à l'avance." },
  },
  aix_en_provence: {
    label: "Aix-en-Provence",
    saisons: [
      {taux:0.50,mult:0.80},{taux:0.52,mult:0.82},{taux:0.58,mult:0.90},
      {taux:0.68,mult:1.03},{taux:0.74,mult:1.10},{taux:0.82,mult:1.24},
      {taux:0.88,mult:1.42},{taux:0.90,mult:1.48},{taux:0.78,mult:1.18},
      {taux:0.63,mult:0.95},{taux:0.50,mult:0.80},{taux:0.54,mult:0.85},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:2.00,
      info:"Aix-en-Provence : résidence secondaire sans plafond. Taxe de séjour ~2 EUR/nuit/pers. Demande touristique et affaires (festival d'art lyrique en juillet)." },
  },
  marseille: {
    label: "Marseille",
    saisons: [
      {taux:0.46,mult:0.73},{taux:0.49,mult:0.76},{taux:0.56,mult:0.84},
      {taux:0.66,mult:0.97},{taux:0.73,mult:1.07},{taux:0.83,mult:1.24},
      {taux:0.91,mult:1.52},{taux:0.93,mult:1.57},{taux:0.79,mult:1.20},
      {taux:0.61,mult:0.90},{taux:0.46,mult:0.73},{taux:0.51,mult:0.80},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.50,
      info:"Marseille : limite 120 nuits/an résidence principale. Enregistrement obligatoire depuis 2020. Taxe de séjour ~2,50 EUR/nuit/pers." },
  },
  // ── ATLANTIQUE & PAYS BASQUE ─────────────────────────────────────────────
  biarritz: {
    label: "Biarritz",
    saisons: [
      {taux:0.50,mult:0.80},{taux:0.52,mult:0.82},{taux:0.58,mult:0.90},
      {taux:0.70,mult:1.08},{taux:0.77,mult:1.18},{taux:0.88,mult:1.40},
      {taux:0.97,mult:1.80},{taux:0.99,mult:1.95},{taux:0.85,mult:1.40},
      {taux:0.65,mult:1.00},{taux:0.48,mult:0.78},{taux:0.54,mult:0.85},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:2.00,
      info:"Biarritz : résidence secondaire sans plafond. Taxe de séjour ~2 EUR/nuit/pers. Surfing + gastronomie : demande forte été et septembre (championnats surf)." },
  },
  saint_jean_luz: {
    label: "Saint-Jean-de-Luz / Hendaye",
    saisons: [
      {taux:0.35,mult:0.65},{taux:0.38,mult:0.68},{taux:0.45,mult:0.78},
      {taux:0.60,mult:0.95},{taux:0.72,mult:1.12},{taux:0.88,mult:1.42},
      {taux:0.97,mult:1.82},{taux:0.98,mult:1.90},{taux:0.82,mult:1.35},
      {taux:0.58,mult:0.92},{taux:0.36,mult:0.66},{taux:0.38,mult:0.68},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:1.80,
      info:"Saint-Jean-de-Luz : résidence secondaire sans plafond. Très saisonnière. Taxe de séjour ~1,80 EUR/nuit/pers." },
  },
  la_rochelle: {
    label: "La Rochelle & Île de Ré",
    saisons: [
      {taux:0.38,mult:0.70},{taux:0.38,mult:0.70},{taux:0.45,mult:0.80},
      {taux:0.60,mult:0.95},{taux:0.72,mult:1.12},{taux:0.84,mult:1.32},
      {taux:0.97,mult:1.75},{taux:0.98,mult:1.85},{taux:0.78,mult:1.20},
      {taux:0.55,mult:0.88},{taux:0.35,mult:0.68},{taux:0.38,mult:0.72},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:2.00,
      info:"La Rochelle / Île de Ré : résidence secondaire sans plafond. Taxe de séjour ~2 EUR/nuit/pers. Île de Ré : marché très premium, offre rare en haute saison." },
  },
  bordeaux: {
    label: "Bordeaux",
    saisons: [
      {taux:0.53,mult:0.79},{taux:0.54,mult:0.80},{taux:0.59,mult:0.87},
      {taux:0.69,mult:1.02},{taux:0.74,mult:1.07},{taux:0.79,mult:1.17},
      {taux:0.86,mult:1.32},{taux:0.89,mult:1.37},{taux:0.80,mult:1.20},
      {taux:0.70,mult:1.02},{taux:0.53,mult:0.79},{taux:0.63,mult:0.92},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.00,
      info:"Bordeaux : limite 120 nuits/an résidence principale. Enregistrement obligatoire depuis 2022. Taxe de séjour ~2 EUR/nuit/pers." },
  },
  // ── BRETAGNE & NORMANDIE ─────────────────────────────────────────────────
  saint_malo: {
    label: "Saint-Malo",
    saisons: [
      {taux:0.30,mult:0.60},{taux:0.32,mult:0.62},{taux:0.40,mult:0.72},
      {taux:0.58,mult:0.90},{taux:0.68,mult:1.05},{taux:0.80,mult:1.22},
      {taux:0.98,mult:1.80},{taux:0.99,mult:1.92},{taux:0.72,mult:1.08},
      {taux:0.45,mult:0.78},{taux:0.28,mult:0.58},{taux:0.32,mult:0.62},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:1.80,
      info:"Saint-Malo : résidence secondaire sans plafond. Taxe de séjour ~1,80 EUR/nuit/pers. Marché très saisonnier (juil-août représentent ~50% du CA annuel)." },
  },
  vannes_morbihan: {
    label: "Vannes & Golfe du Morbihan",
    saisons: [
      {taux:0.28,mult:0.58},{taux:0.30,mult:0.60},{taux:0.38,mult:0.70},
      {taux:0.55,mult:0.88},{taux:0.68,mult:1.05},{taux:0.80,mult:1.22},
      {taux:0.97,mult:1.72},{taux:0.98,mult:1.80},{taux:0.72,mult:1.08},
      {taux:0.45,mult:0.78},{taux:0.28,mult:0.58},{taux:0.30,mult:0.60},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:1.50,
      info:"Vannes / Golfe du Morbihan : résidence secondaire sans plafond. Taxe de séjour ~1,50 EUR/nuit/pers." },
  },
  deauville: {
    label: "Deauville / Honfleur / Côte Fleurie",
    saisons: [
      {taux:0.35,mult:0.68},{taux:0.35,mult:0.68},{taux:0.40,mult:0.75},
      {taux:0.52,mult:0.88},{taux:0.62,mult:1.00},{taux:0.72,mult:1.15},
      {taux:0.88,mult:1.52},{taux:0.92,mult:1.65},{taux:0.68,mult:1.08},
      {taux:0.58,mult:0.95},{taux:0.38,mult:0.72},{taux:0.40,mult:0.75},
    ],
    loi:{ limite:null, enregistrement:false, taxeSejour:2.20,
      info:"Deauville / Honfleur : résidence secondaire sans plafond. Taxe de séjour ~2,20 EUR/nuit/pers. Week-ends parisiens forts toute l'année." },
  },
  // ── GRANDES VILLES ───────────────────────────────────────────────────────
  lyon: {
    label: "Lyon",
    saisons: [
      {taux:0.59,mult:0.83},{taux:0.62,mult:0.87},{taux:0.67,mult:0.95},
      {taux:0.72,mult:1.02},{taux:0.75,mult:1.07},{taux:0.77,mult:1.10},
      {taux:0.70,mult:1.00},{taux:0.60,mult:0.84},{taux:0.75,mult:1.07},
      {taux:0.72,mult:1.02},{taux:0.74,mult:1.04},{taux:0.76,mult:1.08},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:3.00,
      info:"Lyon : limite 120 nuits/an résidence principale. Enregistrement obligatoire. Taxe de séjour ~3 EUR/nuit/pers. Fête des Lumières (décembre) : pic de demande fort." },
  },
  strasbourg: {
    label: "Strasbourg",
    saisons: [
      {taux:0.55,mult:0.82},{taux:0.57,mult:0.85},{taux:0.62,mult:0.92},
      {taux:0.68,mult:1.00},{taux:0.72,mult:1.05},{taux:0.74,mult:1.08},
      {taux:0.76,mult:1.10},{taux:0.74,mult:1.07},{taux:0.72,mult:1.05},
      {taux:0.68,mult:1.00},{taux:0.70,mult:1.02},{taux:0.92,mult:1.68}, // Marché de Noël !!
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.20,
      info:"Strasbourg : limite 120 nuits/an résidence principale. Enregistrement obligatoire. Taxe de séjour ~2,20 EUR/nuit/pers. Marché de Noël (décembre) : demande x2 à x3." },
  },
  rennes: {
    label: "Rennes",
    saisons: [
      {taux:0.55,mult:0.84},{taux:0.57,mult:0.86},{taux:0.62,mult:0.93},
      {taux:0.68,mult:1.01},{taux:0.72,mult:1.06},{taux:0.75,mult:1.10},
      {taux:0.78,mult:1.15},{taux:0.76,mult:1.11},{taux:0.74,mult:1.08},
      {taux:0.70,mult:1.02},{taux:0.60,mult:0.90},{taux:0.63,mult:0.94},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.00,
      info:"Rennes : limite 120 nuits/an résidence principale. Enregistrement obligatoire. Taxe de séjour ~2 EUR/nuit/pers." },
  },
  nantes: {
    label: "Nantes",
    saisons: [
      {taux:0.54,mult:0.82},{taux:0.56,mult:0.84},{taux:0.62,mult:0.92},
      {taux:0.68,mult:1.00},{taux:0.72,mult:1.06},{taux:0.76,mult:1.11},
      {taux:0.80,mult:1.18},{taux:0.78,mult:1.14},{taux:0.74,mult:1.08},
      {taux:0.68,mult:1.00},{taux:0.56,mult:0.84},{taux:0.60,mult:0.90},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.00,
      info:"Nantes : limite 120 nuits/an résidence principale. Enregistrement obligatoire. Taxe de séjour ~2 EUR/nuit/pers." },
  },
  lille: {
    label: "Lille",
    saisons: [
      {taux:0.55,mult:0.83},{taux:0.57,mult:0.85},{taux:0.62,mult:0.92},
      {taux:0.68,mult:1.01},{taux:0.72,mult:1.06},{taux:0.73,mult:1.07},
      {taux:0.74,mult:1.08},{taux:0.72,mult:1.05},{taux:0.72,mult:1.06},
      {taux:0.70,mult:1.03},{taux:0.65,mult:0.96},{taux:0.68,mult:1.00},
    ],
    loi:{ limite:120, enregistrement:true, taxeSejour:2.00,
      info:"Lille : limite 120 nuits/an résidence principale. Enregistrement obligatoire. Taxe de séjour ~2 EUR/nuit/pers. Braderie de Lille (1er week-end sept) : forte demande." },
  },
  // ── AUTRE ────────────────────────────────────────────────────────────────
  autre: {
    label: "Autre ville / zone rurale",
    saisons: [
      {taux:0.38,mult:0.78},{taux:0.38,mult:0.78},{taux:0.43,mult:0.83},
      {taux:0.53,mult:0.93},{taux:0.59,mult:0.99},{taux:0.64,mult:1.06},
      {taux:0.81,mult:1.33},{taux:0.86,mult:1.43},{taux:0.61,mult:1.01},
      {taux:0.46,mult:0.86},{taux:0.33,mult:0.73},{taux:0.39,mult:0.81},
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

  function handleEstimate(val, city) {
    setEstValue(val);
    if (city) setEstCity(city);
  }

  return (
    <>
      <header className="top">
        <h1>Estim<span>Immo</span></h1>
        <p>Estimation par transactions reelles (DVF) &amp; analyse de rentabilite</p>
      </header>

      <div className="wrap">
        <div className="tabs">
          <button className={"tab" + (tab === "estim" ? " active" : "")} onClick={() => setTab("estim")}>
            1. Estimation
          </button>
          <button className={"tab" + (tab === "renta" ? " active" : "")} onClick={() => setTab("renta")}>
            2. Rentabilite
          </button>
          <button className={"tab" + (tab === "capacite" ? " active" : "")} onClick={() => setTab("capacite")}>
            3. Capacite d'emprunt
          </button>
          <button className={"tab" + (tab === "sources" ? " active" : "")} onClick={() => setTab("sources")}>
            4. Sources &amp; Données
          </button>
        </div>

        {tab === "estim" && <Estimation onEstimate={handleEstimate} onGoToCapacite={() => setTab("capacite")} />}
        {tab === "renta" && <Rentabilite estValue={estValue} estCity={CITY_TO_AIRBNB[estCity] || null} />}
        {tab === "capacite" && <CapaciteEmprunt estValue={estValue} />}
        {tab === "sources" && <Sources />}

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

/* ======================= TAB 1 : ESTIMATION ============================== */
function Estimation({ onEstimate, onGoToCapacite }) {
  const [form, setForm] = useState({
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
  const [res, setRes] = useState(null);

  // address autocomplete state
  const [sugg, setSugg] = useState([]);
  const [geo, setGeo] = useState(null);     // exact location once picked
  const [openSug, setOpenSug] = useState(false);
  const debRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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

function Rentabilite({ estValue, estCity }) {
  const [rentaTab, setRentaTab] = useState("classique");
  const [f, setF] = useState({
    price: estValue || 300000,
    notaryRate: 0.075,
    works: 0,
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
  // keep price synced when arriving from estimation
  const [synced, setSynced] = useState(false);
  if (!synced && estValue && f.price !== estValue) {
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
                        <td><b>{m.name}</b></td>
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
                    <td><b>{m.name}</b></td>
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
