import { Suspense, useRef, useState, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, GizmoHelper, GizmoViewport } from "@react-three/drei";
import * as THREE from "three";
import { sequentialColor, palette, networkColors } from "../lib/theme";

useGLTF.preload("/assets/meshes/atlas.glb");

const BG = "#141E2D";  // dark navy scene background

function makeStdMat(color) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.55,
    metalness: 0.05,
    transparent: false,
    depthWrite: true,
  });
}

function makeShellMat(opacity) {
  // MeshBasicMaterial for shell — unlit, consistent brightness regardless of scene lights
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color("#A8BFD4"),
    opacity,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });
}

function AtlasScene({ counts, sig, regions, onHover, colorMode, shellOpacity, numCohorts }) {
  const { scene: gltfScene } = useGLTF("/assets/meshes/atlas.glb");
  const groupRef   = useRef(null);
  const meshMapRef = useRef({});
  const [highlight, setHighlight] = useState(null);

  const maxCount = numCohorts > 1 ? numCohorts : (counts ? Math.max(1, ...counts) : 1);

  // Clone entire scene once when GLB loads
  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.clear();
    meshMapRef.current = {};

    const clone = gltfScene.clone(true);
    clone.traverse(obj => {
      if (!obj.isMesh) return;
      const m = obj.name.match(/^roi_(\d+)$/);
      if (!m) return;
      const id = parseInt(m[1]);
      // Store id directly so material update loop doesn't need reverse lookup
      meshMapRef.current[id] = {
        id,
        mesh: obj,
        stdMat:   makeStdMat("#ffffff"),
        shellMat: makeShellMat(shellOpacity),
      };
    });
    groupRef.current.add(clone);
  }, [gltfScene]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update materials whenever data, highlight, color mode, or shell opacity changes
  useEffect(() => {
    if (!counts) return;
    Object.values(meshMapRef.current).forEach(({ id, mesh, stdMat, shellMat }) => {
      const idx = id - 1;
      if (idx < 0 || idx >= 246) return;

      const count = counts[idx] ?? 0;
      const isSig = sig?.[idx] === 1;
      const isHov = id === highlight;

      if (!isSig) {
        // Shell — unlit, translucent
        shellMat.opacity = shellOpacity;
        mesh.material   = shellMat;
        mesh.renderOrder = 0;
        mesh.raycast     = () => {};
      } else {
        // Significant — lit, opaque, coloured
        let hex;
        if (isHov) {
          hex = palette.accent;
        } else if (colorMode === "network") {
          const r = regions?.get(id);
          hex = networkColors[r?.network7] ?? networkColors.NA;
        } else {
          hex = sequentialColor(maxCount > 0 ? count / maxCount : 0);
        }
        stdMat.color.set(new THREE.Color(hex));
        stdMat.transparent = false;
        stdMat.depthWrite  = true;
        mesh.material      = stdMat;
        mesh.renderOrder   = 2;
        mesh.raycast       = THREE.Mesh.prototype.raycast.bind(mesh);
      }
    });
  }, [counts, sig, highlight, colorMode, shellOpacity, maxCount, regions]);

  const handlePointerMove = useCallback(e => {
    e.stopPropagation();
    const m = e.object?.name?.match(/^roi_(\d+)$/);
    if (!m) return;
    const id = parseInt(m[1]);
    setHighlight(id);
    const r = regions?.get(id);
    if (r) onHover?.({ ...r, count: counts?.[id - 1] ?? 0, isSig: sig?.[id - 1] === 1 }, e.clientX, e.clientY);
  }, [regions, counts, sig, onHover]);

  const handlePointerLeave = useCallback(() => {
    setHighlight(null);
    onHover?.(null);
  }, [onHover]);

  return (
    <group ref={groupRef} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}/>
  );
}

