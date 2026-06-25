"use client";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { useState, useRef, useEffect } from "react";

const euro = (n) => Math.round(n).toLocaleString("fr-FR") + " EUR";
const euro0 = (n) => Math.round(n).toLocaleString("fr-FR");
const pct = (n) => n.toFixed(2).replace(".", ",") + " %";

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
  // shared: estimated value flows from Estimation -> Rentabilite
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
        </div>

        {tab === "estim" ? (
          <Estimation onEstimate={setEstValue} />
        ) : (
          <Rentabilite estValue={estValue} />
        )}
      </div>

      <footer>
        EstimImmo &middot; Donnees : DVF (DGFiP/Etalab) &amp; geocodage IGN. Estimation indicative, ne constitue pas une expertise.
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

      {res.transit && (
        <div className="transit-info">
          {res.transit.dist != null
            ? <>Transport le plus proche : <b>{res.transit.name}</b> a {res.transit.dist} m</>
            : <>Aucun transport ferre a moins de 1,2 km</>}
        </div>
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
  const [f, setF] = useState({
    price: estValue || 300000,
    notaryRate: 0.075,
    works: 0,
    rent: 1150,           // loyer mensuel hors charges (HC)
    chargesProvision: 150,// charges mensuelles refacturees au locataire
    vacancy: 0.04,
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
                <option value="0">0%</option>
                <option value="0.04">~4% (1 mois/an)</option>
                <option value="0.08">~8% (2 mois/an)</option>
              </select>
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
  );
}
