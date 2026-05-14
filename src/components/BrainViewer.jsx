import { lazy, Suspense, useState, useEffect } from "react";
import GlassBrain from "./GlassBrain";
import { registerWarmup } from "../lib/brainViewerWarmup";

const BrainnetomeAtlas = lazy(() => import("./BrainnetomeAtlas"));

export default function BrainViewer({ staticSrc, counts, sig, regions, caption, forceMode }) {
  // forceMode: "2d" | "3d" | null (user toggles)
  const [show3D, setShow3D] = useState(forceMode === "3d");
  const [ready3D, setReady3D] = useState(false);

  useEffect(() => {
    registerWarmup(() => setReady3D(true));
  }, []);

  useEffect(() => {
    if (forceMode === "3d") setShow3D(true);
    else if (forceMode === "2d") setShow3D(false);
  }, [forceMode]);

  return (
    <div>
      {!show3D ? (
        <GlassBrain src={staticSrc} alt={caption} caption={caption}/>
      ) : (
        <Suspense
          fallback={
            <div className="h-[480px] bg-ink/10 rounded-lg flex items-center justify-center text-ink2 font-mono text-xs">
              Loading 3D atlas…
            </div>
          }
        >
          <BrainnetomeAtlas counts={counts} sig={sig} regions={regions}/>
        </Suspense>
      )}

      <div className="flex gap-2 mt-2">
        <button
          onClick={() => setShow3D(false)}
          className={`font-mono text-xs px-3 py-1 rounded border transition-colors ${
            !show3D
              ? "bg-ink text-paper border-ink"
              : "border-rule/30 text-ink2 hover:text-ink hover:border-ink/40"
          }`}
        >
          2D
        </button>
        <button
          onClick={() => setShow3D(true)}
          disabled={!ready3D}
          className={`font-mono text-xs px-3 py-1 rounded border transition-colors ${
            show3D
              ? "bg-ink text-paper border-ink"
              : "border-rule/30 text-ink2 hover:text-ink hover:border-ink/40"
          } ${!ready3D ? "opacity-40 cursor-not-allowed" : ""} ${
            ready3D && !show3D ? "ring-1 ring-accent/60" : ""
          }`}
        >
          3D{!ready3D ? " …" : ""}
        </button>
      </div>
    </div>
  );
}
