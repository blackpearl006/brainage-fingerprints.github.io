import { useState, useEffect, useMemo } from "react";
import Section from "../components/Section";
import { loadRegions, loadFingerprintAnalysis, byId } from "../lib/data";
import { networkColors } from "../lib/theme";

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

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// Map Jaccard 0→1 to a colour from paper to accent amber to sig red
function simColor(t) {
  if (t === 1) return "#C8312B";
  // low: slightly tinted, mid: amber, high: red
  const stops = [
    [240, 237, 229],   // paper2 (0)
    [232, 155,  44],   // accent amber (0.55)
    [200,  49,  43],   // sig red (1)
  ];
  const s = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(Math.floor(s), stops.length - 2);
  const f = s - i;
  const [r1,g1,b1] = stops[i], [r2,g2,b2] = stops[i+1];
  const r = Math.round(r1 + (r2-r1)*f);
  const g = Math.round(g1 + (g2-g1)*f);
  const b = Math.round(b1 + (b2-b1)*f);
  return `rgb(${r},${g},${b})`;
}

function textColor(t) {
  return t > 0.45 ? "#FAF7F2" : "#1A2332";
}

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
  const bg  = networkColors[net] ?? "#9AAABB";
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-white font-mono text-[10px] leading-tight whitespace-nowrap"
      style={{ background: bg }}
      title={net ?? ""}
    >
      {r.label}
    </span>
  );
}

// ── Comparison detail panel ────────────────────────────────────────────────────

