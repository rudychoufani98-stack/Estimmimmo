"use client";
import { useState, useRef, useEffect } from "react";
import {
  CITIES, IDF_COMMUNES, METRO_INSEE, METRICS,
  fmtNum, colorScale, score, metricNorm, monthLabel,
} from "./marketData";

// Exécute `worker(item, i)` sur toute la liste avec `poolSize` tâches en parallèle
async function runPool(items, poolSize, worker) {
  let i = 0;
  async function next() {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(poolSize, items.length) }, next));
}

// Texte "État du marché" généré pour une ville
function buildNarrative(c, live) {
  const f = (x) => x.toFixed(1).replace(".", ",");
  const pm2 = live && live.data && live.data.medianPm2 ? live.data.medianPm2 : c.pm2;
  const y1 = live && live.data && live.data.trendPct != null ? live.data.trendPct : c.y1;
  const real = !!(live && live.data && live.data.medianPm2);
  const out = [];
  let seg;

  seg = pm2 >= 6000 ? "un marché haut de gamme, parmi les plus chers de France"
      : pm2 >= 4000 ? "un marché cher et tendu"
      : pm2 >= 2800 ? "un marché de prix intermédiaire"
      : pm2 >= 2000 ? "un marché abordable"
      : "un marché très abordable, à fort effet de levier";
  out.push(`${c.name} est ${seg} (~${fmtNum(pm2)} €/m²${real ? ", médian DVF réel" : ""}).`);

  seg = y1 <= -3 ? `les prix reculent nettement (${f(y1)} %/an)`
      : y1 < -0.5 ? `les prix se tassent légèrement (${f(y1)} %/an)`
      : y1 <= 0.5 ? "les prix sont globalement stables"
      : y1 < 3 ? `les prix progressent modérément (+${f(y1)} %/an)`
      : `les prix accélèrent (+${f(y1)} %/an)`;
  out.push(`Côté dynamique, ${seg}${real ? " sur les dernières ventes enregistrées" : ""}.`);

  seg = c.rdt >= 7 ? "un rendement locatif brut très élevé, idéal pour du cashflow"
      : c.rdt >= 5.5 ? "un bon rendement locatif"
      : c.rdt >= 4.5 ? "un rendement locatif correct"
      : "un rendement locatif faible : logique patrimoniale plutôt que cashflow";
  out.push(`Le marché locatif y offre ${seg} (~${f(c.rdt)} % brut).`);

  const sc = score(c);
  out.push(sc >= 70 ? "Profil globalement attractif pour investir aujourd'hui."
    : sc >= 50 ? "Profil équilibré : intéressant selon votre stratégie (cashflow ou patrimoine)."
    : "Davantage une valeur refuge patrimoniale qu'un placement à haut rendement.");

  const enc = c.enc
    ? "en location nue, les loyers sont plafonnés (encadrement des loyers en vigueur)"
    : "la location nue n'y est pas plafonnée";
  const abnb = c.abnb
    ? "en meublé touristique (Airbnb), la ville encadre strictement : 120 nuits/an maximum pour une résidence principale, numéro d'enregistrement obligatoire, et changement d'usage avec compensation exigé pour une résidence secondaire"
    : "en Airbnb, le cadre est plus souple, même si un numéro d'enregistrement peut être demandé en mairie";
  out.push(`Réglementation locative : ${enc} ; ${abnb}.`);
  out.push("Règles évolutives (loi Le Meur, 2024) — à confirmer auprès de la mairie avant d'investir.");
  return out.join(" ");
}

