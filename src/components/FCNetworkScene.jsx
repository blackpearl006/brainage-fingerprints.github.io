import { useState, useEffect, useRef, useMemo } from "react";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeActivations(seed = 1) {
  const acts = new Array(64);
  for (let i = 0; i < 64; i++) {
    const v = (Math.sin(i * 1.7 + seed) * 0.5 + 0.5) * 0.78 + 0.18;
    acts[i] = v;
  }
  return acts;
}

function makeWeights() {
  const w = new Array(64);
  for (let i = 0; i < 64; i++) {
    const v = Math.sin(i * 0.83 + 0.3) * Math.cos(i * 0.21);
    w[i] = v; // approx [-1, 1]
  }
  return w;
}

function getDotPos(i, x0, y0, gap = 28) {
  const col = i % 8;
  const row = Math.floor(i / 8);
  return [x0 + col * gap, y0 + row * gap];
}

function dotColor(v) {
  const r = Math.round(80 + (1 - v) * 130);
  const g = Math.round(70 + v * 110);
  const b = Math.round(60 + v * 150);
  return `rgb(${r}, ${g}, ${b})`;
}

// ── POOL stage — Conv5 → AvgPool → 64-dim vector ─────────────────────────

function PoolView() {
  const activations = useMemo(() => makeActivations(0), []);
  const [filled, setFilled] = useState(0);
  const reqRef = useRef();
  const t0Ref  = useRef(performance.now());

  useEffect(() => {
    function loop(t) {
      const elapsed = (t - t0Ref.current) / 1000;
      const CYCLE = 5.0;
      const phaseT = elapsed % CYCLE;
      if (phaseT < 2.5) {
        setFilled(Math.min(64, Math.floor((phaseT / 2.5) * 64)));
      } else {
        setFilled(64);
      }
      reqRef.current = requestAnimationFrame(loop);
    }
    reqRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqRef.current);
  }, []);

  const conv5Voxels = [];
  for (let z = 0; z < 2; z++)
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 2; x++)
        conv5Voxels.push({ x, y, z });

  return (
    <svg viewBox="0 0 800 460" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* Title */}
      <text x="400" y="28" textAnchor="middle" fontSize="13" fontWeight="600" fill="#1A2332" fontFamily="Sora">
        AdaptiveAvgPool3d · channel-wise spatial average
      </text>

      {/* LEFT: Conv5 cube */}
      <g transform="translate(110, 220)">
        <text x="0" y="-115" textAnchor="middle" fontSize="11" fill="#1A2332" fontWeight="600">Conv5</text>
        <text x="0" y="-102" textAnchor="middle" fontSize="9"  fill="#5A6478" fontFamily="JetBrains Mono">2×3×2 · 64ch</text>

        {conv5Voxels.map((v, i) => {
          const VS = 22, GAP = 3, STEP = VS + GAP;
          const OFFX = 8, OFFY = 6;
          const cx = (v.x - 1) * STEP + v.z * OFFX - 10;
          const cy = (v.y - 1.5) * STEP - v.z * OFFY;
          const intensity = (i % 5 + 2) / 7;
          return (
            <g key={i}>
              <rect x={cx} y={cy} width={VS} height={VS}
                    fill={dotColor(intensity)} stroke="#5A6478" strokeWidth="0.7"/>
              <polygon points={`${cx},${cy} ${cx+VS},${cy} ${cx+VS+OFFX},${cy-OFFY} ${cx+OFFX},${cy-OFFY}`}
                       fill={dotColor(intensity * 1.15)} stroke="#5A6478" strokeWidth="0.5"/>
            </g>
          );
        })}
      </g>

      {/* ARROW + label */}
      <g>
        <path d="M 220,220 L 380,220" stroke="#1A2332" strokeWidth="1.5"
              markerEnd="url(#fcArr)" fill="none"/>
        <text x="300" y="210" textAnchor="middle" fontSize="9.5" fill="#5A6478" fontFamily="JetBrains Mono">
          mean over 2×3×2
        </text>
        <text x="300" y="236" textAnchor="middle" fontSize="9" fill="#5A6478" fontFamily="JetBrains Mono">
          per channel → 1 scalar
        </text>
      </g>

      {/* RIGHT: 64-dim vector */}
      <g>
        <text x="565" y="100" textAnchor="middle" fontSize="11" fill="#1A2332" fontWeight="600">64-dim feature vector</text>
        <text x="565" y="114" textAnchor="middle" fontSize="9"  fill="#5A6478" fontFamily="JetBrains Mono">one number per channel</text>

        {activations.map((a, i) => {
          const [cx, cy] = getDotPos(i, 460, 132);
          const isFilled = i < filled;
          return (
            <circle key={i}
              cx={cx} cy={cy} r={9}
              fill={isFilled ? dotColor(a) : "#F0EDE5"}
              stroke="#5A6478" strokeWidth={0.6}
              opacity={isFilled ? 1 : 0.4}>
              {isFilled && i === filled - 1 && (
                <animate attributeName="r" values="9;12;9" dur="0.4s" repeatCount="1"/>
              )}
            </circle>
          );
        })}
      </g>

      <defs>
        <marker id="fcArr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#1A2332"/>
        </marker>
      </defs>
    </svg>
  );
}

