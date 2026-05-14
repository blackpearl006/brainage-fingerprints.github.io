import { useState, useEffect, Suspense, lazy } from "react";
import Section from "../components/Section";
import ControlsSidebar from "../components/ControlsSidebar";
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
      Loading 3D atlas…
    </div>
  );
}

function Panel({ title, tag, analysis, cohort, threshold, view, showAll, regions, fingerprints }) {
  const data   = fingerprints?.[analysis]?.[cohort]?.[threshold];
  const counts = data?.counts ?? Array(246).fill(0);
  const sig    = data?.sig    ?? Array(246).fill(0);
  const sigCount = sig.filter(v => v === 1).length;

  const tagColors = { A: "bg-ink text-paper", B: "bg-sig text-paper" };

  return (
    <div className="flex-1 min-w-0 rounded-xl border border-rule/20 overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-paper border-b border-rule/20">
        <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${tagColors[tag]}`}>{tag}</span>
        <div>
          <p className="font-sans text-sm font-semibold text-ink leading-tight">{cohort}</p>
          <p className="font-mono text-[10px] text-ink2">{ANALYSIS_LABELS[analysis]}</p>
        </div>
        <span className="ml-auto font-mono text-[10px] text-sig font-bold">{sigCount} sig. ROIs</span>
      </div>

      {/* Content */}
      <div className="p-4">
        {view === "table" && (
          <ROITable regions={regions} counts={counts} sig={sig} showAll={showAll}/>
        )}
        {view === "2d" && (
          <GlassBrain
            src={`/assets/figures/${cohort}_${analysis}.png`}
            alt={`${cohort} ${ANALYSIS_LABELS[analysis]} fingerprint`}
            caption={`${cohort} — ${ANALYSIS_LABELS[analysis]} (${threshold.replace(/_rois/,"").replace(/_/g," ")})`}
          />
        )}
        {view === "3d" && (
          <Suspense fallback={<LoadingAtlas/>}>
            <BrainnetomeAtlas counts={counts} sig={sig} regions={regions} height={460}/>
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default function Playground() {
  const [analysis,     setAnalysis]     = useState("main");
  const [cohortA,      setCohortA]      = useState("OASIS3");
  const [cohortB,      setCohortB]      = useState("ADNI");
  const [compareMode,  setCompareMode]  = useState(false);
  const [threshold,    setThreshold]    = useState("top_20_perc_rois");
  const [view,         setView]         = useState("table");
  const [showAll,      setShowAll]      = useState(false);
  const [regions,      setRegions]      = useState(null);
  const [fingerprints, setFingerprints] = useState(null);

  useEffect(() => {
    loadRegions().then(r => setRegions(byId(r)));
    loadFingerprints().then(setFingerprints);
  }, []);

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
      lede="Which brain regions drive brain-age predictions? Toggle analysis type, cohort, threshold, and view mode. Significant ROIs pass a binomial test at the chosen top-N% threshold."
    >
      <div className="flex gap-5 items-start">
        {/* Panels */}
        <div className={`flex-1 min-w-0 flex gap-4 ${compareMode ? "flex-row items-start" : "flex-col"}`}>
          <Panel
            title={`${cohortA} — ${ANALYSIS_LABELS[analysis]}`}
            tag="A"
            analysis={analysis}
            cohort={cohortA}
            threshold={threshold}
            view={view}
            showAll={showAll}
            regions={regions}
            fingerprints={fingerprints}
          />
          {compareMode && (
            <Panel
              title={`${cohortB} — ${ANALYSIS_LABELS[analysis]}`}
              tag="B"
              analysis={analysis}
              cohort={cohortB}
              threshold={threshold}
              view={view}
              showAll={showAll}
              regions={regions}
              fingerprints={fingerprints}
            />
          )}
        </div>

        {/* Right-side controls */}
        <ControlsSidebar
          analysis={analysis}       setAnalysis={setAnalysis}
          cohortA={cohortA}         setCohortA={setCohortA}
          cohortB={cohortB}         setCohortB={setCohortB}
          compareMode={compareMode} setCompareMode={setCompareMode}
          threshold={threshold}     setThreshold={setThreshold}
          view={view}               setView={setView}
          showAll={showAll}         setShowAll={setShowAll}
        />
      </div>
    </Section>
  );
}