// Compact icon button for mode toolbar
function ModeBtn({ active, onClick, children, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2.5 py-1 font-mono text-[10px] rounded transition-colors ${
        active
          ? "bg-paper text-ink font-bold"
          : "text-paper/50 hover:text-paper/80 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

export default function BrainnetomeAtlas({
  counts,
  sig,
  regions,
  height = 500,
  numCohorts = 1,
}) {
  const [colorMode,    setColorMode]    = useState("count");   // "count" | "network"
  const [shellOpacity, setShellOpacity] = useState(0.22);
  const [tooltip,      setTooltip]      = useState(null);
  const containerRef = useRef(null);

  const handleHover = useCallback((data, clientX, clientY) => {
    if (!data) { setTooltip(null); return; }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ data, x: clientX - rect.left, y: clientY - rect.top });
  }, []);

  const maxCount = numCohorts > 1 ? numCohorts : (counts ? Math.max(1, ...counts) : 1);
  const sigCount = sig ? sig.filter(v => v === 1).length : 0;

  return (
    <div ref={containerRef} className="relative rounded-xl overflow-hidden" style={{ background: BG, height }}>
      <Canvas
        camera={{ position: [0, 30, 340], fov: 38 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: BG }}
      >
        {/* Scene lighting */}
        <ambientLight intensity={1.4}/>
        <directionalLight position={[300, 400, 200]} intensity={1.0} castShadow={false}/>
        <directionalLight position={[-200, 100, -300]} intensity={0.4}/>
        <hemisphereLight skyColor="#3A5A7A" groundColor="#1A2A3A" intensity={0.6}/>

        <Suspense fallback={null}>
          <AtlasScene
            counts={counts}
            sig={sig}
            regions={regions}
            onHover={handleHover}
            colorMode={colorMode}
            shellOpacity={shellOpacity}
            numCohorts={numCohorts}
          />
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={130}
          maxDistance={550}
          autoRotate
          autoRotateSpeed={0.5}
        />
        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport axisColors={["#C8312B","#5DAD43","#3A7EC6"]} labelColor="white"/>
        </GizmoHelper>
      </Canvas>

      {/* ── Top toolbar ── */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-3 pointer-events-none">
        {/* Sig badge */}
        <div className="bg-ink/70 backdrop-blur-sm rounded-lg px-3 py-1.5 pointer-events-auto">
          <span className="font-mono text-[11px] text-sig font-bold">{sigCount}</span>
          <span className="font-mono text-[11px] text-paper/60"> significant ROIs</span>
        </div>

        {/* Mode toggle */}
        <div className="bg-ink/70 backdrop-blur-sm rounded-lg flex pointer-events-auto">
          <ModeBtn active={colorMode === "count"}   onClick={() => setColorMode("count")}   title="Colour by count">Count</ModeBtn>
          <ModeBtn active={colorMode === "network"} onClick={() => setColorMode("network")} title="Colour by functional network">Network</ModeBtn>
        </div>

        {/* Instructions */}
        <div className="font-mono text-[10px] text-paper/30 text-right leading-relaxed select-none">
          drag to rotate<br/>scroll to zoom
        </div>
      </div>

      {/* ── Shell opacity slider ── */}
      <div className="absolute bottom-10 right-3 flex items-center gap-2 bg-ink/70 backdrop-blur-sm rounded-lg px-3 py-2 pointer-events-auto">
        <span className="font-mono text-[10px] text-paper/50 whitespace-nowrap">Shell</span>
        <input
          type="range"
          min={0}
          max={0.6}
          step={0.02}
          value={shellOpacity}
          onChange={e => setShellOpacity(parseFloat(e.target.value))}
          className="w-20 h-1 accent-sig cursor-pointer"
        />
        <span className="font-mono text-[10px] text-paper/40 w-7">{Math.round(shellOpacity * 100)}%</span>
      </div>

      {/* ── Legend ── */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        {colorMode === "count" ? (
          <div className="flex items-center gap-2 bg-ink/70 backdrop-blur-sm rounded-lg px-3 py-1.5">
            <span className="font-mono text-[10px] text-paper/50">{numCohorts > 1 ? "1 cohort" : "low"}</span>
            <div
              className="w-24 h-2 rounded-full"
              style={{ background: `linear-gradient(to right, ${sequentialColor(0.05)}, ${sequentialColor(0.5)}, ${sequentialColor(1)})` }}
            />
            <span className="font-mono text-[10px] text-paper/50">{numCohorts > 1 ? `${maxCount}` : "high"}</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 bg-ink/70 backdrop-blur-sm rounded-lg px-3 py-1.5 max-w-[420px]">
            {Object.entries(networkColors).filter(([k]) => k !== "NA" && k !== "Subcortical").map(([net, col]) => (
              <span key={net} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: col }}/>
                <span className="font-mono text-[9px] text-paper/70 whitespace-nowrap">{net}</span>
              </span>
            ))}
          </div>
        )}
        <div/>
      </div>

      {/* ── Hover tooltip ── */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 bg-ink/95 text-paper rounded-xl px-3.5 py-3 shadow-2xl backdrop-blur-sm"
          style={{
            left:     Math.min(tooltip.x + 14, (containerRef.current?.offsetWidth ?? 500) - 230),
            top:      Math.max(8, tooltip.y - 100),
            maxWidth: 225,
          }}
        >
          <p className="font-bold text-accent text-sm leading-tight">{tooltip.data.label}</p>
          <p className="text-paper/55 text-[11px] mt-0.5">{tooltip.data.subregion}</p>
          <hr className="border-white/10 my-2"/>
          <div className="space-y-1 text-[11px]">
            <p className="flex justify-between">
              <span className="text-paper/50">Network</span>
              <span
                className="px-2 py-0.5 rounded-full text-white text-[10px] font-bold"
                style={{ background: networkColors[tooltip.data.network7] ?? networkColors.NA }}
              >
                {tooltip.data.network7}
              </span>
            </p>
            <p className="flex justify-between">
              <span className="text-paper/50">Hemi</span>
              <span className="text-paper/80">{tooltip.data.hemi}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-paper/50">{numCohorts > 1 ? "Cohorts" : "Count"}</span>
              <span className="font-bold">{tooltip.data.count}{numCohorts > 1 ? ` / ${numCohorts}` : ""}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-paper/50">Significant</span>
              {tooltip.data.isSig
                ? <span className="text-sig font-bold">Yes ✓</span>
                : <span className="text-paper/30">No</span>
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
