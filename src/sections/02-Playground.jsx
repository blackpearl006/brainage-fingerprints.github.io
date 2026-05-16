import { useState, useEffect, useRef, Suspense, lazy, useMemo, useCallback } from "react";
import Section from "../components/Section";
import FilterBar from "../components/FilterBar";
import ROITable from "../components/ROITable";
import GlassBrain from "../components/GlassBrain";
import { loadRegions, loadFingerprintAnalysis, byId } from "../lib/data";
import NetworkRadar from "../components/NetworkRadar";
import { useIsMobile } from "../lib/useIsMobile";

const BrainnetomeAtlas = lazy(() => import("../components/BrainnetomeAtlas"));

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_COHORTS = ["ADNI","OASIS3","MAYO","CAMCAN","SALD","SRPBS","BrainLat","ABIL"];

const DEFAULT_STATE = {
  analysis:          "main",
  selectedCohorts:   [...ALL_COHORTS],
  threshold:         "top_20_perc_rois",
  view:              "split",
  showAll:           false,
  strictIntersection: true,
};

const ANALYSIS_LABELS = {
  main:         "Main Study",
  longitudinal: "Longitudinal",
  female:       "Female",
  male:         "Male",
  left_hem:     "Left Hemisphere",
  right_hem:    "Right Hemisphere",
  caucasian:    "Caucasian",
};

const THRESHOLD_LABELS = {
  top_20_perc_rois: "Top 20%",
  top_15_perc_rois: "Top 15%",
  top_10_perc_rois: "Top 10%",
  top_5_perc_rois:  "Top 5%",
};

// ── Intersection engine ────────────────────────────────────────────────────────

function computeIntersectionData(cohorts, fingerprints, analysis, threshold, strict) {
  if (!fingerprints || cohorts.length === 0) {
    return { counts: Array(246).fill(0), sig: Array(246).fill(0) };
  }
  if (cohorts.length === 1) {
    const data = fingerprints[analysis]?.[cohorts[0]]?.[threshold];
    return {
      counts: data?.counts ?? Array(246).fill(0),
      sig:    data?.sig    ?? Array(246).fill(0),
    };
  }
  const counts = Array(246).fill(0);
  for (const cohort of cohorts) {
    const data = fingerprints[analysis]?.[cohort]?.[threshold];
    if (!data) continue;
    for (let i = 0; i < 246; i++) {
      if (data.sig[i] === 1) counts[i]++;
    }
  }
  const sig = counts.map(c => (strict ? c === cohorts.length : c > 0) ? 1 : 0);
  return { counts, sig };
}

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-ink text-paper px-5 py-2.5 rounded-full shadow-xl font-mono text-xs flex items-center gap-3 animate-fade-up">
        <span className="text-sig">✓</span>
        <span>{message}</span>
      </div>
    </div>
  );
}

// ── Sub-views ──────────────────────────────────────────────────────────────────

function LoadingAtlas() {
  return (
    <div className="h-[500px] rounded-xl bg-[#141E2D] flex items-center justify-center">
      <div className="flex items-center gap-2 text-slate-400 font-mono text-xs">
        <div className="w-4 h-4 rounded-full border-2 border-sig border-t-transparent animate-spin"/>
        Loading 3D atlas…
      </div>
    </div>
  );
}

function Atlas3D({ counts, sig, regions, numCohorts, height = 500 }) {
  return (
    <Suspense fallback={<LoadingAtlas/>}>
      <BrainnetomeAtlas counts={counts} sig={sig} regions={regions} height={height} numCohorts={numCohorts}/>
    </Suspense>
  );
}

function MobileView({ counts, sig, regions, numCohorts, analysisData, selectedCohorts, threshold }) {
  const [showRadar, setShowRadar] = useState(false);
  return (
    <div className="w-full">
      <Atlas3D counts={counts} sig={sig} regions={regions} numCohorts={numCohorts} height={420}/>
      <button
        onClick={() => setShowRadar(s => !s)}
        className="mt-3 w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-rule/20 bg-paper2 font-mono text-xs text-ink2 hover:text-ink transition-colors"
      >
        <span>Network Radar</span>
        <span className="text-[10px] opacity-60">{showRadar ? "▲ Hide" : "▼ Show"}</span>
      </button>
      {showRadar && (
        <NetworkRadar
          analysisData={analysisData}
          selectedCohorts={selectedCohorts}
          threshold={threshold}
          regions={regions}
        />
      )}
    </div>
  );
}

