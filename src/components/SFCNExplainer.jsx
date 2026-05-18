import { useState, useEffect, useRef, lazy, Suspense } from "react";
import SFCNArchDiagram, { SFCNArchLegend } from "./SFCNArchDiagram";

const Conv3DScene    = lazy(() => import("./Conv3DScene"));
const FCNetworkScene = lazy(() => import("./FCNetworkScene"));

// ── Stage metadata ────────────────────────────────────────────────────────────

const STAGES = [
  { id:"input",  label:"Input",          dims:"91×109×91", ch:1,    color:"#1E3A5F", feat:"brain image",         info:"Raw T1-MRI scan in MNI152 2mm space. One channel = the full 3D brain volume." },
  { id:"conv1",  label:"Conv1 + Pool",   dims:"45×54×45",  ch:32,   color:"#9A5710", feat:"edges & textures",    info:"32 feature maps each detecting different local 3D patterns — edges, sulcal curves, intensity gradients." },
  { id:"conv2",  label:"Conv2 + Pool",   dims:"22×27×22",  ch:64,   color:"#9A5710", feat:"regional structure",  info:"64 feature maps. Spatial resolution halved again. Features become more region-level." },
  { id:"conv3",  label:"Conv3 + Pool",   dims:"11×13×11",  ch:128,  color:"#9A5710", feat:"structural patterns", info:"128 channels. Each ‘pixel’ now covers ~16mm of brain — detecting large structural patterns." },
  { id:"conv4",  label:"Conv4 + Pool",   dims:"5×6×5",     ch:256,  color:"#B06818", feat:"high-level features", info:"256 channels. Only 5×6×5 spatial units remain. Highly abstract representations." },
  { id:"conv5",  label:"Conv5 + Pool",   dims:"2×3×2",     ch:256,  color:"#B06818", feat:"abstract features",   info:"256 channels across just 2×3×2 spatial units. Near-complete spatial compression." },
  { id:"conv6",  label:"Conv6 (k=1)",    dims:"2×3×2",     ch:64,   color:"#5B21B6", feat:"channel mixing",      info:"k=1 kernel: purely mixes channels without any spatial operation. Reduces to 64 channels." },
  { id:"pool",   label:"AvgPool → FC",   dims:"64-dim",    ch:64,   color:"#14532D", feat:"feature vector",      info:"Global average pooling collapses spatial dims → 64 scalar values. Fully-connected layer predicts age." },
  { id:"age",    label:"Brain Age",      dims:"years",     ch:null, color:"#C8312B", feat:"prediction",          info:"Predicted brain age in years. Compared to chronological age → Brain Age Gap (BAG)." },
];

// ── Collapsible ──────────────────────────────────────────────────────────────

