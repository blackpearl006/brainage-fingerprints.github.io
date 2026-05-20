import { useState, useEffect, useMemo, useCallback } from "react";
import Section from "../components/Section";
import { loadRegions, loadFingerprintAnalysis, byId } from "../lib/data";
import { networkColors } from "../lib/theme";
import { useIsMobile } from "../lib/useIsMobile";

// ── Constants ──────────────────────────────────────────────────────────────────

const ALL_COHORTS = ["ADNI","OASIS3","MAYO","CAMCAN","SALD","SRPBS","BrainLat","ABIL"];

const ANALYSES = ["main","longitudinal","female","male","left_hem","right_hem","caucasian"];

const ANALYSIS_LABELS = {
  main:         "Cross-sectional",
  longitudinal: "Longitudinal",
  female:       "Female",
  male:         "Male",
  left_hem:     "Left Hemi",
  right_hem:    "Right Hemi",
  caucasian:    "Caucasian",
};

const THRESHOLD_LABELS = {
  top_20_perc_rois: "Top 20%",
  top_15_perc_rois: "Top 15%",
  top_10_perc_rois: "Top 10%",
  top_5_perc_rois:  "Top 5%",
};

const COHORT_COLORS = {
  ADNI:     "#E05C5C",
  OASIS3:   "#E8A020",
  MAYO:     "#5CA8E0",
  CAMCAN:   "#5CBE6A",
  SALD:     "#9B6FD4",
  SRPBS:    "#E07840",
  BrainLat: "#4BBFB0",
  ABIL:     "#D4709A",
};

// ── Shared helpers ─────────────────────────────────────────────────────────────

function universalSig(analysisData, threshold) {
  const sig = Array(246).fill(1);
  for (const cohort of ALL_COHORTS) {
    const s = analysisData?.[cohort]?.[threshold]?.sig;
    if (!s) return Array(246).fill(0);
    for (let i = 0; i < 246; i++) if (s[i] !== 1) sig[i] = 0;
  }
  return sig;
}

function jaccardSim(a, b) {
  let inter = 0, union = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] || b[i]) union++;
    if (a[i] && b[i]) inter++;
  }
  return union === 0 ? 0 : inter / union;
}

function pearsonSim(a, b) {
  const n = a.length;
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  const ma = sa / n, mb = sb / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma, xb = b[i] - mb;
    num += xa * xb;
    da  += xa * xa;
    db  += xb * xb;
  }
  const denom = Math.sqrt(da * db);
  return denom === 0 ? 0 : num / denom;
}

function lerp(stops, u) {
  const s = Math.max(0, Math.min(1, u)) * (stops.length - 1);
  const i = Math.min(Math.floor(s), stops.length - 2);
  const f = s - i;
  const [r1,g1,b1] = stops[i], [r2,g2,b2] = stops[i+1];
  return `rgb(${Math.round(r1+(r2-r1)*f)},${Math.round(g1+(g2-g1)*f)},${Math.round(b1+(b2-b1)*f)})`;
}

const WARM_STOPS = [[240,237,229],[232,155,44],[200,49,43]];
const COOL_STOPS = [[240,237,229],[90,140,196],[40,80,150]];

function jaccardColor(t) {
  if (t === 1) return "#C8312B";
  return lerp(WARM_STOPS, t);
}

function corrColor(t) {
  if (t >= 0) return lerp(WARM_STOPS, t);
  return lerp(COOL_STOPS, -t);
}

function textColor(t, metric) {
  const mag = metric === "corr" ? Math.abs(t) : t;
  return mag > 0.45 ? "#FAF7F2" : "#1A2332";
}

const METRICS = {
  jaccard: {
    label: "Jaccard",
    badge: (v) => `Jaccard = ${v.toFixed(2)}`,
    cell:  (v) => `${(v * 100).toFixed(0)}%`,
    color: jaccardColor,
    compute: jaccardSim,
    gradient: "linear-gradient(to right, rgb(240,237,229), rgb(232,155,44), rgb(200,49,43))",
    axisLabels: ["0", "1"],
  },
  corr: {
    label: "Correlation (φ / r)",
    badge: (v) => `r = ${v.toFixed(2)}`,
    cell:  (v) => v.toFixed(2),
    color: corrColor,
    compute: pearsonSim,
    gradient: "linear-gradient(to right, rgb(40,80,150), rgb(90,140,196), rgb(240,237,229), rgb(232,155,44), rgb(200,49,43))",
    axisLabels: ["−1", "+1"],
  },
};

function effectiveNet(r) {
  return r.our_network7 === "nan"
    ? (r.our_network20 === "nan" ? null : r.our_network20)
    : r.our_network7;
}

// ── ROI chip ───────────────────────────────────────────────────────────────────

