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

// Airbnb seasonal data & local regulations per zone
// taux = occupancy rate, mult = price multiplier vs base rate
const AIRBNB_ZONES = {
  paris: {
    label: "Paris",
    saisons: [
      {taux:0.60,mult:0.85},{taux:0.65,mult:0.90},{taux:0.72,mult:1.00},
      {taux:0.80,mult:1.15},{taux:0.82,mult:1.20},{taux:0.78,mult:1.08},
      {taux:0.85,mult:1.25},{taux:0.88,mult:1.30},{taux:0.80,mult:1.15},
      {taux:0.82,mult:1.20},{taux:0.70,mult:0.95},{taux:0.78,mult:1.10},
    ],
    loi: { limite: 120, enregistrement: true, taxeSejour: 5.20,
      info: "Paris : résidence principale limitée à 120 nuits/an (loi ELAN). Numéro d'enregistrement en mairie obligatoire. Taxe de séjour ~5,20 EUR/nuit/pers (collectée et reversée à la Ville par Airbnb)." },
  },
  cote_azur: {
    label: "Côte d'Azur (Nice, Cannes, Antibes…)",
    saisons: [
      {taux:0.35,mult:0.65},{taux:0.38,mult:0.70},{taux:0.45,mult:0.78},
      {taux:0.60,mult:0.92},{taux:0.75,mult:1.15},{taux:0.85,mult:1.30},
      {taux:0.95,mult:1.70},{taux:0.98,mult:1.90},{taux:0.80,mult:1.25},
      {taux:0.52,mult:0.82},{taux:0.35,mult:0.65},{taux:0.42,mult:0.75},
    ],
    loi: { limite: null, enregistrement: true, taxeSejour: 3.00,
      info: "Côte d'Azur : pas de limite de nuits pour résidence secondaire. Enregistrement obligatoire dans communes > 200 000 hab. (Nice). Taxe de séjour ~3 EUR/nuit/pers." },
  },
  alpes: {
    label: "Alpes — station de ski (Chamonix, Méribel…)",
    saisons: [
      {taux:0.88,mult:1.60},{taux:0.92,mult:1.80},{taux:0.85,mult:1.55},
      {taux:0.38,mult:0.70},{taux:0.22,mult:0.52},{taux:0.30,mult:0.60},
      {taux:0.80,mult:1.35},{taux:0.88,mult:1.50},{taux:0.28,mult:0.58},
      {taux:0.22,mult:0.50},{taux:0.32,mult:0.62},{taux:0.80,mult:1.45},
    ],
    loi: { limite: null, enregistrement: true, taxeSejour: 2.50,
      info: "Alpes (stations) : résidence secondaire — pas de plafond de nuits. Enregistrement en mairie obligatoire. Taxe de séjour ~2,50 EUR/nuit/pers." },
  },
  bretagne: {
    label: "Bretagne (Saint-Malo, Quimper, Brest…)",
    saisons: [
      {taux:0.28,mult:0.58},{taux:0.28,mult:0.58},{taux:0.35,mult:0.65},
      {taux:0.52,mult:0.84},{taux:0.62,mult:0.95},{taux:0.75,mult:1.10},
      {taux:0.95,mult:1.55},{taux:0.98,mult:1.70},{taux:0.65,mult:0.95},
      {taux:0.40,mult:0.70},{taux:0.25,mult:0.55},{taux:0.28,mult:0.58},
    ],
    loi: { limite: null, enregistrement: false, taxeSejour: 1.50,
      info: "Bretagne : pas de contrainte hors grandes villes. Déclaration en mairie recommandée si meublé tourisme. Taxe de séjour ~1,50 EUR/nuit/pers." },
  },
  bordeaux: {
    label: "Bordeaux & Gironde",
    saisons: [
      {taux:0.52,mult:0.78},{taux:0.52,mult:0.78},{taux:0.58,mult:0.85},
      {taux:0.68,mult:1.00},{taux:0.73,mult:1.05},{taux:0.78,mult:1.15},
      {taux:0.85,mult:1.30},{taux:0.88,mult:1.35},{taux:0.78,mult:1.18},
      {taux:0.68,mult:1.00},{taux:0.52,mult:0.78},{taux:0.62,mult:0.90},
    ],
    loi: { limite: 120, enregistrement: true, taxeSejour: 2.00,
      info: "Bordeaux : limite 120 nuits/an résidence principale. Numéro d'enregistrement obligatoire depuis 2022. Taxe de séjour ~2 EUR/nuit/pers." },
  },
  lyon: {
    label: "Lyon & Métropole",
    saisons: [
      {taux:0.58,mult:0.82},{taux:0.60,mult:0.85},{taux:0.65,mult:0.93},
      {taux:0.70,mult:1.00},{taux:0.73,mult:1.05},{taux:0.75,mult:1.08},
      {taux:0.68,mult:0.98},{taux:0.58,mult:0.82},{taux:0.73,mult:1.05},
      {taux:0.70,mult:1.00},{taux:0.72,mult:1.02},{taux:0.73,mult:1.05},
    ],
    loi: { limite: 120, enregistrement: true, taxeSejour: 3.00,
      info: "Lyon : limite 120 nuits/an résidence principale. Numéro d'enregistrement obligatoire en ligne. Taxe de séjour ~3 EUR/nuit/pers (zone A)." },
  },
  marseille: {
    label: "Marseille & Provence",
    saisons: [
      {taux:0.45,mult:0.72},{taux:0.48,mult:0.75},{taux:0.55,mult:0.82},
      {taux:0.65,mult:0.95},{taux:0.72,mult:1.05},{taux:0.82,mult:1.22},
      {taux:0.90,mult:1.50},{taux:0.92,mult:1.55},{taux:0.78,mult:1.18},
      {taux:0.60,mult:0.88},{taux:0.45,mult:0.72},{taux:0.50,mult:0.78},
    ],
    loi: { limite: 120, enregistrement: true, taxeSejour: 2.50,
      info: "Marseille : limite 120 nuits/an résidence principale. Enregistrement obligatoire depuis 2020. Taxe de séjour ~2,50 EUR/nuit/pers." },
  },
  autre: {
    label: "Autre ville / zone rurale",
    saisons: [
      {taux:0.38,mult:0.78},{taux:0.38,mult:0.78},{taux:0.42,mult:0.82},
      {taux:0.52,mult:0.92},{taux:0.58,mult:0.98},{taux:0.63,mult:1.05},
      {taux:0.80,mult:1.32},{taux:0.85,mult:1.42},{taux:0.60,mult:1.00},
      {taux:0.45,mult:0.85},{taux:0.32,mult:0.72},{taux:0.38,mult:0.80},
    ],
    loi: { limite: null, enregistrement: false, taxeSejour: 1.00,
      info: "Zone hors grandes villes : réglementation plus souple. Déclaration en mairie recommandée si meublé tourisme. Taxe de séjour variable (~1 EUR/nuit/pers)." },
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

export default function Page() {
  const [tab, setTab] = useState("estim");
  const [estValue, setEstValue] = useState(0);

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
          <button className={"tab" + (tab === "sources" ? " active" : "")} onClick={() => setTab("sources")}>
            3. Sources &amp; Données
          </button>
        </div>

        {tab === "estim" && <Estimation onEstimate={setEstValue} />}
        {tab === "renta" && <Rentabilite estValue={estValue} />}
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

/* ======================= TAB 1 : ESTIMATION ============================== */
function Estimation({ onEstimate }) {
  const [form, setForm] = useState({
    address: "10 rue de la Paix, Paris",
    surface: 65,
    type: "Appartement",
    floor: 3,
    elevator: true,
    condition: 1,
    dpe: "D",
    period: "1948-1974",
    balcony: false,
    parking: false,
    cave: false,
    vue: "standard",
    sentiment: 0,
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
          condition: Number(form.condition),
          sentiment: Number(form.sentiment),
          geo: geo
            ? { lat: geo.lat, lon: geo.lon, insee: geo.citycode, label: geo.label, area: geo.area, city: geo.city }
            : null,
        }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || "Erreur."); return; }
      setRes(data);
      onEstimate(data.estimate);
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
            <div>
              <label>Conjoncture de marche</label>
              <select value={form.sentiment} onChange={(e) => set("sentiment", e.target.value)}>
                <option value="0.03">Marche tres porteur (+3%)</option>
                <option value="0.015">Reprise / demande forte (+1,5%)</option>
                <option value="0">Neutre (0%)</option>
                <option value="-0.015">Marche prudent (-1,5%)</option>
                <option value="-0.03">Marche tendu / baisse (-3%)</option>
              </select>
            </div>
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
          {loading && <div className="placeholder"><span className="spinner" style={{borderTopColor:'#3b82f6',borderColor:'#2a3650'}}/><br/>Recuperation des transactions DVF...</div>}
          {res && <EstimResult res={res} surface={Number(form.surface)} />}
        </div>
      </div>
    </div>
  );
}

function EstimResult({ res, surface }) {
  const confColor = res.confidence === "Elevee" ? "g" : res.confidence === "Moyenne" ? "w" : "b";
  return (
    <>
      <div className="hero">
        <div className="lbl">Valeur estimee</div>
        <div className="val">{euro(res.estimate)}</div>
        <div className="range">Fourchette : {euro(res.low)} &ndash; {euro(res.high)}</div>
        <div className="loc">{res.location.area} &middot; {euro0(res.adjustedPm2)} EUR/m2</div>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="k">Prix/m2 du marche local</div><div className="v">{euro0(res.basePm2)}</div></div>
        <div className="kpi"><div className="k">Prix/m2 ajuste au bien</div><div className="v">{euro0(res.adjustedPm2)}</div></div>
        <div className="kpi"><div className="k">Fiabilite</div><div className={"v " + confColor}>{res.confidence}</div></div>
      </div>

      <div className="badge g">{res.compCount} ventes comparables retenues &middot; {res.totalSales} ventes analysees ({res.yearsUsed.join(", ")})</div>

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

function Rentabilite({ estValue }) {
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
        <RentabiliteAirbnb estValue={estValue} classicYieldGross={yieldGross} classicCashflowAT={mCashflowAT} />
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

          <div className={"badge " + vClass}>{verdict}</div>
        </div>
      </div>
    </div>
      )}
    </>
  );
}

