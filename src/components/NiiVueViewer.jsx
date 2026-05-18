import { useEffect, useRef, useState } from "react";
import { Niivue, SLICE_TYPE, MULTIPLANAR_TYPE, SHOW_RENDER } from "@niivue/niivue";

const SLICE_BUTTONS = [
  { label: "multi",    val: SLICE_TYPE.MULTIPLANAR },
  { label: "axial",    val: SLICE_TYPE.AXIAL },
  { label: "coronal",  val: SLICE_TYPE.CORONAL },
  { label: "sagittal", val: SLICE_TYPE.SAGITTAL },
];

export default function NiiVueViewer({
  url,
  overlay,
  colormap = "gray",
  overlayColormap = "red",
  height = 760,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const nvRef = useRef(null);
  const [slice, setSlice] = useState(SLICE_TYPE.MULTIPLANAR);
  const [loading, setLoading] = useState(true);

  // create niivue once
  useEffect(() => {
    const nv = new Niivue({
      show3Dcrosshair: false,
      backColor: [0.05, 0.07, 0.10, 1],
      crosshairColor: [0.91, 0.61, 0.17, 0.75],
      crosshairWidth: 1,
      textHeight: 0.025,
      isOrientCube: false,
      isColorbar: false,
      sliceType: SLICE_TYPE.MULTIPLANAR,
      multiplanarLayout: MULTIPLANAR_TYPE.ROW,
      multiplanarShowRender: SHOW_RENDER.ALWAYS,
      multiplanarForceRender: true,
      multiplanarPadPixels: 6,
    });
    nv.attachToCanvas(canvasRef.current);
    nvRef.current = nv;

    // keep canvas backbuffer in sync with CSS size; NiiVue's own listener fires
    // on window resize, but we also need to respond to parent layout changes
    // (section expand, mode switches, etc.)
    const ro = new ResizeObserver(() => {
      const c = canvasRef.current;
      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (w === 0 || h === 0) return;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      if (typeof nv.resizeListener === "function") nv.resizeListener();
      nv.drawScene();
    });
    ro.observe(canvasRef.current);

    return () => {
      ro.disconnect();
      nvRef.current = null;
    };
  }, []);

  // load / replace volumes when url changes
  useEffect(() => {
    const nv = nvRef.current;
    if (!nv || !url) return;
    setLoading(true);
    const volumes = [{ url, colormap }];
    if (overlay) {
      volumes.push({
        url: overlay,
        colormap: overlayColormap,
        opacity: 0.7,
      });
    }
    nv.loadVolumes(volumes).then(() => {
      setLoading(false);
      nv.drawScene();
    });
  }, [url, overlay, colormap, overlayColormap]);

  // change slice mode
  useEffect(() => {
    const nv = nvRef.current;
    if (!nv) return;
    nv.setSliceType(slice);
  }, [slice]);

  return (
    <div
      ref={containerRef}
      className="relative bg-ink rounded-xl border border-rule/30 overflow-hidden"
      style={{ height: `${height}px` }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/60 backdrop-blur-sm pointer-events-none">
          <p className="font-mono text-[11px] text-paper/80 tracking-widest">loading volume…</p>
        </div>
      )}
      <div className="absolute top-2 right-2 flex gap-1 bg-black/60 backdrop-blur rounded-md p-1 border border-white/10">
        {SLICE_BUTTONS.map(b => (
          <button
            key={b.label}
            onClick={() => setSlice(b.val)}
            className={[
              "font-mono text-[10px] px-2 py-1 rounded transition-colors",
              slice === b.val
                ? "bg-accent text-ink font-semibold"
                : "text-paper/60 hover:text-paper",
            ].join(" ")}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div className="absolute bottom-2 left-3 font-mono text-[10px] text-paper/45 tracking-wide pointer-events-none">
        drag to pan · scroll to zoom · click for crosshair
      </div>
    </div>
  );
}
