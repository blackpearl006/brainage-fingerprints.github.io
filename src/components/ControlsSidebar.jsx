import { useState } from "react";

const ANALYSIS_OPTIONS = [
  { key: "main",         label: "Main Study" },
  { key: "longitudinal", label: "Longitudinal" },
  { key: "female",       label: "Female" },
  { key: "male",         label: "Male" },
  { key: "left_hem",     label: "Left Hemisphere" },
  { key: "right_hem",    label: "Right Hemisphere" },
  { key: "caucasian",    label: "Caucasian (Supp.)" },
];

const COHORTS = ["ADNI","OASIS3","MAYO","CAMCAN","SALD","SRPBS","BrainLat","ABIL"];

const THRESHOLDS = [
  { key: "top_20_perc_rois", label: "Top 20%" },
  { key: "top_15_perc_rois", label: "Top 15%" },
  { key: "top_10_perc_rois", label: "Top 10%" },
  { key: "top_5_perc_rois",  label: "Top 5%"  },
];

const VIEWS = [
  { key: "table", label: "Table" },
  { key: "2d",    label: "2D Image" },
  { key: "3d",    label: "3D Brain" },
];

export default function ControlsSidebar({
  analysis, setAnalysis,
  cohortA, setCohortA,
  cohortB, setCohortB,
  compareMode, setCompareMode,
  threshold, setThreshold,
  view, setView,
  showAll, setShowAll,
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center pt-4 flex-shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="writing-mode-vertical font-mono text-xs text-ink2 hover:text-ink px-2 py-4 rounded border border-rule/20 bg-paper2 hover:bg-paper transition-colors"
        >
          ▶ Controls
        </button>
      </div>
    );
  }

  const groupLabel = "block font-sans text-[10px] font-semibold text-ink2 uppercase tracking-widest mb-1.5 mt-4 first:mt-0";
  const btn = (active) =>
    `w-full text-left px-3 py-1.5 rounded font-mono text-xs transition-colors leading-snug ${
      active
        ? "bg-ink text-paper"
        : "hover:bg-paper text-ink2 hover:text-ink"
    }`;

  return (
    <div className="w-48 flex-shrink-0 bg-paper2 rounded-xl border border-rule/20 p-4 self-start sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <span className="font-sans text-[11px] font-bold text-ink uppercase tracking-widest">Controls</span>
        <button onClick={() => setCollapsed(true)} className="text-ink2 hover:text-ink font-mono text-xs leading-none">◀</button>
      </div>

      {/* Analysis */}
      <p className={groupLabel}>Analysis</p>
      {ANALYSIS_OPTIONS.map(({ key, label }) => (
        <button key={key} onClick={() => setAnalysis(key)} className={btn(analysis === key)}>
          {label}
        </button>
      ))}

      {/* Cohort A */}
      <p className={groupLabel}>Cohort</p>
      {COHORTS.map(c => (
        <button key={c} onClick={() => setCohortA(c)} className={btn(cohortA === c)}>{c}</button>
      ))}

      {/* Compare */}
      <p className={groupLabel}>Compare</p>
      <label className="flex items-center gap-2 cursor-pointer px-1 mb-2">
        <input
          type="checkbox"
          checked={compareMode}
          onChange={e => setCompareMode(e.target.checked)}
          className="accent-sig w-3.5 h-3.5"
        />
        <span className="font-mono text-xs text-ink2">Enable compare</span>
      </label>
      {compareMode && (
        <>
          <p className="font-sans text-[10px] font-semibold text-ink2 uppercase tracking-widest mb-1">Compare to</p>
          {COHORTS.filter(c => c !== cohortA).map(c => (
            <button key={c} onClick={() => setCohortB(c)} className={btn(cohortB === c)}>{c}</button>
          ))}
        </>
      )}

      {/* Threshold */}
      <p className={groupLabel}>Threshold</p>
      {THRESHOLDS.map(t => (
        <button key={t.key} onClick={() => setThreshold(t.key)} className={btn(threshold === t.key)}>
          {t.label}
        </button>
      ))}

      {/* View */}
      <p className={groupLabel}>View</p>
      {VIEWS.map(v => (
        <button key={v.key} onClick={() => setView(v.key)} className={btn(view === v.key)}>
          {v.label}
        </button>
      ))}

      {/* Show all */}
      <p className={groupLabel}>Options</p>
      <label className="flex items-center gap-2 cursor-pointer px-1">
        <input
          type="checkbox"
          checked={showAll}
          onChange={e => setShowAll(e.target.checked)}
          className="accent-sig w-3.5 h-3.5"
        />
        <span className="font-mono text-xs text-ink2">Show all ROIs</span>
      </label>
    </div>
  );
}
