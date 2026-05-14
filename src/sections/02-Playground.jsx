import { useState, useEffect, Suspense, lazy, useMemo } from "react";
import Section from "../components/Section";
import FilterBar from "../components/FilterBar";
import ROITable from "../components/ROITable";
import GlassBrain from "../components/GlassBrain";
import { loadRegions, loadFingerprints, byId } from "../lib/data";

const BrainnetomeAtlas = lazy(() => import("../components/BrainnetomeAtlas"));

const ANALYSIS_LABELS = {
  main:         "Main Study",
  longitudinal: "Longitudinal",
  female:       "Female",
  male:         "Male",
  left_hem:     "Left Hemisphere",
  right_hem:    "Right Hemisphere",
  caucasian:    "Caucasian",
};

function LoadingAtlas() {
  return (
    <div className="h-[480px] bg-ink/10 rounded-lg flex items-center justify-center text-ink2 font-mono text-xs">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-sig border-t-transparent animate-spin"/>
        Loading 3D atlas…
      </div>
    </div>
  );
}

// Compute intersection counts + significance across multiple cohorts
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

  // Multi-cohort: counts = number of cohorts where sig=1
  const counts = Array(246).fill(0);
  for (const cohort of cohorts) {
    const data = fingerprints[analysis]?.[cohort]?.[threshold];
    if (!data) continue;
    for (let i = 0; i < 246; i++) {
      if (data.sig[i] === 1) counts[i]++;
    }
  }

  // Significance: strict = must be in ALL cohorts; loose = must be in at least 1
  const sig = counts.map(c => (strict ? c === cohorts.length : c > 0) ? 1 : 0);

  return { counts, sig };
}

function ContentView({ view, counts, sig, regions, analysis, selectedCohorts, threshold, numCohorts, showAll }) {
  const atlas3d = (
    <Suspense fallback={<LoadingAtlas/>}>
      <BrainnetomeAtlas counts={counts} sig={sig} regions={regions} height={500} numCohorts={numCohorts}/>
    </Suspense>
  );

  if (view === "table") {
    return <ROITable regions={regions} counts={counts} sig={sig} showAll={showAll} numCohorts={numCohorts}/>;
  }

  if (view === "3d") {
    return atlas3d;
  }

  if (view === "2d") {
    const cohort = selectedCohorts[0] ?? "OASIS3";
    return (
      <GlassBrain
        src={`/assets/figures/${cohort}_${analysis}.png`}
        alt={`${cohort} ${ANALYSIS_LABELS[analysis]} fingerprint`}
        caption={`${cohort} — ${ANALYSIS_LABELS[analysis]} (${threshold.replace(/_rois/,"").replace(/_/g," ")})`}
      />
    );
  }

  // split: table left, 3D right
  if (view === "split") {
    return (
      <div className="grid lg:grid-cols-2 gap-4">
        <div>
          <p className="font-mono text-[10px] text-ink2 uppercase tracking-wider mb-2">ROI Table</p>
          <ROITable regions={regions} counts={counts} sig={sig} showAll={showAll} numCohorts={numCohorts}/>
        </div>
        <div>
          <p className="font-mono text-[10px] text-ink2 uppercase tracking-wider mb-2">3D Brain</p>
          {atlas3d}
        </div>
      </div>
    );
  }

  return null;
}

export default function Playground() {
  const [analysis,          setAnalysis]          = useState("main");
  const [selectedCohorts,   setSelectedCohorts]   = useState(["OASIS3"]);
  const [threshold,         setThreshold]         = useState("top_20_perc_rois");
  const [view,              setView]              = useState("table");
  const [showAll,           setShowAll]           = useState(false);
  const [strictIntersection, setStrictIntersection] = useState(true);
  const [regions,           setRegions]           = useState(null);
  const [fingerprints,      setFingerprints]      = useState(null);

  useEffect(() => {
    loadRegions().then(r => setRegions(byId(r)));
    loadFingerprints().then(setFingerprints);
  }, []);

  const { counts, sig } = useMemo(
    () => computeIntersectionData(selectedCohorts, fingerprints, analysis, threshold, strictIntersection),
    [selectedCohorts, fingerprints, analysis, threshold, strictIntersection]
  );

  const sigCount = sig.filter(v => v === 1).length;
  const isMulti  = selectedCohorts.length > 1;
  const numCohorts = selectedCohorts.length;

  const cohortLabel = isMulti
    ? `∩ ${selectedCohorts.join(" · ")}`
    : selectedCohorts[0] ?? "—";

  if (!regions || !fingerprints) {
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
      lede="Which brain regions drive brain-age predictions? Select a single cohort or multiple cohorts to compute their intersection. Significant ROIs pass a binomial test at the chosen top-N% threshold."
    >
      {/* Filter bar */}
      <FilterBar
        analysis={analysis}               setAnalysis={setAnalysis}
        selectedCohorts={selectedCohorts} setSelectedCohorts={setSelectedCohorts}
        threshold={threshold}             setThreshold={setThreshold}
        view={view}                       setView={setView}
        showAll={showAll}                 setShowAll={setShowAll}
        strictIntersection={strictIntersection} setStrictIntersection={setStrictIntersection}
      />

      {/* Result panel */}
      <div className="rounded-xl border border-rule/20 overflow-hidden">
        {/* Panel header */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-paper border-b border-rule/20">
          <div className="flex-1 min-w-0">
            <p className="font-sans text-sm font-semibold text-ink leading-tight truncate">
              {ANALYSIS_LABELS[analysis]}
              {isMulti && (
                <span className="ml-2 text-[11px] font-mono font-normal text-sig">
                  — {strictIntersection ? "strict" : "loose"} intersection
                </span>
              )}
            </p>
            <p className="font-mono text-[10px] text-ink2 mt-0.5 truncate">{cohortLabel}</p>
          </div>

          {/* Sig count badge */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-ink2">Significant ROIs</span>
            <span className="font-mono text-sm font-bold text-sig tabular-nums">{sigCount}</span>
          </div>

          {/* Threshold badge */}
          <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-paper2 border border-rule/20 text-ink2">
            {threshold.replace("_rois","").replace(/_/g," ")}
          </span>
        </div>

        {/* Content */}
        <div className="p-5">
          <ContentView
            view={view}
            counts={counts}
            sig={sig}
            regions={regions}
            analysis={analysis}
            selectedCohorts={selectedCohorts}
            threshold={threshold}
            numCohorts={numCohorts}
            showAll={showAll}
          />
        </div>
      </div>

      {/* Intersection summary chips (multi-cohort mode) */}
      {isMulti && sigCount > 0 && (
        <div className="mt-4 p-4 bg-paper2 rounded-xl border border-rule/20">
          <p className="font-mono text-[11px] text-ink2 mb-2">
            <span className="text-sig font-bold">{sigCount} ROIs</span>
            {" "}significant in{" "}
            {strictIntersection ? "all" : "at least one of"}{" "}
            {numCohorts} selected cohort{numCohorts !== 1 ? "s" : ""}
            {strictIntersection && ` (${selectedCohorts.join(", ")})`}
          </p>
          <p className="font-mono text-[10px] text-ink2/60">
            Toggle strict/loose intersection in Options · Switch to 3D or Table+3D view for spatial context
          </p>
        </div>
      )}
    </Section>
  );
}
