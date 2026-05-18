// Static SVG architecture overview — mimics the published SFCN figure.
// Each layer is a 3D parallelepiped sized proportionally to its spatial dims.
// Click any layer to jump to that stage in the 3D animation above.

const CY = 110;

const LAYERS = [
  { id:"conv1", label:"Conv1", channels:32,  type:"k3",   x:55,  fw:24, fh:140, depth:18 },
  { id:"conv2", label:"Conv2", channels:64,  type:"k3",   x:200, fw:22, fh:95,  depth:22 },
  { id:"conv3", label:"Conv3", channels:128, type:"k3",   x:335, fw:22, fh:62,  depth:28 },
  { id:"conv4", label:"Conv4", channels:256, type:"k3",   x:455, fw:28, fh:42,  depth:36 },
  { id:"conv5", label:"Conv5", channels:256, type:"k3",   x:560, fw:22, fh:28,  depth:32 },
  { id:"conv6", label:"Conv6", channels:64,  type:"k1",   x:642, fw:22, fh:24,  depth:22 },
  { id:"pool",  label:"AvgPool", channels:64, type:"pool", x:712, fw:18, fh:20,  depth:18 },
  { id:"head",  label:"k=1",   channels:1,   type:"head", x:770, fw:14, fh:18,  depth:14 },
];

const COLORS = {
  k3:   { fill:"#F5B27A", top:"#FAD4AA", side:"#C97F38", stroke:"#7A4815" },
  k1:   { fill:"#C8B6E8", top:"#E0D4F2", side:"#9F8AC8", stroke:"#4F3B7A" },
  pool: { fill:"#A8D5BA", top:"#CDE7D6", side:"#6FAA8B", stroke:"#2D5C40" },
  head: { fill:"#8AB7E1", top:"#B1D0ED", side:"#5E96C9", stroke:"#1E4A75" },
};

function Block3D({ layer, active, dim, onClick }) {
  const { x, fw, fh, depth, type, label, channels } = layer;
  const c = COLORS[type];
  const top   = CY - fh / 2;
  const right = x + fw;
  const OFFX  = depth * 0.7;
  const OFFY  = depth * 0.55;
  const sw    = active ? 2.2 : 1.1;
  const op    = dim ? 0.55 : 1;

  return (
    <g style={{ cursor: "pointer" }} onClick={onClick} opacity={op}>
      {/* Top face */}
      <polygon
        points={`${x},${top} ${right},${top} ${right+OFFX},${top-OFFY} ${x+OFFX},${top-OFFY}`}
        fill={c.top} stroke={c.stroke} strokeWidth={sw}/>
      {/* Right face */}
      <polygon
        points={`${right},${top} ${right+OFFX},${top-OFFY} ${right+OFFX},${top+fh-OFFY} ${right},${top+fh}`}
        fill={c.side} stroke={c.stroke} strokeWidth={sw}/>
      {/* Front face */}
      <rect x={x} y={top} width={fw} height={fh}
            fill={c.fill} stroke={c.stroke} strokeWidth={sw}/>

      {/* Active layer ring */}
      {active && (
        <rect x={x - 3} y={top - 3} width={fw + 6} height={fh + 6}
              fill="none" stroke="#C8312B" strokeWidth={2} rx={2}
              strokeDasharray="4 3">
          <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="0.8s" repeatCount="indefinite"/>
        </rect>
      )}

      {/* Label below */}
      <text x={x + fw/2 + OFFX/2} y={CY + fh/2 + 16}
            textAnchor="middle" fontSize="10" fill="#1A2332" fontFamily="Sora"
            fontWeight="600">
        {label}
      </text>
      <text x={x + fw/2 + OFFX/2} y={CY + fh/2 + 27}
            textAnchor="middle" fontSize="8.5" fill="#5A6478" fontFamily="JetBrains Mono">
        {channels} ch
      </text>
    </g>
  );
}

// Compact HTML legend — render this NEXT to the architecture-panel header
export function SFCNArchLegend() {
  const items = [
    { swatch: COLORS.k3,   text: "Conv3D · k=3 + ReLU + BN + Pool" },
    { swatch: COLORS.k1,   text: "Conv3D · k=1 + ReLU + BN" },
    { swatch: COLORS.pool, text: "AvgPool + Dropout" },
    { swatch: COLORS.head, text: "Conv3D · k=1 head" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px]">
      <span className="flex items-center gap-1.5">
        <svg width="22" height="6" className="overflow-visible">
          <line x1="0" y1="3" x2="22" y2="3"
                stroke="#1A2332" strokeWidth="1.4" strokeDasharray="3 2.5"/>
          <path d="M22,0 L26,3 L22,6 Z" fill="#1A2332"/>
        </svg>
        <span className="text-ink">Forward pass</span>
      </span>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[1px] inline-block"
                style={{ background: it.swatch.fill, border: `1px solid ${it.swatch.stroke}` }}/>
          <span className="text-ink">{it.text}</span>
        </span>
      ))}
    </div>
  );
}