function ContentView({ view, counts, sig, regions, analysis, selectedCohorts, threshold, numCohorts, showAll, analysisData, isMobile }) {
  // On mobile always show 3D; network radar collapsed behind a toggle
  if (isMobile) {
    return <MobileView counts={counts} sig={sig} regions={regions} numCohorts={numCohorts} analysisData={analysisData} selectedCohorts={selectedCohorts} threshold={threshold}/>;
  }

  if (view === "table") {
    return <ROITable regions={regions} counts={counts} sig={sig} showAll={showAll} numCohorts={numCohorts}/>;
  }
  if (view === "3d") {
    return <Atlas3D counts={counts} sig={sig} regions={regions} numCohorts={numCohorts} height={560}/>;
  }
  if (view === "2d") {
    const cohort = selectedCohorts[0] ?? "OASIS3";
    return (
      <GlassBrain
        src={`${import.meta.env.BASE_URL}assets/figures/${cohort}_${analysis}.png`}
        alt={`${cohort} ${ANALYSIS_LABELS[analysis]} fingerprint`}
        caption={`${cohort} — ${ANALYSIS_LABELS[analysis]} · ${THRESHOLD_LABELS[threshold]}`}
      />
    );
  }
  // split: table + 3D side by side
  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      <div>
        <p className="font-mono text-[10px] text-ink2 uppercase tracking-wider mb-2">ROI Table</p>
        <ROITable regions={regions} counts={counts} sig={sig} showAll={showAll} numCohorts={numCohorts}/>
      </div>
      <div>
        <p className="font-mono text-[10px] text-ink2 uppercase tracking-wider mb-2">3D Brain</p>
        <Atlas3D counts={counts} sig={sig} regions={regions} numCohorts={numCohorts} height={520}/>
        <NetworkRadar
          analysisData={analysisData}
          selectedCohorts={selectedCohorts}
          threshold={threshold}
          regions={regions}
        />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Playground() {
  const isMobile = useIsMobile();
  const [analysis,          setAnalysis]          = useState(DEFAULT_STATE.analysis);
  const [selectedCohorts,   setSelectedCohorts]   = useState(DEFAULT_STATE.selectedCohorts);
  const [threshold,         setThreshold]         = useState(DEFAULT_STATE.threshold);
  const [view,              setView]              = useState(DEFAULT_STATE.view);
  const [showAll,           setShowAll]           = useState(DEFAULT_STATE.showAll);
  const [strictIntersection, setStrictIntersection] = useState(DEFAULT_STATE.strictIntersection);
  const [regions,           setRegions]           = useState(null);
  const [fingerprintCache,  setFingerprintCache]  = useState({});
  const [toast,             setToast]             = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    loadRegions().then(r => setRegions(byId(r)));
    loadFingerprintAnalysis("main").then(data =>
      setFingerprintCache(c => ({ ...c, main: data }))
    );
  }, []);

  useEffect(() => {
    if (fingerprintCache[analysis]) return;
    loadFingerprintAnalysis(analysis).then(data =>
      setFingerprintCache(c => ({ ...c, [analysis]: data }))
    );
  }, [analysis]); // eslint-disable-line react-hooks/exhaustive-deps

  const fingerprints = fingerprintCache[analysis] ? { [analysis]: fingerprintCache[analysis] } : null;

  // Toast helper
  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Fire toast whenever any filter changes (after initial load)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const cohortSummary = selectedCohorts.length === 8 ? "All 8 cohorts"
      : selectedCohorts.length === 1 ? selectedCohorts[0]
      : `${selectedCohorts.length} cohorts`;
    const strictLabel = selectedCohorts.length > 1 ? (strictIntersection ? " · strict ∩" : " · loose ∩") : "";
    showToast(`${ANALYSIS_LABELS[analysis]} · ${cohortSummary}${strictLabel} · ${THRESHOLD_LABELS[threshold]}`);
  }, [analysis, selectedCohorts, threshold, strictIntersection]); // eslint-disable-line react-hooks/exhaustive-deps

  function reset() {
    setAnalysis(DEFAULT_STATE.analysis);
    setSelectedCohorts([...DEFAULT_STATE.selectedCohorts]);
    setThreshold(DEFAULT_STATE.threshold);
    setView(DEFAULT_STATE.view);
    setShowAll(DEFAULT_STATE.showAll);
    setStrictIntersection(DEFAULT_STATE.strictIntersection);
    showToast("Reset to default — Main Study · All 8 cohorts · strict ∩ · Top 20%");
  }

  const analysisLoading = !fingerprints;

  const { counts, sig } = useMemo(
    () => computeIntersectionData(selectedCohorts, fingerprints, analysis, threshold, strictIntersection),
    [selectedCohorts, fingerprints, analysis, threshold, strictIntersection],
  );

  const sigCount   = sig.filter(v => v === 1).length;
  const isMulti    = selectedCohorts.length > 1;
  const numCohorts = selectedCohorts.length;

  const cohortLabel = isMulti
    ? `${selectedCohorts.length === 8 ? "All 8 cohorts" : selectedCohorts.join(" · ")}`
    : selectedCohorts[0] ?? "—";

  if (!regions || !fingerprintCache.main) {
    return (
      <section className="max-w-wide mx-auto px-6 py-16">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-sig border-t-transparent animate-spin"/>
          <p className="font-mono text-sm text-ink2">Loading fingerprint data…</p>
        </div>
      </section>
    );
  }

  return (
    <Section
      id="playground"
      eyebrow="Explore"
      title="Fingerprint Playground"
      lede="Which brain regions drive brain-age predictions? Select cohorts for intersection analysis, choose a view, and explore the 246-ROI Brainnetome atlas."
    >
      {/* Filter bar */}
      <FilterBar
        analysis={analysis}               setAnalysis={setAnalysis}
        selectedCohorts={selectedCohorts} setSelectedCohorts={setSelectedCohorts}
        threshold={threshold}             setThreshold={setThreshold}
        view={view}                       setView={setView}
        showAll={showAll}                 setShowAll={setShowAll}
        isMobile={isMobile}
      />

      {/* Result panel */}
      <div className="rounded-xl border border-rule/20 overflow-hidden">
        {/* Panel header */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-paper border-b border-rule/20">
          {/* Title block */}
          <div className="flex-1 min-w-0">
            <p className="font-sans text-sm font-semibold text-ink leading-tight truncate">
              {ANALYSIS_LABELS[analysis]}
            </p>
            <p className="font-mono text-[10px] text-ink2 mt-0.5 truncate">
              {isMulti ? `∩ ${cohortLabel}` : cohortLabel}
            </p>
          </div>

          {/* Strict intersection toggle — inline with sig count */}
          {isMulti && (
            <button
              onClick={() => setStrictIntersection(s => !s)}
              className={`flex items-center gap-1.5 font-mono text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${
                strictIntersection
                  ? "bg-ink text-paper border-ink"
                  : "border-rule/30 text-ink2 hover:border-ink/40 hover:text-ink"
              }`}
              title="Toggle strict (all cohorts) vs. loose (any cohort) intersection"
            >
              <span className="text-sm leading-none">∩</span>
              <span>{strictIntersection ? "Strict" : "Loose"}</span>
            </button>
          )}

          {/* Significant ROIs count */}
          <div className="flex items-center gap-2 bg-paper2 rounded-lg px-3 py-1.5 border border-rule/20">
            <span className="font-mono text-[10px] text-ink2">Significant</span>
            <span className="font-mono text-sm font-bold text-sig tabular-nums">{sigCount}</span>
            <span className="font-mono text-[10px] text-ink2">ROIs</span>
          </div>

          {/* Threshold badge — desktop only */}
          {!isMobile && (
            <span className="font-mono text-[10px] px-2.5 py-1.5 rounded-lg bg-paper2 border border-rule/20 text-ink2">
              {THRESHOLD_LABELS[threshold]}
            </span>
          )}

          {/* Reset button */}
          <button
            onClick={reset}
            className="font-mono text-[10px] px-3 py-1.5 rounded-lg border border-rule/30 text-ink2 hover:border-sig/60 hover:text-sig transition-colors"
            title="Reset to default configuration"
          >
            ↺ Reset
          </button>
        </div>

        {/* Content */}
        <div className="p-5 relative">
          {analysisLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-paper/70 z-10 rounded-b-xl">
              <div className="flex items-center gap-2 text-ink2 font-mono text-xs">
                <div className="w-3 h-3 rounded-full border-2 border-sig border-t-transparent animate-spin"/>
                Loading {ANALYSIS_LABELS[analysis]}…
              </div>
            </div>
          )}
          <ContentView
            view={view} counts={counts} sig={sig} regions={regions}
            analysis={analysis} selectedCohorts={selectedCohorts}
            threshold={threshold} numCohorts={numCohorts} showAll={showAll}
            analysisData={fingerprintCache[analysis]}
            isMobile={isMobile}
          />
        </div>
      </div>

      {/* Multi-cohort summary */}
      {isMulti && sigCount > 0 && (
        <div className="mt-4 px-5 py-3 bg-paper2 rounded-xl border border-rule/20 flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] text-ink2 flex-1">
            <span className="text-sig font-bold">{sigCount} ROIs</span>
            {" significant in "}
            {strictIntersection ? "all" : "≥1 of"}{" "}
            {numCohorts} cohorts
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedCohorts.map(c => (
              <span key={c} className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-ink text-paper">{c}</span>
            ))}
          </div>
        </div>
      )}

      <Toast message={toast}/>
    </Section>
  );
}