function Collapsible({ title, preview, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-paper2 rounded-xl border border-rule/20 p-5">
      <h4 className="font-sans font-semibold text-ink mb-2">{title}</h4>
      <p className="font-serif text-sm text-ink2 leading-relaxed">{preview}</p>
      {open && (
        <div className="mt-3 font-serif text-sm text-ink2 leading-relaxed space-y-2">
          {children}
        </div>
      )}
      <button onClick={() => setOpen(o => !o)}
              className="mt-3 font-mono text-xs text-accent hover:text-sig hover:underline transition-colors">
        {open ? "− Show less" : "+ Read more"}
      </button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function SFCNExplainer() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying]     = useState(true);
  // Carousel transition — when set, this stage is sliding out (old scene)
  // and the active stage is sliding in (new scene). Cleared after 1.5s.
  const [slidingOutIdx, setSlidingOutIdx] = useState(null);
  const timeoutRef = useRef(null);

  // Clear the slide-out frame after the animation completes
  useEffect(() => {
    if (slidingOutIdx === null) return;
    const t = setTimeout(() => setSlidingOutIdx(null), 1500);
    return () => clearTimeout(t);
  }, [slidingOutIdx]);

  useEffect(() => {
    if (!playing) return;
    const stage = STAGES[activeIdx];
    const delay = stage.id === "conv1" ? 8500 : stage.id === "age" ? 3500 : stage.id === "input" ? 3000 : 4500;
    timeoutRef.current = setTimeout(() => {
      setSlidingOutIdx(activeIdx);                                  // snapshot current as outgoing
      setActiveIdx(i => (i + 1) % STAGES.length);
    }, delay);
    return () => clearTimeout(timeoutRef.current);
  }, [activeIdx, playing]);

  const stage = STAGES[activeIdx];

  const handleClick = (idOrIdx) => {
    setPlaying(false);
    const i = typeof idOrIdx === "string"
      ? STAGES.findIndex(s => s.id === idOrIdx)
      : idOrIdx;
    if (i >= 0 && i !== activeIdx) {
      setSlidingOutIdx(activeIdx);                                  // animate old out → new in
      setActiveIdx(i);
    }
  };

  return (
    <div className="mt-6 space-y-5 w-full">
      {/* ── Mobile fallback ─────────────────────────────────────────── */}
      <div className="md:hidden rounded-xl border border-rule/20 bg-paper2 p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink2">SFCN · interactive diagram</p>
        <p className="font-sans text-sm font-semibold text-ink mt-1">Desktop view recommended</p>
        <p className="font-serif text-[13px] text-ink2 mt-2 leading-relaxed">
          The 3D forward-pass animation, kernel mechanics, and IG backward sweep are best viewed on a larger screen.
          Open this page on a desktop or tablet to step through the SFCN layer by layer.
        </p>
      </div>

      {/* ── Desktop interactive panel — viewport-fitted ───────────────── */}
      <div
        className="hidden md:flex md:flex-col rounded-xl overflow-hidden border border-rule/20 bg-paper"
        style={{ height: "min(880px, calc(100vh - 60px))", minHeight: 600 }}
      >

        {/* Header */}
        <div className="flex-shrink-0 px-5 py-2.5 border-b border-rule/15 flex items-center justify-between flex-wrap gap-3 bg-paper2">
          <div>
            <p className="font-mono text-[10px] text-ink2 uppercase tracking-widest">
              SFCN · Interactive Forward Pass
            </p>
            <p className="font-sans text-sm font-semibold text-ink mt-0.5">
              How a 3D convolution operates on a brain volume — layer by layer
            </p>
          </div>
          <button
            onClick={() => setPlaying(p => !p)}
            className="font-mono text-[11px] px-3 py-1.5 rounded-md border border-rule/30 text-ink2 hover:border-ink hover:text-ink hover:bg-paper transition-colors"
          >
            {playing ? "⏸  Pause" : "▶  Play"}
          </button>
        </div>

        {/* Stage rail */}
        <div className="flex-shrink-0 px-5 pt-2 pb-1 bg-paper">
          <div className="flex items-center justify-between mb-1">
            <p className="font-mono text-[10px] text-ink2 uppercase tracking-wider">
              Stage {activeIdx + 1} of {STAGES.length} · {stage.label}
            </p>
            <span className="font-mono text-[10px] text-ink2">{stage.dims}</span>
          </div>
          <div className="flex items-center gap-1">
            {STAGES.map((s, i) => (
              <div key={s.id}
                   className="h-1 rounded-full transition-all"
                   style={{
                     flex: i === activeIdx ? 3 : 1,
                     background: i <= activeIdx ? s.color : "#D7D2C7",
                     opacity: i <= activeIdx ? 1 : 0.55,
                   }}/>
            ))}
          </div>
        </div>

        {/* Body: carousel — old stage slides out left, new stage slides in right */}
        <div className="flex-1 min-h-0 p-3">
          <div
            className="relative h-full rounded-lg border border-rule/15 overflow-hidden"
            style={{ background: "#FAF7F2" }}
          >
            {/* Outgoing scene (slides out left) */}
            {slidingOutIdx !== null && slidingOutIdx !== activeIdx && (
              <div key={`out-${slidingOutIdx}-${activeIdx}`}
                   className="absolute inset-0 animate-slide-out z-0 pointer-events-none">
                <Suspense fallback={null}>
                  {(() => {
                    const s = STAGES[slidingOutIdx];
                    return (s.id === "pool" || s.id === "age")
                      ? <FCNetworkScene stage={s.id}/>
                      : <Conv3DScene stage={s.id}/>;
                  })()}
                </Suspense>
              </div>
            )}

            {/* Incoming (active) scene */}
            <div key={`in-${activeIdx}-${slidingOutIdx}`}
                 className={`absolute inset-0 z-10 ${slidingOutIdx !== null ? "animate-slide-in" : "animate-fade"}`}>
              <Suspense fallback={
                <div className="h-full flex items-center justify-center text-ink2 font-mono text-xs gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin"/>
                  Loading 3D scene…
                </div>
              }>
                {(stage.id === "pool" || stage.id === "age")
                  ? <FCNetworkScene stage={stage.id}/>
                  : <Conv3DScene stage={stage.id}/>}
              </Suspense>
            </div>

            {/* stage colour rail */}
            <div className="absolute top-0 left-0 right-0 h-[3px] pointer-events-none z-20"
                 style={{ background: stage.color }}/>

            {/* Kernel hint (conv stages) */}
            {stage.id.startsWith("conv") && (
              <div className="absolute top-3 left-3 pointer-events-none z-20">
                <div className="bg-paper/90 backdrop-blur-sm border border-rule/20 rounded-md px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2.5 h-2.5 rounded-sm border border-orange-700"
                          style={{ background: "#F59E0B" }}/>
                    <span className="font-mono text-[10px] text-ink font-semibold">
                      {stage.id === "conv6" ? "1×1×1 kernel" : "3×3×3 kernel"}
                    </span>
                  </div>
                  <div className="font-mono text-[9px] text-ink2 leading-snug">
                    {stage.id === "conv6" ? "1 voxel → 1 output (channel-mix)" : "27 voxels → 1 output"}
                  </div>
                  <div className="font-mono text-[9px] text-ink2 leading-snug">
                    × {stage.ch} kernels = {stage.ch} feature maps
                  </div>
                </div>
              </div>
            )}

            {/* Stage label (replaces the old right info panel) */}
            <div className="absolute bottom-3 left-3 right-3 pointer-events-none z-20 flex items-end justify-between gap-3 flex-wrap">
              <div className="bg-paper/85 backdrop-blur-sm border border-rule/20 rounded-md px-3 py-1.5 max-w-md">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[10px] text-ink2 uppercase tracking-widest">
                    {`Stage ${activeIdx + 1}/${STAGES.length}`}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0 rounded-full border"
                        style={{ background: `${stage.color}22`, color: stage.color, borderColor: stage.color }}>
                    {stage.ch != null ? `${stage.ch} ch` : "scalar"}
                  </span>
                  <span className="font-mono text-[10px] text-ink2">{stage.dims}</span>
                </div>
                <p className="font-sans text-sm font-bold text-ink leading-tight">{stage.label}</p>
                <p className="font-serif text-[12px] text-ink2 leading-snug mt-0.5">{stage.feat}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Architecture diagram (replaces clickable button strip) */}
        <div className="flex-shrink-0 px-5 pt-2 pb-1 border-t border-rule/15 bg-paper">
          <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
            <p className="font-mono text-[10px] text-ink2 uppercase tracking-wider flex-shrink-0">
              Network architecture · click any block to jump
            </p>
            <SFCNArchLegend/>
          </div>
          <div className="flex justify-center" style={{ maxHeight: 200 }}>
            <div className="w-full" style={{ maxHeight: 200 }}>
              <SFCNArchDiagram activeStage={stage.id} onStageClick={handleClick}/>
            </div>
          </div>
        </div>

        {/* Params footer */}
        <div className="flex-shrink-0 px-5 py-2 border-t border-rule/15 bg-paper2 flex flex-wrap gap-4">
          {[
            ["Parameters", "2.95 M"],
            ["MAE", "3.27 ± 0.19 yrs"],
            ["Input", "1×91×109×91"],
          ].map(([k, v]) => (
            <span key={k} className="font-mono text-[10px] text-ink2">
              <span className="text-ink/50 mr-1">{k}</span>
              <span className="text-ink">{v}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Collapsible details */}
      <div className="grid md:grid-cols-1 gap-4">
        <Collapsible
          title="SFCN Architecture"
          preview={
            "SFCN is a 2.95M-parameter 3D fully convolutional network that processes " +
            "whole-brain MRI volumes at 91×109×91 voxels (2mm isotropic). " +
            "It achieves MAE 3.27±0.19 years — matching or surpassing models 4–29× larger."
          }
        >
          <p>
            <strong className="text-ink">Layer-by-layer channel progression:</strong>{" "}
            1 → 32 → 64 → 128 → 256 → 256 → 64 channels. Each channel after the first convolution
            is a <em>3D feature map</em> — a full-brain volume detecting a specific morphological pattern.
          </p>
          <p>
            <strong className="text-ink">Why 3D convolutions (not 2D):</strong>{" "}
            Brain structures span all three spatial axes. A cortical sulcus, white matter tract, or
            subcortical nucleus cannot be characterised from a single 2D slice — the 3×3×3 kernel
            (k=3) captures local 3D neighborhoods throughout the entire volume simultaneously.
          </p>
          <p>
            <strong className="text-ink">Conv6 uses k=1 (pointwise):</strong>{" "}
            After five stages of 3D spatial compression (91→2 in each dim), there is no useful
            spatial locality left. A 1×1×1 kernel mixes channels without spatial aggregation,
            reducing 256 channels to 64.
          </p>
          <p>
            <strong className="text-ink">AdaptiveAvgPool3d</strong>{" "}
            collapses the 2×3×2 spatial volume to a single scalar per channel → a 64-dim vector
            fed to the regression head. This global average pooling is robust to minor registration
            differences across scanners.
          </p>
          <p>
            <strong className="text-ink">Why smaller beats bigger:</strong>{" "}
            Local 3D filters capture atrophy, cortical thinning, and sulcal widening directly.
            Global attention (e.g., ViT) risks overfitting scanner-specific noise rather than
            genuine brain morphology.
          </p>
        </Collapsible>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0.2 } to { opacity: 1 } }
        .animate-fade { animation: fadeIn 0.3s ease-out; }

        @keyframes carouselSlideOut {
          0%   { transform: translateX(0%)   scale(1);    opacity: 1; }
          100% { transform: translateX(-30%) scale(0.92); opacity: 0; }
        }
        @keyframes carouselSlideIn {
          0%   { transform: translateX(30%)  scale(0.92); opacity: 0; }
          60%  { transform: translateX(0%)   scale(1);    opacity: 1; }
          100% { transform: translateX(0%)   scale(1);    opacity: 1; }
        }
        .animate-slide-out { animation: carouselSlideOut 1.4s cubic-bezier(0.65, 0, 0.35, 1) forwards; }
        .animate-slide-in  { animation: carouselSlideIn  1.4s cubic-bezier(0.65, 0, 0.35, 1) forwards; }
      `}</style>
    </div>
  );
}