// Forward dashed arrows (between successive layers + into Age)
function ForwardArrows() {
  const segments = LAYERS.slice(0, -1).map((l, i) => {
    const next = LAYERS[i + 1];
    const fromX = l.x + l.fw + l.depth * 0.7;
    const toX   = next.x;
    const yA    = CY - 24;
    const yB    = CY + 20;
    // Alternate the y to give a "zig-zag" look like the figure
    const y1 = i % 2 === 0 ? yA : yB;
    const y2 = i % 2 === 0 ? yB : yA;
    return { d: `M ${fromX},${y1} L ${toX},${y2}`, key: i };
  });
  return (
    <g>
      {segments.map(s => (
        <path key={s.key} d={s.d}
              fill="none" stroke="#1A2332" strokeWidth={1.2}
              strokeDasharray="3 3" markerEnd="url(#archArrFwd)"/>
      ))}
      {/* Into Age */}
      <path d={`M ${LAYERS[LAYERS.length-1].x + 18},${CY} L 783,${CY}`}
            fill="none" stroke="#1A2332" strokeWidth={1.2}
            strokeDasharray="3 3" markerEnd="url(#archArrFwd)"/>
    </g>
  );
}

export default function SFCNArchDiagram({ activeStage, onStageClick }) {
  // Map current stage to LAYERS index (Input/Age aren't in the LAYERS array).
  const activeIdx = LAYERS.findIndex(l => l.id === activeStage);

  return (
    <svg
      viewBox="0 0 900 210"
      preserveAspectRatio="xMidYMid meet"
      className="w-full"
      style={{ fontFamily: "Sora, sans-serif", maxHeight: "100%", display: "block" }}
    >
      <defs>
        <marker id="archArrFwd" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#1A2332"/>
        </marker>
      </defs>

      {/* Forward arrows (under blocks) */}
      <ForwardArrows/>

      {/* Layer blocks */}
      {LAYERS.map((l, i) => {
        const dim = activeIdx !== -1 && i !== activeIdx;
        return (
          <Block3D
            key={l.id}
            layer={l}
            active={i === activeIdx}
            dim={dim}
            onClick={() => onStageClick(l.id)}
          />
        );
      })}

      {/* Age circle */}
      <g style={{ cursor: "pointer" }} onClick={() => onStageClick("age")}>
        <circle cx={820} cy={CY} r={20}
                fill="#FFFFFF" stroke="#1A2332" strokeWidth={activeStage === "age" ? 2.2 : 1.3}/>
        <text x={820} y={CY + 4} textAnchor="middle"
              fontSize={11.5} fill="#1A2332" fontWeight="600">
          Age
        </text>
        {activeStage === "age" && (
          <circle cx={820} cy={CY} r={24} fill="none" stroke="#C8312B" strokeWidth={1.8}
                  strokeDasharray="4 3">
            <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="0.8s" repeatCount="indefinite"/>
          </circle>
        )}
      </g>

      {/* Input arrow (entering Conv1 from the left) */}
      <g style={{ cursor: "pointer" }} onClick={() => onStageClick("input")}>
        <text x={20} y={CY - 18} fontSize={9.5} fill="#5A6478" fontFamily="JetBrains Mono">
          1×91×109×91
        </text>
        <text x={20} y={CY - 6} fontSize={10}   fill="#1A2332" fontWeight="600">
          Input
        </text>
        <path d={`M 28,${CY+6} L 50,${CY+6}`}
              stroke="#1A2332" strokeWidth={1.2} strokeDasharray="3 3"
              markerEnd="url(#archArrFwd)"/>
        {activeStage === "input" && (
          <rect x={6} y={CY - 26} width={48} height={36} fill="none"
                stroke="#C8312B" strokeWidth={1.8} rx={3} strokeDasharray="4 3">
            <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="0.8s" repeatCount="indefinite"/>
          </rect>
        )}
      </g>

    </svg>
  );
}