// ── AGE stage — 64-dim → FC → Age ────────────────────────────────────────

function AgeView() {
  const activations = useMemo(() => makeActivations(0), []);
  const weights     = useMemo(() => makeWeights(), []);

  const [fwdProgress, setFwdProgress] = useState(0); // 0..1 lines lighting up
  const [agePulse,    setAgePulse]    = useState(0);
  const [numberOpacity, setNumberOpacity] = useState(0);
  const reqRef = useRef();
  const t0Ref  = useRef(performance.now());

  useEffect(() => {
    function loop(t) {
      const elapsed = (t - t0Ref.current) / 1000;
      const CYCLE = 5.5;
      const phaseT = elapsed % CYCLE;

      if (phaseT < 2.5) {
        setFwdProgress(phaseT / 2.5);
        setAgePulse(0);
        setNumberOpacity(0);
      } else if (phaseT < 3.2) {
        setFwdProgress(1);
        setAgePulse(1);
        setNumberOpacity(Math.min(1, (phaseT - 2.5) / 0.7));
      } else {
        setFwdProgress(1);
        setAgePulse(0.4);
        setNumberOpacity(1);
      }
      reqRef.current = requestAnimationFrame(loop);
    }
    reqRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqRef.current);
  }, []);

  const ageCx = 580;
  const ageCy = 230;

  return (
    <svg viewBox="0 0 800 460" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <text x="400" y="26" textAnchor="middle" fontSize="13" fontWeight="600" fill="#1A2332" fontFamily="Sora">
        Fully Connected · 64 weighted inputs → Brain Age
      </text>

      <defs>
        <marker id="ageArr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#1A2332"/>
        </marker>
      </defs>

      {/* 64 input neurons */}
      <g>
        <text x="155" y="64" textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#1A2332" fontFamily="Sora">
          64-dim feature vector
        </text>
        <text x="155" y="78" textAnchor="middle" fontSize="8.5" fill="#5A6478" fontFamily="JetBrains Mono">
          (after AvgPool)
        </text>

        {activations.map((a, i) => {
          const [cx, cy] = getDotPos(i, 50, 100);
          return (
            <circle key={i} cx={cx} cy={cy} r={9}
                    fill={dotColor(a)} stroke="#5A6478" strokeWidth={0.6}/>
          );
        })}
      </g>

      {/* FC connection lines */}
      <g>
        {activations.map((a, i) => {
          const [cx, cy] = getDotPos(i, 50, 100);
          const w        = weights[i];
          const lineT    = Math.min(1, Math.max(0, (fwdProgress - i * 0.005) / 0.85));
          if (lineT <= 0) return null;
          const sat = Math.min(1, Math.abs(w));
          const col = w > 0
            ? `rgba(200, 49, 43, ${0.15 + sat * 0.55 * lineT})`
            : `rgba(42, 158, 143, ${0.15 + sat * 0.55 * lineT})`;
          return (
            <line key={i}
              x1={cx} y1={cy} x2={ageCx} y2={ageCy}
              stroke={col} strokeWidth={0.7 + sat * 1.2}/>
          );
        })}
      </g>

      {/* Age neuron */}
      <g>
        <circle cx={ageCx} cy={ageCy} r={22 + agePulse * 5}
          fill="#C8312B" stroke="#7A1814" strokeWidth={2}
          opacity={0.94}/>
        <text x={ageCx} y={ageCy + 5} textAnchor="middle" fontSize="12" fontWeight="700" fill="white">
          Age
        </text>
      </g>

      {/* Big number reveal */}
      <g transform={`translate(640, 100)`} opacity={numberOpacity}>
        <text x="0" y="0" fontSize="11" fill="#5A6478" fontFamily="JetBrains Mono">
          predicted
        </text>
        <text x="0" y="62" fontSize="60" fontWeight="800" fill="#C8312B"
              fontFamily="Sora" style={{ letterSpacing: "-0.04em" }}>
          73.2
        </text>
        <text x="0" y="82" fontSize="12" fill="#1A2332" fontFamily="JetBrains Mono">
          years
        </text>
        <g transform="translate(0, 100)">
          <rect width="120" height="22" rx="11" fill="none" stroke="#5A6478" strokeWidth="0.8"/>
          <text x="60" y="15" textAnchor="middle" fontSize="9.5" fill="#5A6478" fontFamily="JetBrains Mono">
            ± 3.27 yrs MAE
          </text>
        </g>
      </g>

      <text x="400" y="450" textAnchor="middle" fontSize="9" fill="#5A6478" fontFamily="JetBrains Mono">
        red lines = positive contribution · teal lines = negative
      </text>
    </svg>
  );
}

// ── Dispatcher ────────────────────────────────────────────────────────────

export default function FCNetworkScene({ stage }) {
  return (
    <div className="w-full h-full" style={{ background: "#FAF7F2" }}>
      {stage === "pool" ? <PoolView/> : <AgeView/>}
    </div>
  );
}