function ComparePanel({ keyA, keyB, sigA, sigB, regions }) {
  if (!sigA || !sigB) return null;

  const onlyA = [], shared = [], onlyB = [];
  for (let i = 0; i < 246; i++) {
    if (sigA[i] && sigB[i]) shared.push(i + 1);
    else if (sigA[i])        onlyA.push(i + 1);
    else if (sigB[i])        onlyB.push(i + 1);
  }

  const col = (label, ids, accent) => (
    <div className="flex-1 min-w-0">
      <div
        className="rounded-t-lg px-3 py-2 flex items-center justify-between"
        style={{ background: accent }}
      >
        <span className="font-mono text-[11px] font-bold text-white">{label}</span>
        <span className="font-mono text-xs font-bold text-white/80">{ids.length} ROIs</span>
      </div>
      <div className="rounded-b-lg border border-t-0 border-rule/20 p-3 bg-paper2 min-h-[80px]">
        {ids.length === 0 ? (
          <p className="font-mono text-[10px] text-ink2 italic">None</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {ids.map(id => <RoiChip key={id} id={id} regions={regions}/>)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="mt-4 rounded-xl border border-rule/20 overflow-hidden">
      <div className="px-5 py-3 bg-paper border-b border-rule/20 flex items-center gap-3">
        <span className="font-sans text-sm font-semibold text-ink">
          {ANALYSIS_LABELS[keyA]}
        </span>
        <span className="font-mono text-[10px] text-ink2">vs.</span>
        <span className="font-sans text-sm font-semibold text-ink">
          {ANALYSIS_LABELS[keyB]}
        </span>
        <span className="ml-auto font-mono text-[10px] text-ink2">
          Jaccard = {jaccardSim(sigA, sigB).toFixed(2)}
        </span>
      </div>
      <div className="p-4 flex flex-col sm:flex-row gap-3">
        {col(`Only in ${ANALYSIS_LABELS[keyA]}`, onlyA,  "#3A7EC6")}
        {col("Shared by both",                  shared,  "#2A9E8F")}
        {col(`Only in ${ANALYSIS_LABELS[keyB]}`, onlyB,  "#9B59B6")}
      </div>
    </div>
  );
}

// ── Heatmap ────────────────────────────────────────────────────────────────────

function Heatmap({ matrix, sigCounts, selected, onSelect, loading }) {
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse">
        <thead>
          <tr>
            <th className="w-24"/>
            {ANALYSES.map(key => (
              <th key={key} className="w-[78px] pb-2">
                <div className="flex flex-col items-center gap-1">
                  <span className="font-mono text-[9px] text-ink2 uppercase tracking-wide leading-tight text-center" style={{writingMode:"vertical-rl", transform:"rotate(180deg)", height:72}}>
                    {ANALYSIS_LABELS[key]}
                  </span>
                  {sigCounts[key] != null && (
                    <span className="font-mono text-[10px] font-bold text-sig">{sigCounts[key]}</span>
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
                <div>
                  <p className="font-mono text-[10px] text-ink font-semibold whitespace-nowrap">{ANALYSIS_LABELS[rowKey]}</p>
                  {sigCounts[rowKey] != null && (
                    <p className="font-mono text-[10px] text-sig font-bold">{sigCounts[rowKey]} ROIs</p>
                  )}
                </div>
              </td>
              {ANALYSES.map((colKey, ci) => {
                const isDiag = ri === ci;
                const val    = matrix[ri]?.[ci] ?? 0;
                const isSelected = !isDiag && selected[0] === rowKey && selected[1] === colKey;
                const isSelectedAlt = !isDiag && selected[0] === colKey && selected[1] === rowKey;
                const highlight = isSelected || isSelectedAlt;

                return (
                  <td key={colKey} className="p-0.5">
                    <button
                      disabled={isDiag || loading}
                      onClick={() => !isDiag && onSelect([rowKey, colKey])}
                      className={`w-[74px] h-[46px] rounded transition-all text-center flex flex-col items-center justify-center ${
                        isDiag ? "cursor-default" : "cursor-pointer hover:ring-2 hover:ring-ink/30"
                      } ${highlight ? "ring-2 ring-ink" : ""}`}
                      style={{
                        background: isDiag ? "#1A2332" : (loading ? "#E8E5DE" : simColor(val)),
                        color: isDiag ? "#5A6478" : (loading ? "#9AAABB" : textColor(val)),
                      }}
                    >
                      {isDiag ? (
                        <span className="font-mono text-[10px]">—</span>
                      ) : loading ? (
                        <span className="font-mono text-[9px]">…</span>
                      ) : (
                        <>
                          <span className="font-mono text-[13px] font-bold leading-none">{(val * 100).toFixed(0)}%</span>
                          <span className="font-mono text-[8px] opacity-70 leading-none mt-0.5">Jaccard</span>
                        </>
                      )}
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

// ── Main component ─────────────────────────────────────────────────────────────

export default function Comparisons() {
  const [threshold,       setThreshold]       = useState("top_20_perc_rois");
  const [allData,         setAllData]         = useState({});
  const [regions,         setRegions]         = useState(null);
  const [selected,        setSelected]        = useState(["main", "longitudinal"]);

  useEffect(() => {
    loadRegions().then(r => setRegions(byId(r)));
    ANALYSES.forEach(key =>
      loadFingerprintAnalysis(key).then(data =>
        setAllData(prev => ({ ...prev, [key]: data }))
      )
    );
  }, []);

  const loaded = ANALYSES.filter(k => allData[k]).length;
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
    return ANALYSES.map(a =>
      ANALYSES.map(b => {
        const sa = universalSigs[a], sb = universalSigs[b];
        if (!sa || !sb) return null;
        return jaccardSim(sa, sb);
      })
    );
  }, [universalSigs]);

  const [selA, selB] = selected;

  return (
    <Section
      id="comparisons"
      eyebrow="Compare"
      title="Cross-Analysis Comparisons"
      lede="How similar are the universal brain-age fingerprints across analysis configurations? Each cell shows the Jaccard similarity between the all-cohort intersections of two analyses. Click any cell to see exactly which ROIs are shared and which are unique."
    >
      {/* Threshold selector */}
      <div className="flex items-center gap-3 mb-6">
        <span className="font-mono text-[11px] text-ink2 uppercase tracking-wider">Threshold</span>
        <div className="flex rounded-lg overflow-hidden border border-rule/20">
          {Object.entries(THRESHOLD_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setThreshold(key)}
              className={`font-mono text-[11px] px-3 py-1.5 transition-colors ${
                threshold === key
                  ? "bg-ink text-paper"
                  : "text-ink2 hover:text-ink hover:bg-paper2"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {!fullyLoaded && (
          <span className="font-mono text-[11px] text-ink2 flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-sig border-t-transparent animate-spin inline-block"/>
            Loading {loaded}/7…
          </span>
        )}
      </div>

      {/* Heatmap + legend */}
      <div className="rounded-xl border border-rule/20 p-5 bg-paper overflow-x-auto">
        <Heatmap
          matrix={matrix}
          sigCounts={sigCounts}
          selected={selected}
          onSelect={setSelected}
          loading={!fullyLoaded}
        />

        {/* Colour scale legend */}
        <div className="mt-4 flex items-center gap-3">
          <span className="font-mono text-[10px] text-ink2">Jaccard similarity</span>
          <div className="flex items-center gap-1">
            <span className="font-mono text-[9px] text-ink2">0%</span>
            <div
              className="w-32 h-3 rounded"
              style={{ background: "linear-gradient(to right, rgb(240,237,229), rgb(232,155,44), rgb(200,49,43))" }}
            />
            <span className="font-mono text-[9px] text-ink2">100%</span>
          </div>
          <span className="font-mono text-[10px] text-ink2 ml-4">
            Column/row header = # universal ROIs at selected threshold
          </span>
        </div>
      </div>

      {/* Pair detail */}
      {fullyLoaded && (
        <ComparePanel
          keyA={selA}
          keyB={selB}
          sigA={universalSigs[selA]}
          sigB={universalSigs[selB]}
          regions={regions}
        />
      )}
    </Section>
  );
}