/* ======================= AIRBNB / SAISONNIER ============================= */
function RentabiliteAirbnb({ estValue, classicYieldGross, classicCashflowAT }) {
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
  });

  const [synced, setSynced] = useState(false);
  if (!synced && estValue && f.price !== estValue) {
    setF((x) => ({ ...x, price: estValue }));
    setSynced(true);
  }

  const setV = (k, v) => setF((s) => ({ ...s, [k]: isNaN(Number(v)) || v === "" ? v : Number(v) }));
  const setS = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const zone = AIRBNB_ZONES[f.zone];
  const loi = zone.loi;

  // Monthly revenue simulation
  const months = zone.saisons.map((s, i) => {
    const days = DAYS_IN_MONTH[i];
    const nuits = Math.round(days * s.taux);
    const tarif = Math.round(f.tarifBase * s.mult);
    const sejours = Math.max(1, Math.round(nuits / Math.max(1, f.avgStay)));
    const revenueGross = nuits * tarif;
    const platformCut = revenueGross * f.platformFee;
    const netHost = revenueGross - platformCut;
    return {
      name: MONTH_NAMES[i], days, nuits, tarif, sejours, revenueGross, platformCut, netHost,
      isHaute: s.mult >= 1.2, isMoyenne: s.mult >= 1.0 && s.mult < 1.2, taux: s.taux,
    };
  });

  const totalNuits = months.reduce((a, m) => a + m.nuits, 0);
  const annualRevenueGross = months.reduce((a, m) => a + m.revenueGross, 0);
  const annualPlatformFee = months.reduce((a, m) => a + m.platformCut, 0);
  const annualNetAirbnb = months.reduce((a, m) => a + m.netHost, 0);

  const isCapped = f.isPrimary && loi.limite && totalNuits > loi.limite;
  const ratio = isCapped ? loi.limite / totalNuits : 1;
  const annualRevenueCapped = annualNetAirbnb * ratio;
  const effectiveNuits = isCapped ? loi.limite : totalNuits;

  const annualMgmt = annualRevenueCapped * f.mgmt;
  const annualInsurance = f.insuranceAirbnb;
  const annualCopro = f.chargesCopro;
  const annualTaxe = f.taxe;
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
          <select value={f.zone} onChange={(e) => setS("zone", e.target.value)}>
            {Object.entries(AIRBNB_ZONES).map(([k, z]) => (
              <option key={k} value={k}>{z.label}</option>
            ))}
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
              <label>Tarif nuit de base (basse saison)</label>
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
          <h2>Calendrier saisonnier — {zone.label}</h2>
          <div className="sub">Taux d'occupation et tarif estimés par mois selon la zone</div>
          <div className="season-grid">
            {months.map((m, i) => (
              <div key={i} className={"season-cell " + (m.isHaute ? "haute" : m.isMoyenne ? "moyenne" : "basse")}>
                <div className="sc-month">{m.name}</div>
                <div className="sc-tarif">{m.tarif}€</div>
                <div className="sc-taux">{Math.round(m.taux * 100)}%</div>
                <div className="sc-nuits">{m.nuits}n</div>
              </div>
            ))}
          </div>
          <div className="season-legend">
            <span className="sl haute">■ Haute saison</span>
            <span className="sl moyenne">■ Moyenne</span>
            <span className="sl basse">■ Basse saison</span>
          </div>
          <p className="hint">Tarif = base × multiplicateur saisonnier. Occupation = taux d'occupation estimé par nuit.</p>
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
          <div className="sub">{zone.label} &mdash; {effectiveNuits} nuits louées / an{isCapped ? " (plafonnées)" : ""}</div>

          <div className="kpis">
            <div className="kpi"><div className="k">Rendement brut</div><div className={"v " + yClass(yieldGross)}>{pct(yieldGross)}</div></div>
            <div className="kpi"><div className="k">Rendement net</div><div className={"v " + yClass(yieldNet)}>{pct(yieldNet)}</div></div>
            <div className="kpi"><div className="k">Rendement net-net</div><div className={"v " + yClass(yieldNetNet)}>{pct(yieldNetNet)}</div></div>
          </div>

          <div className="section-t">Revenus annuels</div>
          <div className="line-items">
            <div className="li"><span className="lbl">Revenu brut nuits</span><span className="pos">+ {euro(annualRevenueGross * ratio)}</span></div>
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
