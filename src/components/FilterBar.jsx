import { useState, useRef, useEffect } from "react";

const ANALYSIS_OPTIONS = [
  { key: "main",         label: "Main Study",       desc: "Cross-sectional, all subjects" },
  { key: "longitudinal", label: "Longitudinal",      desc: "Within-subject over time" },
  { key: "female",       label: "Female",            desc: "Female-only subjects" },
  { key: "male",         label: "Male",              desc: "Male-only subjects" },
  { key: "left_hem",     label: "Left Hemisphere",   desc: "Left-hem ROIs only" },
  { key: "right_hem",    label: "Right Hemisphere",  desc: "Right-hem ROIs only" },
  { key: "caucasian",    label: "Caucasian (Supp.)", desc: "European-ancestry sub-analysis" },
];

const COHORT_INFO = {
  ADNI:    { label: "ADNI",    region: "North America", ancestry: "caucasian" },
  OASIS3:  { label: "OASIS3",  region: "North America", ancestry: "caucasian" },
  MAYO:    { label: "MAYO",    region: "North America", ancestry: "caucasian" },
  CAMCAN:  { label: "CAMCAN",  region: "Europe",        ancestry: "caucasian" },
  SALD:    { label: "SALD",    region: "South Africa",  ancestry: "mixed" },
  SRPBS:   { label: "SRPBS",   region: "Japan",         ancestry: "east_asian" },
  BrainLat:{ label: "BrainLat",region: "Latin America", ancestry: "latin" },
  ABIL:    { label: "ABIL",    region: "Australia",     ancestry: "caucasian" },
};

const PRESETS = [
  { label: "Caucasian-dominant", cohorts: ["ADNI","OASIS3","MAYO","ABIL"], desc: "ADNI · OASIS3 · MAYO · ABIL" },
  { label: "All 8 cohorts",      cohorts: ["ADNI","OASIS3","MAYO","CAMCAN","SALD","SRPBS","BrainLat","ABIL"], desc: "Universal intersection" },
  { label: "Non-Western",        cohorts: ["SRPBS","BrainLat","SALD"], desc: "East Asian · Latin · African" },
];

const THRESHOLDS = [
  { key: "top_20_perc_rois", label: "Top 20%", desc: "Most permissive, highest sensitivity" },
  { key: "top_15_perc_rois", label: "Top 15%", desc: "Balanced threshold" },
  { key: "top_10_perc_rois", label: "Top 10%", desc: "Selective" },
  { key: "top_5_perc_rois",  label: "Top 5%",  desc: "Strictest — only strongest ROIs" },
];

const VIEWS = [
  { key: "table",  label: "Table",     icon: "⊞", desc: "Sortable ROI list with counts" },
  { key: "split",  label: "Table + 3D", icon: "⊟", desc: "Table alongside 3D brain" },
  { key: "3d",     label: "3D Brain",  icon: "◎", desc: "Interactive 3D atlas" },
  { key: "2d",     label: "2D Image",  icon: "▣", desc: "Glass-brain projection" },
];

function Panel({ title, children, onClose }) {
  return (
    <div className="bg-paper border border-rule/30 rounded-xl shadow-xl p-4 mt-1">
      <div className="flex justify-between items-center mb-3">
        <p className="font-sans text-xs font-bold text-ink uppercase tracking-widest">{title}</p>
        <button
          onClick={onClose}
          aria-label="Close panel"
          title="Close"
          className="font-mono text-xs text-ink2 hover:text-ink leading-none px-1">✕</button>
      </div>
      {children}
    </div>
  );
}