function RoiChip({ id, regions }) {
  const r = regions?.get(id);
  if (!r) return null;
  const net = effectiveNet(r);
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded text-white font-mono text-xs leading-tight whitespace-nowrap"
      style={{ background: networkColors[net] ?? "#9AAABB" }}
      title={net ?? ""}
    >
      {r.label}
    </span>
  );
}

// ── Threshold + loading bar (shared) ──────────────────────────────────────────

function Controls({ threshold, setThreshold, loaded, total, children }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <span className="font-mono text-xs text-ink2 uppercase tracking-wider">Threshold</span>
      <div className="flex rounded-lg overflow-hidden border border-rule/20">
        {Object.entries(THRESHOLD_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setThreshold(key)}
            className={`font-mono text-xs px-3 py-1.5 transition-colors ${
              threshold === key ? "bg-ink text-paper" : "text-ink2 hover:text-ink hover:bg-paper2"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {children}
      {loaded < total && (
        <span className="font-mono text-xs text-ink2 flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border-2 border-sig border-t-transparent animate-spin inline-block"/>
          Loading {loaded}/{total}…
        </span>
      )}
    </div>
  );
}

function MetricToggle({ metric, setMetric }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-ink2 uppercase tracking-wider">Metric</span>
      <div className="flex rounded-lg overflow-hidden border border-rule/20">
        {Object.entries(METRICS).map(([key, m]) => (
          <button
            key={key}
            onClick={() => setMetric(key)}
            className={`font-mono text-xs px-3 py-1.5 transition-colors ${
              metric === key ? "bg-ink text-paper" : "text-ink2 hover:text-ink hover:bg-paper2"
            }`}
          >
            {key === "jaccard" ? "Jaccard" : "Correlation"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── TAB 1: Cross-analysis heatmap ─────────────────────────────────────────────

function Heatmap({ matrix, sigCounts, selected, onSelect, loading, metric }) {
  const M = METRICS[metric];
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse">
        <thead>
          <tr>
            <th className="w-32"/>
            {ANALYSES.map(key => (
              <th key={key} className="w-[84px] pb-2">
                <div className="flex flex-col items-center gap-1">
                  <span
                    className="font-mono text-[0.65rem] text-ink2 uppercase tracking-wide leading-tight text-center"
                    style={{ writingMode:"vertical-rl", transform:"rotate(180deg)", height:80 }}
                  >
                    {ANALYSIS_LABELS[key]}
                  </span>
                  {sigCounts[key] != null && (
                    <span className="font-mono text-xs font-bold text-sig">{sigCounts[key]}</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ANALYSES.map((rowKey, ri) => (
            <tr key={rowKey}>
              <td className="pr-3 text-right">
                <p className="font-mono text-xs text-ink font-semibold whitespace-nowrap">{ANALYSIS_LABELS[rowKey]}</p>
                {sigCounts[rowKey] != null && (
                  <p className="font-mono text-xs text-sig font-bold">{sigCounts[rowKey]} ROIs</p>
                )}
              </td>
              {ANALYSES.map((colKey, ci) => {
                const isDiag = ri === ci;
                const val    = matrix[ri]?.[ci] ?? 0;
                const hi     = !isDiag && (selected[0]===rowKey&&selected[1]===colKey || selected[0]===colKey&&selected[1]===rowKey);
                return (
                  <td key={colKey} className="p-0.5">
                    <button
                      disabled={isDiag || loading}
                      onClick={() => !isDiag && onSelect([rowKey, colKey])}
                      className={`w-[80px] h-[50px] rounded transition-all flex flex-col items-center justify-center ${
                        isDiag ? "cursor-default" : "cursor-pointer hover:ring-2 hover:ring-ink/30"
                      } ${hi ? "ring-2 ring-ink" : ""}`}
                      style={{
                        background: isDiag ? "#1A2332" : loading ? "#E8E5DE" : M.color(val),
                        color:      isDiag ? "#5A6478" : loading ? "#9AAABB" : textColor(val, metric),
                      }}
                    >
                      {isDiag ? <span className="font-mono text-xs">—</span>
                      : loading ? <span className="font-mono text-xs">…</span>
                      : <>
                          <span className="font-mono text-sm font-bold leading-none">{M.cell(val)}</span>
                          <span className="font-mono text-[0.6rem] opacity-70 leading-none mt-0.5">{metric === "jaccard" ? "Jaccard" : "r"}</span>
                        </>}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComparePanel({ keyA, keyB, sigA, sigB, regions, metric }) {
  if (!sigA || !sigB) return null;
  const onlyA = [], shared = [], onlyB = [];
  for (let i = 0; i < 246; i++) {
    if (sigA[i] && sigB[i]) shared.push(i+1);
    else if (sigA[i])        onlyA.push(i+1);
    else if (sigB[i])        onlyB.push(i+1);
  }
  const M = METRICS[metric];
  const value = M.compute(sigA, sigB);
  const col = (label, ids, bg) => (
    <div className="flex-1 min-w-0">
      <div className="rounded-t-lg px-3 py-2 flex items-center justify-between" style={{ background: bg }}>
        <span className="font-mono text-xs font-bold text-white truncate">{label}</span>
        <span className="font-mono text-sm font-bold text-white/90 ml-2 shrink-0">{ids.length}</span>
      </div>
      <div className="rounded-b-lg border border-t-0 border-rule/20 p-3 bg-paper2 min-h-[72px]">
        {ids.length === 0
          ? <p className="font-mono text-xs text-ink2 italic">None</p>
          : <div className="flex flex-wrap gap-1.5">{ids.map(id => <RoiChip key={id} id={id} regions={regions}/>)}</div>
        }
      </div>
    </div>
  );
  return (
    <div className="mt-4 rounded-xl border border-rule/20 overflow-hidden">
      <div className="px-5 py-3 bg-paper border-b border-rule/20 grid grid-cols-3 items-center gap-2">
        <div className="flex items-center gap-2 justify-self-start min-w-0">
          <span className="font-sans text-base font-semibold text-ink truncate">{ANALYSIS_LABELS[keyA]}</span>
          <span className="font-mono text-xs text-ink2">vs.</span>
          <span className="font-sans text-base font-semibold text-ink truncate">{ANALYSIS_LABELS[keyB]}</span>
        </div>
        <span className="font-mono text-sm font-semibold text-ink justify-self-center px-3 py-1 rounded-full bg-paper2 border border-rule/20">
          {M.badge(value)}
        </span>
        <span className="justify-self-end"/>
      </div>
      <div className="p-4 flex flex-col sm:flex-row gap-3">
        {col(`Only in ${ANALYSIS_LABELS[keyA]}`, onlyA, "#3A7EC6")}
        {col("Shared by both",                  shared, "#2A9E8F")}
        {col(`Only in ${ANALYSIS_LABELS[keyB]}`, onlyB, "#9B59B6")}
      </div>
    </div>
  );
}

// ── TAB 2: Dataset-specific ROIs ──────────────────────────────────────────────

function DatasetSpecificView({ allData, threshold, regions, isMobile }) {
  const [analysis, setAnalysis] = useState("main");
  const [showCards, setShowCards] = useState(!isMobile);

  const { univSig, cohortSpecific } = useMemo(() => {
    const data = allData[analysis];
    if (!data) return { univSig: null, cohortSpecific: {} };
    const univ = universalSig(data, threshold);
    const specific = {};
    for (const cohort of ALL_COHORTS) {
      const s = data[cohort]?.[threshold]?.sig;
      if (!s) { specific[cohort] = []; continue; }
      specific[cohort] = [];
      for (let i = 0; i < 246; i++) {
        if (s[i] === 1 && univ[i] === 0) specific[cohort].push(i + 1);
      }
    }
    return { univSig: univ, cohortSpecific: specific };
  }, [allData, analysis, threshold]);

  const univIds = univSig ? univSig.map((v,i) => v ? i+1 : null).filter(Boolean) : [];

  return (
    <div>
      {/* Analysis selector */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="font-mono text-xs text-ink2 uppercase tracking-wider">Analysis</span>
        <div className="flex flex-wrap gap-1">
          {ANALYSES.map(key => (
            <button
              key={key}
              onClick={() => setAnalysis(key)}
              className={`font-mono text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                analysis === key
                  ? "bg-ink text-paper border-ink"
                  : "border-rule/30 text-ink2 hover:border-ink/40 hover:text-ink"
              }`}
            >
              {ANALYSIS_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {!univSig ? (
        <div className="flex items-center gap-2 py-8 text-ink2 font-mono text-sm">
          <span className="w-4 h-4 rounded-full border-2 border-sig border-t-transparent animate-spin"/>
          Loading…
        </div>
      ) : (
        <>
          {/* Per-cohort dataset-specific ROIs */}
          <button
            onClick={() => setShowCards(s => !s)}
            className="w-full flex items-center justify-between mb-3 group"
          >
            <p className="font-mono text-xs text-ink2 uppercase tracking-wider">
              Dataset-specific — significant in this cohort but not in all 8 cohorts
            </p>
            <span className="font-mono text-xs text-ink2 group-hover:text-ink ml-2 shrink-0">
              {showCards ? "▲ Hide" : "▼ Show"}
            </span>
          </button>
          {showCards && <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ALL_COHORTS.map(cohort => {
              const ids = cohortSpecific[cohort] ?? [];
              const color = COHORT_COLORS[cohort];
              return (
                <div key={cohort} className="rounded-xl border border-rule/20 overflow-hidden">
                  <div
                    className="px-3 py-2 flex items-center justify-between"
                    style={{ background: color + "22", borderBottom: `2px solid ${color}` }}
                  >
                    <span className="font-mono text-sm font-bold text-ink">{cohort}</span>
                    <span
                      className="font-mono text-xs font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: color }}
                    >
                      {ids.length}
                    </span>
                  </div>
                  <div className="p-3 bg-paper2 min-h-[64px]">
                    {ids.length === 0
                      ? <p className="font-mono text-xs text-ink2 italic">No unique ROIs</p>
                      : <div className="flex flex-wrap gap-1.5">{ids.map(id => <RoiChip key={id} id={id} regions={regions}/>)}</div>
                    }
                  </div>
                </div>
              );
            })}
          </div>}
        </>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Comparisons() {
  const isMobile = useIsMobile();
  const [tab,       setTab]       = useState("cross");
  const [threshold, setThreshold] = useState("top_20_perc_rois");
  const [metric,    setMetric]    = useState("jaccard");
  const [allData,   setAllData]   = useState({});
  const [regions,   setRegions]   = useState(null);
  const [selected,  setSelected]  = useState(["main", "longitudinal"]);

  useEffect(() => {
    loadRegions().then(r => setRegions(byId(r)));
    ANALYSES.forEach(key =>
      loadFingerprintAnalysis(key).then(data =>
        setAllData(prev => ({ ...prev, [key]: data }))
      )
    );
  }, []);

  const loaded      = ANALYSES.filter(k => allData[k]).length;
  const fullyLoaded = loaded === ANALYSES.length;

  const universalSigs = useMemo(() => {
    const result = {};
    for (const key of ANALYSES) {
      if (allData[key]) result[key] = universalSig(allData[key], threshold);
    }
    return result;
  }, [allData, threshold]);

  const sigCounts = useMemo(() => {
    const out = {};
    for (const key of ANALYSES) {
      if (universalSigs[key]) out[key] = universalSigs[key].filter(v => v === 1).length;
    }
    return out;
  }, [universalSigs]);

  const matrix = useMemo(() => {
    const fn = METRICS[metric].compute;
    return ANALYSES.map(a =>
      ANALYSES.map(b => {
        const sa = universalSigs[a], sb = universalSigs[b];
        return sa && sb ? fn(sa, sb) : null;
      })
    );
  }, [universalSigs, metric]);

  const [selA, selB] = selected;

  return (
    <Section
      id="comparisons"
      eyebrow="Compare"
      title="Cross-Analysis Comparisons"
      lede="How similar are universal brain-age fingerprints across study configurations, and which ROIs are specific to each dataset within a configuration?"
    >
      {/* Tab switcher — desktop only */}
      {!isMobile && (
        <div className="flex gap-1 mb-6 border-b border-rule/20">
          {[
            { key: "cross",   label: "Cross-Analysis Similarity" },
            { key: "dataset", label: "Dataset-Specific ROIs"     },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`font-mono text-xs px-4 py-2.5 border-b-2 -mb-px transition-colors ${
                tab === key
                  ? "border-sig text-ink font-semibold"
                  : "border-transparent text-ink2 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Shared threshold + loading (metric toggle only relevant on cross-similarity tab) */}
      <Controls threshold={threshold} setThreshold={setThreshold} loaded={loaded} total={ANALYSES.length}>
        {!isMobile && tab === "cross" && (
          <MetricToggle metric={metric} setMetric={setMetric}/>
        )}
      </Controls>

      {/* Tab content */}
      {!isMobile && tab === "cross" ? (
        <>
          <div className="rounded-xl border border-rule/20 p-5 bg-paper overflow-x-auto">
            <Heatmap
              matrix={matrix}
              sigCounts={sigCounts}
              selected={selected}
              onSelect={setSelected}
              loading={!fullyLoaded}
              metric={metric}
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs text-ink2">{METRICS[metric].label}</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-xs text-ink2">{METRICS[metric].axisLabels[0]}</span>
                <div className="w-40 h-3 rounded" style={{ background: METRICS[metric].gradient }}/>
                <span className="font-mono text-xs text-ink2">{METRICS[metric].axisLabels[1]}</span>
              </div>
              <span className="font-mono text-xs text-ink2 ml-2">
                Header numbers = # universal ROIs
              </span>
            </div>
          </div>
          {fullyLoaded && (
            <ComparePanel
              keyA={selA} keyB={selB}
              sigA={universalSigs[selA]} sigB={universalSigs[selB]}
              regions={regions}
              metric={metric}
            />
          )}
        </>
      ) : (
        <DatasetSpecificView allData={allData} threshold={threshold} regions={regions} isMobile={isMobile}/>
      )}
    </Section>
  );
}