// --- Panneau détail d'une ville -------------------------------------------
function CityDetail({ city, live, isMetro, zonesLoading, onBreakdown, onEstimate, onBack }) {
  return (
    <div className="city-detail">
      <button className="cd-back" onClick={onBack}>← Classement</button>
      <h3 className="cd-name">{city.name}</h3>

      <div className="cd-score">
        <span>Score d'investissement</span>
        <b style={{ color: colorScale(score(city) / 100) }}>{score(city)}<small>/100</small></b>
      </div>

      <div className="cd-refs">
        <div><span>Prix moyen</span><b>{fmtNum(city.pm2)} €/m²</b></div>
        <div><span>Évolution 1 an</span><b className={city.y1 >= 0 ? "pos" : "neg"}>{city.y1 > 0 ? "+" : ""}{city.y1.toFixed(1).replace(".", ",")} %</b></div>
        <div><span>Rendement brut</span><b>{city.rdt.toFixed(1).replace(".", ",")} %</b></div>
      </div>

      <div className="cd-narrative">
        <div className="cd-narrative-head">État du marché</div>
        <p>{buildNarrative(city, live)}</p>
      </div>

      <div className="cd-live">
        <div className="cd-live-head">Ventes réelles enregistrées (DVF) · à jour {monthLabel(new Date())}</div>
        {live.loading && <div className="cd-live-loading"><span className="spinner" />Analyse des ventes DVF…</div>}
        {!live.loading && live.data && (
          <>
            <div className="cd-live-main">
              <b>{fmtNum(live.data.medianPm2)} €/m²</b>
              <span>médian réel · {fmtNum(live.data.count)} ventes</span>
            </div>
            {live.data.byYear && live.data.byYear.length > 0 && (
              <div className="cd-live-years">
                {live.data.byYear.map((e) => (
                  <div key={e.year}><span>{e.year}</span><b>{fmtNum(e.med)} €</b><small>{e.n} ventes</small></div>
                ))}
              </div>
            )}
          </>
        )}
        {!live.loading && !live.data && <div className="cd-live-empty">Données DVF indisponibles pour cette commune.</div>}
      </div>

      {isMetro && (
        <button className="btn-sector" onClick={onBreakdown} disabled={zonesLoading}>
          {zonesLoading
            ? <><span className="spinner" />Chargement…</>
            : city.insee === "75056"
              ? "🔍 Voir tout le détail Île-de-France (par commune)"
              : "🔍 Voir le détail par secteur (arrondissements)"}
        </button>
      )}

      <button className="btn" onClick={onEstimate}>Estimer un bien à {city.name}</button>
    </div>
  );
}