function Radio({ options, value, onChange }) {
  return (
    <div className="space-y-1">
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`w-full text-left px-3 py-2 rounded-lg flex items-start gap-3 transition-colors ${
            value === o.key ? "bg-ink text-paper" : "hover:bg-paper2 text-ink2 hover:text-ink"
          }`}
        >
          <span className={`mt-0.5 w-3 h-3 rounded-full border flex-shrink-0 ${
            value === o.key ? "border-paper bg-paper" : "border-ink2/40"
          }`}/>
          <span className="font-mono text-xs leading-snug">
            <span className="font-semibold block">{o.label}</span>
            {o.desc && <span className={`text-[10px] ${value === o.key ? "text-paper/60" : "text-ink2/70"}`}>{o.desc}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function FilterBar({
  analysis, setAnalysis,
  selectedCohorts, setSelectedCohorts,
  threshold, setThreshold,
  view, setView,
  showAll, setShowAll,
  isMobile = false,
}) {
  const [open, setOpen] = useState(null); // 'analysis' | 'cohorts' | 'threshold' | 'view' | 'options'
  const barRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (barRef.current && !barRef.current.contains(e.target)) setOpen(null);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggle(panel) { setOpen(p => p === panel ? null : panel); }

  function toggleCohort(c) {
    setSelectedCohorts(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  }

  function applyPreset(cohorts) {
    setSelectedCohorts(cohorts);
  }

  const analysisLabel = ANALYSIS_OPTIONS.find(o => o.key === analysis)?.label ?? analysis;
  const thresholdLabel = THRESHOLDS.find(t => t.key === threshold)?.label ?? threshold;
  const viewObj = VIEWS.find(v => v.key === view);
  const cohortSummary = selectedCohorts.length === 1
    ? selectedCohorts[0]
    : selectedCohorts.length === 8
      ? "All cohorts"
      : `${selectedCohorts.length} cohorts`;

  const btnBase = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs transition-colors select-none cursor-pointer";
  const btnActive = "bg-ink text-paper border-ink";
  const btnInactive = "bg-paper2 text-ink2 border-rule/30 hover:border-ink/40 hover:text-ink";

  const ancestryColors = {
    caucasian:  "bg-blue-100 text-blue-800",
    east_asian: "bg-orange-100 text-orange-800",
    latin:      "bg-green-100 text-green-800",
    mixed:      "bg-purple-100 text-purple-800",
  };

  return (
    <div ref={barRef} className="mb-5">
      {/* Button row */}
      <div className="flex flex-wrap gap-2">
        <button className={`${btnBase} ${open === "analysis" ? btnActive : btnInactive}`} onClick={() => toggle("analysis")}>
          <span className="text-[10px] opacity-60">Analysis</span>
          <span className="font-semibold">{analysisLabel}</span>
          <span className="opacity-50 text-[10px]">▾</span>
        </button>

        <button className={`${btnBase} ${open === "cohorts" ? btnActive : btnInactive}`} onClick={() => toggle("cohorts")}>
          <span className="text-[10px] opacity-60">Cohorts</span>
          <span className="font-semibold">{cohortSummary}</span>
          {selectedCohorts.length > 1 && (
            <span className="bg-sig text-paper text-[9px] px-1.5 py-0.5 rounded-full font-bold">∩</span>
          )}
          <span className="opacity-50 text-[10px]">▾</span>
        </button>

        <button className={`${btnBase} ${open === "threshold" ? btnActive : btnInactive}`} onClick={() => toggle("threshold")}>
          <span className="text-[10px] opacity-60">Threshold</span>
          <span className="font-semibold">{thresholdLabel}</span>
          <span className="opacity-50 text-[10px]">▾</span>
        </button>

        {!isMobile && (
          <button className={`${btnBase} ${open === "view" ? btnActive : btnInactive}`} onClick={() => toggle("view")}>
            <span>{viewObj?.icon}</span>
            <span className="font-semibold">{viewObj?.label}</span>
            <span className="opacity-50 text-[10px]">▾</span>
          </button>
        )}

        {!isMobile && (
          <button className={`${btnBase} ${open === "options" ? btnActive : btnInactive}`} onClick={() => toggle("options")}>
            <span>⚙</span>
            <span className="font-semibold">Options</span>
            <span className="opacity-50 text-[10px]">▾</span>
          </button>
        )}

        {/* Quick badges — desktop only */}
        {!isMobile && selectedCohorts.length > 1 && (
          <div className="flex items-center gap-1 ml-1">
            {selectedCohorts.map(c => (
              <button
                key={c}
                onClick={() => toggleCohort(c)}
                className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-ink text-paper hover:bg-sig transition-colors"
                title={`Remove ${c}`}
              >
                {c} ✕
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dropdown panels */}
      {open === "analysis" && (
        <Panel title="Analysis Type" onClose={() => setOpen(null)}>
          <Radio options={ANALYSIS_OPTIONS} value={analysis} onChange={v => { setAnalysis(v); setOpen(null); }}/>
        </Panel>
      )}

      {open === "cohorts" && (
        <Panel title="Select Cohorts (multi-select for intersection)" onClose={() => setOpen(null)}>
          {/* Presets */}
          <p className="font-sans text-[10px] font-semibold text-ink2 uppercase tracking-wider mb-2">Quick presets</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.cohorts)}
                className={`font-mono text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  JSON.stringify([...p.cohorts].sort()) === JSON.stringify([...selectedCohorts].sort())
                    ? "bg-ink text-paper border-ink"
                    : "border-rule/30 text-ink2 hover:border-ink/40 hover:text-ink bg-paper2"
                }`}
              >
                {p.label}
                <span className="ml-1.5 text-[10px] opacity-60">{p.desc}</span>
              </button>
            ))}
          </div>

          {/* Individual checkboxes — desktop only */}
          {!isMobile && (
            <>
              <p className="font-sans text-[10px] font-semibold text-ink2 uppercase tracking-wider mb-2">Individual cohorts</p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(COHORT_INFO).map(([key, info]) => {
                  const checked = selectedCohorts.includes(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleCohort(key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-left ${
                        checked ? "bg-ink text-paper border-ink" : "border-rule/30 text-ink2 hover:border-ink/40 hover:text-ink bg-paper2"
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded flex-shrink-0 border flex items-center justify-center ${
                        checked ? "bg-paper border-paper" : "border-ink2/40"
                      }`}>
                        {checked && <span className="text-ink text-[8px] font-bold leading-none">✓</span>}
                      </span>
                      <span className="font-mono text-xs flex-1">
                        <span className="font-semibold block">{info.label}</span>
                        <span className={`text-[10px] px-1 py-0.5 rounded ${ancestryColors[info.ancestry]} ${checked ? "opacity-80" : ""}`}>
                          {info.region}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {selectedCohorts.length > 1 && (
            <p className="mt-3 font-mono text-[11px] text-sig font-semibold">
              ∩ Showing intersection of {selectedCohorts.length} cohorts
            </p>
          )}
        </Panel>
      )}

      {open === "threshold" && (
        <Panel title="Significance Threshold" onClose={() => setOpen(null)}>
          <Radio options={THRESHOLDS} value={threshold} onChange={v => { setThreshold(v); setOpen(null); }}/>
        </Panel>
      )}

      {open === "view" && (
        <Panel title="Visualisation Mode" onClose={() => setOpen(null)}>
          <Radio options={VIEWS} value={view} onChange={v => { setView(v); setOpen(null); }}/>
        </Panel>
      )}

      {open === "options" && (
        <Panel title="Options" onClose={() => setOpen(null)}>
          <label className="flex items-center gap-3 cursor-pointer py-2">
            <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="accent-sig w-4 h-4"/>
            <span className="font-mono text-xs text-ink">
              <span className="font-semibold block">Show all ROIs</span>
              <span className="text-ink2 text-[10px]">Include non-significant ROIs in the table</span>
            </span>
          </label>
          <p className="mt-2 font-mono text-[10px] text-ink2/60 border-t border-rule/20 pt-2">
            Strict / Loose intersection toggle is available in the panel header when multiple cohorts are selected.
          </p>
        </Panel>
      )}
    </div>
  );
}
