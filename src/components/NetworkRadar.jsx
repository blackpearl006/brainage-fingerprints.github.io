import { useState, useMemo } from "react";
import { networkColors } from "../lib/theme";

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

function effectiveNet(r, mode) {
  if (mode === "7") {
    return r.our_network7 === "nan" ? (r.our_network20 === "nan" ? null : r.our_network20) : r.our_network7;
  }
  return r.our_network20 === "nan" ? null : r.our_network20;
}

// Build spoke order: network7 mode uses networkColors key order for consistency
const NET7_ORDER = ["Default","Dorsal Attention","Frontoparietal","Limbic","Somatomotor","Ventral Attention","Visual","AmyHip","Striatum","Thalamus"];

function buildGroups(regions, mode) {
  const groups = {};
  for (const r of regions.values()) {
    const net = effectiveNet(r, mode);
    if (!net) continue;
    if (!groups[net]) groups[net] = [];
    groups[net].push(r.id);
  }
  if (mode === "7") {
    // Return in fixed order
    return NET7_ORDER.filter(n => groups[n]).map(n => [n, groups[n]]);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

function radarPoints(values, cx, cy, r) {
  const n = values.length;
  return values.map((v, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return [cx + r * v * Math.cos(angle), cy + r * v * Math.sin(angle)];
  });
}

function pointsStr(pts) {
  return pts.map(([x, y]) => `${x},${y}`).join(" ");
}

const SIZE   = 260;
const CX     = SIZE / 2;
const CY     = SIZE / 2;
const R      = 96;
const RINGS  = [0.25, 0.5, 0.75, 1.0];
const LABEL_PAD = 14;

export default function NetworkRadar({ analysisData, selectedCohorts, threshold, regions }) {
  const [mode, setMode] = useState("7");

  const { spokes, cohortValues } = useMemo(() => {
    if (!regions || !analysisData) return { spokes: [], cohortValues: {} };
    const groups = buildGroups(regions, mode);
    const spokes = groups.map(([name]) => name);

    const cohortValues = {};
    for (const cohort of selectedCohorts) {
      const sigArr = analysisData[cohort]?.[threshold]?.sig;
      if (!sigArr) continue;
      cohortValues[cohort] = groups.map(([, ids]) => {
        const sig = ids.filter(id => sigArr[id - 1] === 1).length;
        return sig / ids.length;
      });
    }
    return { spokes, cohortValues };
  }, [regions, analysisData, selectedCohorts, threshold, mode]);

  if (!spokes.length) return null;

  const n = spokes.length;
  const angles = spokes.map((_, i) => (i / n) * 2 * Math.PI - Math.PI / 2);

  return (
    <div className="mt-3 rounded-xl border border-rule/20 bg-[#141E2D] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Network Radar</p>
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          {["7", "20"].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`font-mono text-[10px] px-3 py-1 transition-colors ${
                mode === m ? "bg-white/15 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Network {m}
            </button>
          ))}
        </div>
      </div>

      {/* SVG + Legend row */}
      <div className="flex flex-col items-center gap-3">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[280px]">
          {/* Concentric rings */}
          {RINGS.map(v => (
            <polygon
              key={v}
              points={pointsStr(radarPoints(Array(n).fill(v), CX, CY, R))}
              fill="none"
              stroke={v === 1 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}
              strokeWidth={v === 1 ? 1 : 0.75}
            />
          ))}

          {/* Spoke lines */}
          {angles.map((angle, i) => (
            <line
              key={i}
              x1={CX} y1={CY}
              x2={CX + R * Math.cos(angle)}
              y2={CY + R * Math.sin(angle)}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={0.75}
            />
          ))}

          {/* Ring labels (0.25, 0.5, 0.75, 1) along first spoke */}
          {RINGS.map(v => {
            const x = CX + R * v * Math.cos(angles[0]) + 3;
            const y = CY + R * v * Math.sin(angles[0]) - 2;
            return (
              <text key={v} x={x} y={y} fontSize={6} fill="rgba(255,255,255,0.25)" fontFamily="monospace">
                {v}
              </text>
            );
          })}

          {/* Cohort polygons — sorted so smaller areas render on top */}
          {Object.entries(cohortValues)
            .sort(([, a], [, b]) => b.reduce((s, v) => s + v, 0) - a.reduce((s, v) => s + v, 0))
            .map(([cohort, vals]) => {
              const pts = radarPoints(vals, CX, CY, R);
              const col = COHORT_COLORS[cohort] ?? "#aaa";
              return (
                <g key={cohort}>
                  <polygon
                    points={pointsStr(pts)}
                    fill={col}
                    fillOpacity={0.12}
                    stroke={col}
                    strokeWidth={1.5}
                    strokeOpacity={0.85}
                  />
                  {pts.map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r={2} fill={col} fillOpacity={0.9}/>
                  ))}
                </g>
              );
            })}

          {/* Spoke labels */}
          {spokes.map((name, i) => {
            const angle  = angles[i];
            const lx     = CX + (R + LABEL_PAD) * Math.cos(angle);
            const ly     = CY + (R + LABEL_PAD) * Math.sin(angle);
            const anchor = Math.abs(Math.cos(angle)) < 0.1 ? "middle"
                         : Math.cos(angle) > 0 ? "start" : "end";
            // Short label for network20 (strip trailing -1/-2 only if net7 mode)
            const label = name;
            return (
              <text
                key={i}
                x={lx} y={ly}
                fontSize={mode === "20" ? 5.5 : 7}
                fill="rgba(255,255,255,0.65)"
                textAnchor={anchor}
                dominantBaseline="middle"
                fontFamily="monospace"
              >
                {label}
              </text>
            );
          })}
        </svg>

        {/* Cohort legend */}
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          {selectedCohorts.filter(c => cohortValues[c]).map(cohort => (
            <span key={cohort} className="flex items-center gap-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ background: COHORT_COLORS[cohort] ?? "#aaa" }}
              />
              <span className="font-mono text-[10px] text-slate-400">{cohort}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