// --- Panneau détail par secteur / commune ---------------------------------
function ZonePanel({ city, zones, year, region, progress, onBack }) {
  const prices = zones.map((z) => z.medianPm2);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const title = region ? `${region} par commune` : `${city.name} par secteur`;
  return (
    <div className="zone-panel">
      <button className="cd-back" onClick={onBack}>← {city.name}</button>
      <h3 className="cd-name">{title}</h3>
      <p className="zone-sub">
        Prix/m² médian réel (DVF{region ? ", ventes récentes" : ` ${year}`}) par {region ? "commune" : "secteur"}.{" "}
        <b>Vert = plus abordable</b> (souvent meilleur potentiel de rendement), rouge = plus cher (prime, patrimonial).
      </p>
      {progress && progress.done < progress.total && (
        <div className="zone-progress">
          <div className="zp-bar"><div className="zp-fill" style={{ width: (100 * progress.done / progress.total) + "%" }} /></div>
          <span>Chargement des communes… {progress.done}/{progress.total}</span>
        </div>
      )}
      <div className="zone-legend"><span>Plus abordable</span><div className="zl-bar" /><span>Plus cher</span></div>
      <div className="zone-list">
        {zones.map((z, i) => (
          <div className="zone-item" key={z.code}>
            <span className="zone-rank">{i + 1}</span>
            <span className="zone-name">{z.name}</span>
            <span className="zone-count">{z.count} ventes</span>
            <span className="zone-pm2" style={{ color: colorScale(max === min ? 0.5 : (max - z.medianPm2) / (max - min)) }}>
              {fmtNum(z.medianPm2)} €/m²
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Carte principale ------------------------------------------------------
export default function MarketMap({ onEstimateCity }) {
  const [metric, setMetric] = useState("score");
  const [selected, setSelected] = useState(null);
  const [live, setLive] = useState({ loading: false, data: null });
  const [breakdown, setBreakdown] = useState({ loading: false, data: null });

  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const cityLayerRef = useRef(null);
  const zoneLayerRef = useRef(null);
  const LRef = useRef(null);

  // Dessine les bulles des grandes villes, colorées selon l'indicateur choisi
  function drawCities() {
    const L = LRef.current;
    if (!L || !cityLayerRef.current) return;
    cityLayerRef.current.clearLayers();
    for (const c of CITIES) {
      const n = metricNorm(metric, c);
      const mk = L.circleMarker([c.lat, c.lon], {
        radius: 7 + 8 * n, color: "#ffffff", weight: 1.5,
        fillColor: colorScale(n), fillOpacity: 0.9,
      });
      const m = METRICS.find((x) => x.key === metric);
      mk.bindTooltip(`<b>${c.name}</b> — ${m.fmt(c)}`, { direction: "top" });
      mk.on("click", () => selectCity(c));
      mk.addTo(cityLayerRef.current);
    }
  }

  // Dessine les bulles de communes/secteurs, colorées par prix (vert = moins cher)
  function drawZones(zones, fit = true) {
    const L = LRef.current;
    if (!L || !zoneLayerRef.current) return;
    if (cityLayerRef.current) cityLayerRef.current.clearLayers();
    zoneLayerRef.current.clearLayers();
    const prices = zones.map((z) => z.medianPm2);
    const min = Math.min(...prices), max = Math.max(...prices);
    const pts = [];
    for (const z of zones) {
      const t = max === min ? 0.5 : (max - z.medianPm2) / (max - min);
      const mk = L.circleMarker([z.lat, z.lon], {
        radius: 9, color: "#fff", weight: 1.5, fillColor: colorScale(t), fillOpacity: 0.9,
      });
      mk.bindTooltip(`<b>${z.name}</b> — ${fmtNum(z.medianPm2)} €/m² (${z.count} ventes)`, { direction: "top" });
      mk.addTo(zoneLayerRef.current);
      pts.push([z.lat, z.lon]);
    }
    if (fit && pts.length > 1 && mapRef.current) mapRef.current.fitBounds(pts, { padding: [40, 40], maxZoom: 13 });
  }

  // Sélection d'une ville -> fetch DVF réel
  async function selectCity(c) {
    setSelected(c);
    setLive({ loading: true, data: null });
    setBreakdown({ loading: false, data: null });
    if (zoneLayerRef.current) zoneLayerRef.current.clearLayers();
    if (mapRef.current) mapRef.current.setView([c.lat, c.lon], 11, { animate: true });
    try {
      const r = await fetch(`/api/market?insee=${c.insee}`);
      const d = await r.json();
      setLive({ loading: false, data: d && d.medianPm2 ? d : null });
    } catch {
      setLive({ loading: false, data: null });
    }
  }

  // Détail : arrondissements (Lyon/Marseille) OU toute l'Île-de-France (Paris)
  async function loadBreakdown(c) {
    if (c.insee === "75056") return loadIleDeFrance();
    setBreakdown({ loading: true, data: null });
    try {
      const r = await fetch(`/api/market?insee=${c.insee}&breakdown=1`);
      const d = await r.json();
      if (d && d.zones && d.zones.length) {
        setBreakdown({ loading: false, data: d });
        drawZones(d.zones);
      } else {
        setBreakdown({ loading: false, data: null, empty: true });
      }
    } catch {
      setBreakdown({ loading: false, data: null, empty: true });
    }
  }

  // Charge toutes les communes d'Île-de-France en direct (progressif)
  async function loadIleDeFrance() {
    const total = IDF_COMMUNES.length;
    setBreakdown({ loading: true, data: null, progress: { done: 0, total } });
    if (cityLayerRef.current) cityLayerRef.current.clearLayers();
    if (zoneLayerRef.current) zoneLayerRef.current.clearLayers();
    if (mapRef.current) mapRef.current.setView([48.75, 2.42], 9, { animate: true });

    const zones = [];
    let done = 0;
    const region = "Île-de-France";
    await runPool(IDF_COMMUNES, 6, async (com) => {
      try {
        const r = await fetch(`/api/market?insee=${com.insee}&fast=1`);
        const d = await r.json();
        if (d && d.medianPm2) {
          zones.push({ code: com.insee, name: com.name, lat: com.lat, lon: com.lon, medianPm2: d.medianPm2, count: d.count });
          const sorted = [...zones].sort((a, b) => a.medianPm2 - b.medianPm2);
          drawZones(sorted, false);
          done++;
          setBreakdown({ loading: true, data: { zones: sorted, region }, progress: { done, total } });
        } else {
          done++;
        }
      } catch {
        done++;
      }
      setBreakdown((prev) => (prev && prev.progress ? { ...prev, progress: { done, total } } : prev));
    });

    setBreakdown({ loading: false, data: { zones: [...zones].sort((a, b) => a.medianPm2 - b.medianPm2), region } });
  }

  // Retour du détail-secteur vers la fiche ville
  function backToCity() {
    setBreakdown({ loading: false, data: null });
    if (zoneLayerRef.current) zoneLayerRef.current.clearLayers();
    drawCities();
    if (selected && mapRef.current) mapRef.current.setView([selected.lat, selected.lon], 11, { animate: true });
  }

  // Retour de la fiche ville vers le classement (vue France)
  function backToRanking() {
    setSelected(null);
    setBreakdown({ loading: false, data: null });
    if (zoneLayerRef.current) zoneLayerRef.current.clearLayers();
    drawCities();
    if (mapRef.current) mapRef.current.setView([46.7, 2.5], 6, { animate: true });
  }

  // Init de la carte (une fois)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([46.7, 2.5], 6);
      mapRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      cityLayerRef.current = L.layerGroup().addTo(map);
      zoneLayerRef.current = L.layerGroup().addTo(map);
      drawCities();
      setTimeout(() => map.invalidateSize(), 120);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recolorier quand l'indicateur change (si on est sur la vue villes)
  useEffect(() => {
    if (!breakdown.data && !breakdown.loading) drawCities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric]);

  const ranking = [...CITIES].sort((a, b) => score(b) - score(a));
  const showZone = selected && (breakdown.data || breakdown.progress);

  return (
    <div className="market-wrap">
      <div className="market-intro">
        <h2>
          Carte des marchés — où investir en France{" "}
          <span className="market-month">Actualisé · {monthLabel(new Date())}</span>
        </h2>
        <p>
          Chaque bulle est une grande ville. La couleur reflète l'indicateur choisi (vert = plus favorable).
          Cliquez une ville pour voir le <b>prix/m² médian réel issu des ventes DVF</b> et l'analyse de son marché.
        </p>
      </div>

      <div className="market-metrics">
        {METRICS.map((m) => (
          <button key={m.key} className={"mm-btn" + (metric === m.key ? " active" : "")} onClick={() => setMetric(m.key)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="market-grid">
        <div className="market-map-col">
          <div ref={containerRef} className="market-map" />
          <div className="market-legend">
            <span>Moins favorable</span>
            <div className="ml-bar" />
            <span>Plus favorable</span>
          </div>
        </div>

        <div className="market-side">
          {showZone ? (
            <ZonePanel
              city={selected}
              zones={(breakdown.data && breakdown.data.zones) || []}
              year={(breakdown.data && breakdown.data.year) || new Date().getFullYear() - 1}
              region={breakdown.data && breakdown.data.region}
              progress={breakdown.progress}
              onBack={backToCity}
            />
          ) : selected ? (
            <CityDetail
              city={selected}
              live={live}
              isMetro={METRO_INSEE.has(selected.insee)}
              zonesLoading={breakdown.loading}
              onBreakdown={() => loadBreakdown(selected)}
              onEstimate={() => onEstimateCity && onEstimateCity(selected)}
              onBack={backToRanking}
            />
          ) : (
            <div className="market-ranking">
              <div className="mr-head">Top villes où investir <span>score /100</span></div>
              <div className="mr-list">
                {ranking.map((c, i) => (
                  <button key={c.insee} className="mr-item" onClick={() => selectCity(c)}>
                    <span className="mr-rank">{i + 1}</span>
                    <span className="mr-name">{c.name}</span>
                    <span className="mr-meta">{fmtNum(c.pm2)} €/m² · {c.rdt.toFixed(1).replace(".", ",")} %</span>
                    <span className="mr-score" style={{ background: colorScale(score(c) / 100) }}>{score(c)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="market-src">
        Score = pondération rendement / dynamique de prix / accessibilité. Prix &amp; rendements de référence indicatifs ;
        le prix/m² au clic provient des ventes réelles DVF (DGFiP/Etalab).
      </p>
    </div>
  );
}
