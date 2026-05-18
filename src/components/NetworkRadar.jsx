import { useState, useMemo } from "react";

// Cohort colours — tuned for visibility on the light paper background
const COHORT_COLORS = {
  ADNI:     "#C8312B",   // sig red
  OASIS3:   "#E89B2C",   // accent amber
  MAYO:     "#3A7EC6",   // steel blue
  CAMCAN:   "#5DAD43",   // green
  SALD:     "#7C3AED",   // violet
  SRPBS:    "#D4670F",   // burnt orange
  BrainLat: "#2A9E8F",   // teal
  ABIL:     "#B8377A",   // magenta
};

function effectiveNet(r, mode) {
  if (mode === "7") {
    return r.our_network7 === "nan"
      ? (r.our_network20 === "nan" ? null : r.our_network20)
      : r.our_network7;
  }
  return r.our_network20 === "nan" ? null : r.our_network20;
}

const NET7_ORDER = [
  "Default", "Dorsal Attention", "Frontoparietal", "Limbic",
  "Somatomotor", "Ventral Attention", "Visual",
  "AmyHip", "Striatum", "Thalamus",
];

function buildGroups(regions, mode) {
  const groups = {};
  for (const r of regions.values()) {
    const net = effectiveNet(r, mode);
    if (!net) continue;
    if (!groups[net]) groups[net] = [];
    groups[net].push(r.id);
  }
  if (mode === "7") {
    return NET7_ORDER.filter(n => groups[n]).map(n => [n, groups[n]]);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

function radarPoints(values, cx, cy, r, scale) {
  const n = values.length;
  return values.map((v, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const rv = r * (v / scale);
    return [cx + rv * Math.cos(angle), cy + rv * Math.sin(angle)];
  });
}

function pointsStr(pts) {
  return pts.map(([x, y]) => `${x},${y}`).join(" ");
}

// Pick a "nice" maximum value to round up the axis to
function niceCeil(v) {
  if (v <= 0.05) return 0.05;
  if (v <= 0.10) return 0.10;
  if (v <= 0.15) return 0.15;
  if (v <= 0.20) return 0.20;
  if (v <= 0.30) return 0.30;
  if (v <= 0.40) return 0.40;
  if (v <= 0.50) return 0.50;
  if (v <= 0.75) return 0.75;
  return 1.0;
}

// Slightly smaller chart, with more room for the long Network-20 labels.
// The viewBox is wider than tall — radar is symmetric so we crop vertical empty space.
const SIZE_W     = 460;
const SIZE_H     = 360;
const CX         = SIZE_W / 2;
const CY         = SIZE_H / 2;
const R          = 140;
const LABEL_PAD  = 18;
const RING_STEPS = 4;

export default function NetworkRadar({ analysisData, selectedCohorts, threshold, regions }) {
  const [mode, setMode]           = useState("7");
  const [legendOpen, setLegendOpen] = useState(false);

  const { spokes, cohortValues, niceMax } = useMemo(() => {
    if (!regions || !analysisData) return { spokes: [], cohortValues: {}, niceMax: 1 };
    const groups = buildGroups(regions, mode);
    const spokesNames = groups.map(([name]) => name);

    const cv = {};
    let observedMax = 0;
    for (const cohort of selectedCohorts) {
      const sigArr = analysisData[cohort]?.[threshold]?.sig;
      if (!sigArr) continue;
      cv[cohort] = groups.map(([, ids]) => {
        const sig = ids.filter(id => sigArr[id - 1] === 1).length;
        const v = sig / ids.length;
        if (v > observedMax) observedMax = v;
        return v;
      });
    }
    return { spokes: spokesNames, cohortValues: cv, niceMax: niceCeil(Math.max(observedMax, 0.05)) };
  }, [regions, analysisData, selectedCohorts, threshold, mode]);

  if (!spokes.length) return null;

  const n      = spokes.length;
  const angles = spokes.map((_, i) => (i / n) * 2 * Math.PI - Math.PI / 2);
  const rings  = Array.from({ length: RING_STEPS }, (_, i) => ((i + 1) / RING_STEPS) * niceMax);

  // Format ring label depending on magnitude
  const fmtRing = (v) => {
    if (niceMax <= 0.10) return v.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
    if (niceMax <= 0.50) return v.toFixed(2);
    return v.toFixed(2);
  };

  const cohortsWithData = selectedCohorts.filter(c => cohortValues[c]);

  return (
    <div className="mt-3 rounded-xl border border-rule/20 bg-paper2 p-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
        <div className="flex items-center gap-2">
          <p className="font-mono text-[10px] text-ink2 uppercase tracking-wider">Network Radar</p>
          <span className="font-mono text-[9.5px] text-ink2/70">axis 0 – {fmtRing(niceMax)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-md overflow-hidden border border-rule/30">
            {["7", "20"].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`font-mono text-[10px] px-2.5 py-1 transition-colors ${
                  mode === m ? "bg-ink text-paper" : "text-ink2 hover:text-ink hover:bg-paper"
                }`}
              >
                N{m}
              </button>
            ))}
          </div>
          <button
            onClick={() => setLegendOpen(o => !o)}
            className="font-mono text-[10px] px-2.5 py-1 rounded-md border border-rule/30 text-ink2 hover:text-ink hover:bg-paper transition-colors flex items-center gap-1"
            title="Toggle cohort legend"
          >
            <span>{cohortsWithData.length} cohort{cohortsWithData.length === 1 ? "" : "s"}</span>
            <span className="text-[9px] opacity-60">{legendOpen ? "▴" : "▾"}</span>
          </button>
        </div>
      </div>

      {/* SVG — fills the panel width */}
      <svg viewBox={`0 0 ${SIZE_W} ${SIZE_H}`} className="w-full block"
           style={{ maxHeight: "100%" }}>
        {/* Concentric rings */}
        {rings.map((v, i) => (
          <polygon
            key={v}
            points={pointsStr(radarPoints(Array(n).fill(v), CX, CY, R, niceMax))}
            fill={i === rings.length - 1 ? "rgba(26,35,50,0.025)" : "none"}
            stroke={i === rings.length - 1 ? "rgba(26,35,50,0.35)" : "rgba(26,35,50,0.13)"}
            strokeWidth={i === rings.length - 1 ? 1.1 : 0.7}
            strokeDasharray={i === rings.length - 1 ? "" : "2 3"}
          />
        ))}

        {/* Spoke lines */}
        {angles.map((angle, i) => (
          <line
            key={i}
            x1={CX} y1={CY}
            x2={CX + R * Math.cos(angle)}
            y2={CY + R * Math.sin(angle)}
            stroke="rgba(26,35,50,0.10)"
            strokeWidth={0.75}
          />
        ))}

        {/* Ring labels (axis ticks along the top spoke) */}
        {rings.map(v => {
          const x = CX + R * (v / niceMax) * Math.cos(angles[0]) + 4;
          const y = CY + R * (v / niceMax) * Math.sin(angles[0]) - 2;
          return (
            <text
              key={v}
              x={x} y={y}
              fontSize={8.5}
              fill="#5A6478"
              fontFamily="JetBrains Mono, monospace"
            >
              {fmtRing(v)}
            </text>
          );
        })}

        {/* Cohort polygons — sorted so smaller areas render on top */}
        {Object.entries(cohortValues)
          .sort(([, a], [, b]) => b.reduce((s, v) => s + v, 0) - a.reduce((s, v) => s + v, 0))
          .map(([cohort, vals]) => {
            const pts = radarPoints(vals, CX, CY, R, niceMax);
            const col = COHORT_COLORS[cohort] ?? "#1A2332";
            return (
              <g key={cohort}>
                <polygon
                  points={pointsStr(pts)}
                  fill={col}
                  fillOpacity={0.10}
                  stroke={col}
                  strokeWidth={1.8}
                  strokeOpacity={0.95}
                  strokeLinejoin="round"
                />
                {pts.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r={2.4} fill={col}/>
                ))}
              </g>
            );
          })}

        {/* Spoke labels (wrap hyphenated Network-20 labels onto two lines) */}
        {spokes.map((name, i) => {
          const angle  = angles[i];
          const lx     = CX + (R + LABEL_PAD) * Math.cos(angle);
          const ly     = CY + (R + LABEL_PAD) * Math.sin(angle);
          const anchor = Math.abs(Math.cos(angle)) < 0.1 ? "middle"
                       : Math.cos(angle) > 0 ? "start" : "end";
          const fontSize = mode === "20" ? 9 : 11;

          const wrap = mode === "20" && name.includes("-");
          const parts = wrap ? name.split("-") : null;
          const head  = wrap ? parts.slice(0, -1).join("-") : null;
          const tail  = wrap ? "-" + parts[parts.length - 1] : null;

          return (
            <text
              key={i}
              x={lx} y={ly}
              fontSize={fontSize}
              fill="#1A2332"
              fontWeight="500"
              textAnchor={anchor}
              dominantBaseline="middle"
              fontFamily="Sora, sans-serif"
            >
              {wrap ? (
                <>
                  <tspan x={lx} dy="-0.4em">{head}</tspan>
                  <tspan x={lx} dy="1.05em">{tail}</tspan>
                </>
              ) : name}
            </text>
          );
        })}
      </svg>

      {/* Collapsible cohort legend */}
      {legendOpen && (
        <div className="mt-2 pt-2 border-t border-rule/15 flex flex-wrap gap-x-3 gap-y-1.5 animate-fade-in">
          {cohortsWithData.map(cohort => {
            const total = cohortValues[cohort].reduce((s, v) => s + v, 0).toFixed(1);
            return (
              <span key={cohort} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ background: COHORT_COLORS[cohort] ?? "#1A2332" }}
                />
                <span className="font-mono text-[10px] text-ink">{cohort}</span>
                <span className="font-mono text-[9px] text-ink2/70">Σ {total}</span>
              </span>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .animate-fade-in { animation: fadeIn 0.25s ease-out; }
      `}</style>
    </div>
  );
}
