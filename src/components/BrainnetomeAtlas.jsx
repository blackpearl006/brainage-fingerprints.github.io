import { Suspense, useRef, useState, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, GizmoHelper, GizmoViewport, Text } from "@react-three/drei";
import * as THREE from "three";
import { sequentialColor, palette, networkColors } from "../lib/theme";

useGLTF.preload(`${import.meta.env.BASE_URL}assets/meshes/atlas.glb`);

const BG = "#141E2D";

function makeStdMat(color) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: false,
    depthWrite: true,
  });
}

function makeShellMat(opacity) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color("#A8BFD4"),
    opacity,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });
}

// Axis orientation labels in world space
function OrientationLabels() {
  const LABELS = [
    { pos: [-165, 0, 0],  text: "L", color: "#C8312B" },
    { pos: [ 165, 0, 0],  text: "R", color: "#3A7EC6" },
    { pos: [0, 155, 0],   text: "S", color: "#888" },
    { pos: [0,-155, 0],   text: "I", color: "#888" },
    { pos: [0, 0,-165],   text: "A", color: "#888" },
    { pos: [0, 0, 165],   text: "P", color: "#888" },
  ];
  return (
    <>
      {LABELS.map(({ pos, text, color }) => (
        <Text
          key={text}
          position={pos}
          fontSize={11}
          color={color}
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
          font={undefined}
        >
          {text}
        </Text>
      ))}
    </>
  );
}

