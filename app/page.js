"use client";
import "./globals.css";
import { useState } from "react";

const euro = (n) => Math.round(n).toLocaleString("fr-FR") + " EUR";
const euro0 = (n) => Math.round(n).toLocaleString("fr-FR");
const pct = (n) => n.toFixed(2).replace(".", ",") + " %";

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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
          <input value={form.address} onChange={(e) => set("address", e.target.value)}
                 placeholder="12 rue Victor Hugo, 69003 Lyon" />

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

          <label>Stationnement</label>
          <select value={form.parking ? "1" : "0"} onChange={(e) => set("parking", e.target.value === "1")}>
            <option value="0">Sans parking</option>
            <option value="1">Parking / box</option>
          </select>

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
    rent: 1150,
    vacancy: 0.04,
    charges: 1800,        // charges copro non recuperables / an
    taxe: 1100,           // taxe fonciere / an
    mgmt: 0.06,           // frais de gestion (% loyers)
    insurancePNO: 180,    // assurance PNO / an
    apport: 40000,
    duration: 20,
    rate: 3.5,
    loanInsurance: 0.34,
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

  const annualRentGross = v("rent") * 12;
  const annualRentNet = annualRentGross * (1 - v("vacancy"));
  const mgmtCost = annualRentNet * v("mgmt");
  const annualOperating = v("charges") + v("taxe") + v("insurancePNO") + mgmtCost;

  const yieldGross = price > 0 ? (annualRentGross / price) * 100 : 0;
  const yieldNet = totalCost > 0 ? ((annualRentNet - annualOperating) / totalCost) * 100 : 0;

  const annualLoan = mPayment * 12;
  const annualCashflow = annualRentNet - annualOperating - annualLoan;
  const mCashflow = annualCashflow / 12;
  const cashOnCash = v("apport") > 0 ? (annualCashflow / v("apport")) * 100 : 0;

  const yClass = (y) => (y >= 5 ? "g" : y >= 3 ? "w" : "b");
  const cClass = (x) => (x >= 0 ? "g" : "b");

  let verdict, vClass;
  if (annualCashflow >= 0) { verdict = "Rentable : les loyers couvrent le credit et toutes les charges. Cashflow positif."; vClass = "g"; }
  else if (mCashflow >= -200) { verdict = "Equilibre : effort d'epargne mensuel modere. A arbitrer selon la plus-value attendue."; vClass = "w"; }
  else { verdict = "Non rentable en l'etat : effort d'epargne mensuel important. Renegociez le prix, l'apport ou le loyer."; vClass = "b"; }

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
              <label>Loyer mensuel (hors charges)</label>
              <div className="unit"><input type="number" value={f.rent} onChange={(e) => set("rent", e.target.value)} /><small>EUR</small></div>
            </div>
            <div>
              <label>Vacance locative</label>
              <select value={f.vacancy} onChange={(e) => set("vacancy", e.target.value)}>
                <option value="0">0%</option>
                <option value="0.04">~4% (1 mois/an)</option>
                <option value="0.08">~8% (2 mois/an)</option>
              </select>
            </div>
          </div>
          <div className="row">
            <div>
              <label>Charges copro / an</label>
              <div className="unit"><input type="number" value={f.charges} onChange={(e) => set("charges", e.target.value)} /><small>EUR</small></div>
            </div>
            <div>
              <label>Taxe fonciere / an</label>
              <div className="unit"><input type="number" value={f.taxe} onChange={(e) => set("taxe", e.target.value)} /><small>EUR</small></div>
            </div>
          </div>
          <div className="row">
            <div>
              <label>Gestion locative</label>
              <select value={f.mgmt} onChange={(e) => set("mgmt", e.target.value)}>
                <option value="0">Gestion perso (0%)</option>
                <option value="0.06">Agence (~6%)</option>
                <option value="0.08">Agence (~8%)</option>
              </select>
            </div>
            <div>
              <label>Assurance PNO / an</label>
              <div className="unit"><input type="number" value={f.insurancePNO} onChange={(e) => set("insurancePNO", e.target.value)} /><small>EUR</small></div>
            </div>
          </div>
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
            <div className="li"><span className="lbl">Loyers encaisses</span><span className="pos">+ {euro(annualRentNet)}</span></div>
            <div className="li"><span className="lbl">Charges, taxe, gestion, PNO</span><span className="neg">- {euro(annualOperating)}</span></div>
            <div className="li"><span className="lbl">Remboursement credit</span><span className="neg">- {euro(annualLoan)}</span></div>
            <div className="li total"><span>Cashflow annuel</span>
              <span className={annualCashflow >= 0 ? "pos" : "neg"}>{annualCashflow >= 0 ? "+ " : "- "}{euro(Math.abs(annualCashflow))}</span></div>
          </div>

          <div className="kpis" style={{ marginTop: 14 }}>
            <div className="kpi"><div className="k">Cashflow / mois</div><div className={"v " + cClass(mCashflow)}>{mCashflow >= 0 ? "+" : "-"}{euro0(Math.abs(mCashflow))} EUR</div></div>
            <div className="kpi"><div className="k">Effort d'epargne / mois</div><div className={"v " + (mCashflow >= 0 ? "g" : "w")}>{mCashflow >= 0 ? "0 EUR" : euro0(-mCashflow) + " EUR"}</div></div>
            <div className="kpi"><div className="k">Mensualite</div><div className="v">{euro0(mPayment)} EUR</div></div>
          </div>

          <div className={"badge " + vClass}>{verdict}</div>
        </div>
      </div>
    </div>
  );
}
