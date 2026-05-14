import { Suspense, useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, GizmoHelper, GizmoViewport } from "@react-three/drei";
import * as THREE from "three";
import { sequentialColor, palette, networkColors } from "../lib/theme";

useGLTF.preload("/assets/meshes/atlas.glb");

function hexToThree(hex) {
  return new THREE.Color(hex);
}

function AtlasScene({ counts, sig, regions, onHover, colorMode }) {
  const { scene: gltfScene } = useGLTF("/assets/meshes/atlas.glb");
  const groupRef = useRef(null);
  const [highlight, setHighlight] = useState(null);
  const meshMapRef = useRef({});

  const maxCount = counts ? Math.max(1, ...counts) : 1;

  // Clone scene once
  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.clear();
    meshMapRef.current = {};
    const clone = gltfScene.clone(true);
    clone.traverse(obj => {
      if (!obj.isMesh) return;
      const m = obj.name.match(/^roi_(\d+)$/);
      if (!m) return;
      obj.material = obj.material.clone();
      meshMapRef.current[parseInt(m[1])] = obj;
    });
    groupRef.current.add(clone);
  }, [gltfScene]);

  // Update materials when data or highlight changes
  useEffect(() => {
    if (!counts) return;
    Object.entries(meshMapRef.current).forEach(([idStr, obj]) => {
      const id = parseInt(idStr);
      const idx = id - 1;
      const count = counts[idx] ?? 0;
      const isSig = sig?.[idx] === 1;
      const isHighlighted = id === highlight;

      let color, opacity, transparent, depthWrite;

      if (!isSig) {
        color = hexToThree(palette.shell);
        opacity = 0.15;
        transparent = true;
        depthWrite = false;
        obj.raycast = () => {};
      } else {
        if (isHighlighted) {
          color = hexToThree(palette.accent);
        } else if (colorMode === "network") {
          const r = regions?.get(id);
          color = hexToThree(networkColors[r?.network7] ?? palette.shell);
        } else {
          const t = count / maxCount;
          color = hexToThree(sequentialColor(t));
        }
        opacity = 1;
        transparent = false;
        depthWrite = true;
        obj.raycast = THREE.Mesh.prototype.raycast.bind(obj);
      }

      obj.material.color.copy(color);
      obj.material.opacity = opacity;
      obj.material.transparent = transparent;
      obj.material.depthWrite = depthWrite;
      obj.renderOrder = transparent ? 0 : 2;
    });
  }, [counts, sig, highlight, maxCount, regions, colorMode]);

  const handlePointerMove = useCallback(e => {
    e.stopPropagation();
    const m = e.object?.name?.match(/^roi_(\d+)$/);
    if (!m) return;
    const id = parseInt(m[1]);
    setHighlight(id);
    const r = regions?.get(id);
    if (r) {
      onHover?.({
        ...r,
        count: counts?.[id - 1] ?? 0,
        isSig: sig?.[id - 1] === 1,
      }, e.clientX, e.clientY);
    }
  }, [regions, counts, sig, onHover]);

  const handlePointerLeave = useCallback(() => {
    setHighlight(null);
    onHover?.(null);
  }, [onHover]);

  return (
    <group
      ref={groupRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    />
  );
}

export default function BrainnetomeAtlas({ counts, sig, regions, height = 480, colorMode = "count" }) {
  const [tooltip, setTooltip] = useState(null);
  const containerRef = useRef(null);

  const handleHover = useCallback((data, clientX, clientY) => {
    if (!data) { setTooltip(null); return; }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ data, x: clientX - rect.left, y: clientY - rect.top });
  }, []);

  const maxCount = counts ? Math.max(1, ...counts) : 1;
  const sigCount = sig ? sig.filter(v => v === 1).length : 0;

  return (
    <div ref={containerRef} className="relative rounded-lg overflow-hidden" style={{ background: "#0D1520", height }}>
      <Canvas camera={{ position: [0, 0, 350], fov: 40 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.7}/>
        <directionalLight position={[200, 300, 200]} intensity={1.0}/>
        <directionalLight position={[-200, -100, -200]} intensity={0.3}/>
        <Suspense fallback={null}>
          <AtlasScene
            counts={counts}
            sig={sig}
            regions={regions}
            onHover={handleHover}
            colorMode={colorMode}
          />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={120} maxDistance={600} autoRotate autoRotateSpeed={0.4}/>
        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport axisColors={["#C8312B","#9ACD32","#4682B4"]} labelColor="white"/>
        </GizmoHelper>
      </Canvas>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-ink/60 backdrop-blur-sm rounded-lg px-3 py-1.5">
        <span className="font-mono text-[10px] text-paper/60">low</span>
        <div className="w-20 h-2 rounded-full" style={{
          background: `linear-gradient(to right, ${sequentialColor(0)}, ${sequentialColor(0.5)}, ${sequentialColor(1)})`
        }}/>
        <span className="font-mono text-[10px] text-paper/60">high</span>
        <span className="font-mono text-[10px] text-paper/40 ml-2">count / {maxCount}</span>
      </div>

      {/* Sig count badge */}
      <div className="absolute top-3 left-3 bg-ink/60 backdrop-blur-sm rounded-lg px-3 py-1.5">
        <span className="font-mono text-[10px] text-sig font-bold">{sigCount}</span>
        <span className="font-mono text-[10px] text-paper/60"> significant ROIs</span>
      </div>

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 bg-ink text-paper rounded-lg px-3 py-2.5 text-xs font-mono shadow-xl"
          style={{
            left: Math.min(tooltip.x + 12, (containerRef.current?.offsetWidth ?? 400) - 220),
            top: Math.max(8, tooltip.y - 80),
            maxWidth: 210,
          }}
        >
          <p className="font-bold text-accent text-sm">{tooltip.data.label}</p>
          <p className="text-paper/60 text-[11px] mt-0.5">{tooltip.data.subregion}</p>
          <div className="mt-1.5 space-y-0.5 text-[11px]">
            <p>Network: <span className="text-accent">{tooltip.data.network7}</span></p>
            <p>Hemisphere: <span className="text-paper/80">{tooltip.data.hemi}</span></p>
            <p>Count: <span className="font-bold text-paper">{tooltip.data.count}</span></p>
            <p>Significant: {tooltip.data.isSig
              ? <span className="text-sig font-bold">Yes ✓</span>
              : <span className="text-paper/40">No</span>
            }</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute top-3 right-3 font-mono text-[10px] text-paper/30 text-right leading-relaxed">
        drag to rotate<br/>scroll to zoom
      </div>
    </div>
  );
}