function AtlasScene({ counts, sig, regions, onHover, colorMode, shellOpacity, numCohorts }) {
  const { scene: gltfScene } = useGLTF(`${import.meta.env.BASE_URL}assets/meshes/atlas.glb`);
  const groupRef   = useRef(null);
  const meshMapRef = useRef({});
  const [highlight, setHighlight] = useState(null);

  const maxCount = numCohorts > 1 ? numCohorts : (counts ? Math.max(1, ...counts) : 1);

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
      meshMapRef.current[id] = {
        id,
        mesh: obj,
        stdMat:   makeStdMat("#ffffff"),
        shellMat: makeShellMat(shellOpacity),
      };
    });
    groupRef.current.add(clone);
  }, [gltfScene]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!counts) return;
    Object.values(meshMapRef.current).forEach(({ id, mesh, stdMat, shellMat }) => {
      const idx = id - 1;
      if (idx < 0 || idx >= 246) return;
      const count = counts[idx] ?? 0;
      const isSig = sig?.[idx] === 1;
      const isHov = id === highlight;

      if (!isSig) {
        shellMat.opacity = shellOpacity;
        mesh.material    = shellMat;
        mesh.renderOrder = 0;
        mesh.raycast     = () => {};
      } else {
        let hex;
        if (isHov) {
          hex = palette.accent;
        } else if (colorMode === "network") {
          const r = regions?.get(id);
          const net = (r?.our_network7 === "nan" ? r?.our_network20 : r?.our_network7);
          hex = networkColors[net] ?? networkColors.NA;
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

function ModeBtn({ active, onClick, children, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2.5 py-1 font-mono text-[10px] rounded transition-colors ${
        active ? "bg-paper text-ink font-bold" : "text-paper/50 hover:text-paper/80 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

export default function BrainnetomeAtlas({ counts, sig, regions, height = 500, numCohorts = 1, fullscreenAllowed = true }) {
  const [colorMode,    setColorMode]    = useState("count");
  const [shellOpacity, setShellOpacity] = useState(0.22);
  const [autoRotate,   setAutoRotate]   = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tooltip,      setTooltip]      = useState(null);
  const containerRef = useRef(null);
  const controlsRef  = useRef(null);

  // Track fullscreen changes (Esc key exits it)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  function toggleFullscreen() {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  const handleHover = useCallback((data, clientX, clientY) => {
    if (!data) { setTooltip(null); return; }
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ data, x: clientX - rect.left, y: clientY - rect.top });
  }, []);

  const maxCount = numCohorts > 1 ? numCohorts : (counts ? Math.max(1, ...counts) : 1);
  const sigCount = sig ? sig.filter(v => v === 1).length : 0;
  const effectiveHeight = isFullscreen ? "100vh" : height;

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl overflow-hidden select-none"
      style={{ background: BG, height: effectiveHeight }}
    >
      <Canvas
        camera={{ position: [0, 30, 340], fov: 38 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: BG, width: "100%", height: "100%" }}
      >
        <ambientLight intensity={1.4}/>
        <directionalLight position={[300, 400, 200]} intensity={1.0}/>
        <directionalLight position={[-200, 100, -300]} intensity={0.4}/>
        <hemisphereLight skyColor="#3A5A7A" groundColor="#1A2A3A" intensity={0.6}/>

        <Suspense fallback={null}>
          <AtlasScene
            counts={counts} sig={sig} regions={regions}
            onHover={handleHover} colorMode={colorMode}
            shellOpacity={shellOpacity} numCohorts={numCohorts}
          />
          <OrientationLabels/>
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          minDistance={130}
          maxDistance={550}
          autoRotate={autoRotate}
          autoRotateSpeed={1.2}
        />
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={["#C8312B","#5DAD43","#3A7EC6"]} labelColor="white"/>
        </GizmoHelper>
      </Canvas>

      {/* ── Top-left: sig count ── */}
      <div className="absolute top-3 left-3 bg-ink/70 backdrop-blur-sm rounded-lg px-3 py-1.5">
        <span className="font-mono text-[11px] text-sig font-bold">{sigCount}</span>
        <span className="font-mono text-[11px] text-paper/60"> sig. ROIs</span>
      </div>

      {/* ── Top-centre: mode toggle ── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-ink/70 backdrop-blur-sm rounded-lg flex">
        <ModeBtn active={colorMode === "count"}   onClick={() => setColorMode("count")}   title="Colour by count">Count</ModeBtn>
        <ModeBtn active={colorMode === "network"} onClick={() => setColorMode("network")} title="Colour by network">Network</ModeBtn>
      </div>

      {/* ── Top-right: fullscreen + instructions ── */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <span className="font-mono text-[10px] text-paper/25 text-right leading-relaxed hidden md:block">
          drag · scroll · pinch
        </span>
        {fullscreenAllowed && (
          <button
            onClick={toggleFullscreen}
            className="bg-ink/70 backdrop-blur-sm rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-paper/60 hover:text-paper transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? "⤡" : "⤢"}
          </button>
        )}
      </div>

      {/* ── Bottom controls row ── */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end gap-2">
        {/* Legend */}
        <div className="flex-1">
          {colorMode === "count" ? (
            <div className="inline-flex items-center gap-2 bg-ink/70 backdrop-blur-sm rounded-lg px-3 py-1.5">
              <span className="font-mono text-[10px] text-paper/40">{numCohorts > 1 ? "1 cohort" : "low"}</span>
              <div
                className="w-20 h-1.5 rounded-full"
                style={{ background: `linear-gradient(to right, ${sequentialColor(0.05)}, ${sequentialColor(0.5)}, ${sequentialColor(1)})` }}
              />
              <span className="font-mono text-[10px] text-paper/40">{numCohorts > 1 ? `${maxCount} cohorts` : "high"}</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 bg-ink/70 backdrop-blur-sm rounded-lg px-3 py-2 max-w-[420px]">
              {Object.entries(networkColors).filter(([k]) => k !== "NA").slice(0, 10).map(([net, col]) => (
                <span key={net} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: col }}/>
                  <span className="font-mono text-[9px] text-paper/60 whitespace-nowrap">{net}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Shell opacity */}
        <div className="flex items-center gap-2 bg-ink/70 backdrop-blur-sm rounded-lg px-3 py-2">
          <span className="font-mono text-[10px] text-paper/40">Shell</span>
          <input
            type="range" min={0} max={0.6} step={0.02}
            value={shellOpacity}
            onChange={e => setShellOpacity(parseFloat(e.target.value))}
            className="w-12 cursor-pointer"
            style={{ accentColor: "#C8312B" }}
          />
          <span className="font-mono text-[10px] text-paper/40 w-6 text-right">{Math.round(shellOpacity * 100)}%</span>
        </div>

        {/* Auto-rotate toggle */}
        <button
          onClick={() => setAutoRotate(r => !r)}
          className={`flex items-center gap-1.5 bg-ink/70 backdrop-blur-sm rounded-lg px-3 py-2 font-mono text-[10px] transition-colors ${
            autoRotate ? "text-accent" : "text-paper/40 hover:text-paper/70"
          }`}
          title="Toggle auto-rotate"
        >
          <span className={autoRotate ? "animate-spin inline-block" : "inline-block"} style={{ animationDuration: "3s" }}>⟳</span>
          <span>{autoRotate ? "Rotating" : "Rotate"}</span>
        </button>
      </div>

      {/* ── Hover tooltip ── */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden"
          style={{
            left:     Math.min(tooltip.x + 14, (containerRef.current?.offsetWidth ?? 500) - 240),
            top:      Math.max(8, tooltip.y - 130),
            minWidth: 220,
            background: "rgba(15, 23, 42, 0.96)",
            border:     "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Coloured network header strip */}
          <div
            className="px-4 py-2.5 flex items-center justify-between gap-3"
            style={{ background: (networkColors[tooltip.data.our_network7] ?? "#444") + "22" }}
          >
            <div className="flex-1 min-w-0">
              <p className="font-mono font-bold text-paper text-sm leading-tight truncate">
                {tooltip.data.label}
              </p>
              <p className="font-mono text-[10px] text-paper/50 mt-0.5 truncate">{tooltip.data.region}</p>
            </div>
            <span
              className="flex-shrink-0 px-2 py-0.5 rounded-full text-white text-[10px] font-bold font-sans whitespace-nowrap"
              style={{ background: networkColors[tooltip.data.our_network7 === "nan" ? tooltip.data.our_network20 : tooltip.data.our_network7] ?? networkColors.NA }}
            >
              {tooltip.data.our_network7 === "nan" ? tooltip.data.our_network20 : tooltip.data.our_network7}
            </span>
          </div>

          {/* Stats grid */}
          <div className="px-4 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-mono">
            <span className="text-paper/40">Hemisphere</span>
            <span className="text-paper/80">{tooltip.data.hemi === "L" ? "Left" : "Right"}</span>

            <span className="text-paper/40">{numCohorts > 1 ? "Cohorts" : "Count"}</span>
            <span className="font-bold text-paper">
              {tooltip.data.count}{numCohorts > 1 ? ` / ${numCohorts}` : ""}
            </span>

            <span className="text-paper/40">Significant</span>
            <span>{tooltip.data.isSig
              ? <span className="text-sig font-bold">Yes ✓</span>
              : <span className="text-paper/30">No</span>
            }</span>

            {tooltip.data.our_network20 && tooltip.data.our_network20 !== "nan" && tooltip.data.our_network20 !== tooltip.data.our_network7 && (
              <>
                <span className="text-paper/40">Sub-network</span>
                <span className="text-paper/60">{tooltip.data.our_network20}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
