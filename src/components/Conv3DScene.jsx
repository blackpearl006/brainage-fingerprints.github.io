import { useRef, useState, useEffect, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// ── Constants ──────────────────────────────────────────────────────────────────
const VOXEL = 0.45;
const GAP   = 0.06;
const STEP  = VOXEL + GAP;
const VOXEL_THRESHOLD = 50;

// Stage-specific colour modes (t = intensity in [0,1])
// Tuned for visibility on the light paper background (#FAF7F2)
const COLOR_MODES = {
  input: (t) => [0.20 + t * 0.45, 0.25 + t * 0.40, 0.35 + t * 0.45], // muted slate-blue
  conv1: (t) => [0.78,            0.42 + t * 0.20, 0.10 + t * 0.10], // burnt amber
  conv2: (t) => [0.70 + t * 0.10, 0.30 + t * 0.20, 0.10 + t * 0.10], // burnt orange
  conv3: (t) => [0.40,            0.18 + t * 0.10, 0.55 + t * 0.20], // deep purple
  conv4: (t) => [0.75,            0.25 + t * 0.15, 0.45 + t * 0.20], // magenta/pink
  conv5: (t) => [0.12,            0.50 + t * 0.20, 0.65 + t * 0.20], // deep cyan
  conv6: (t) => [0.20,            0.50 + t * 0.20, 0.60 + t * 0.15], // teal
};

// ── Static voxel grid — set up once, never animates ──────────────────────────
function StaticVoxels({ data, shape, mode = "input", opacity = 0.62 }) {
  const meshRef = useRef();
  const count   = shape[0] * shape[1] * shape[2];
  const colorFn = COLOR_MODES[mode] ?? COLOR_MODES.input;

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let idx = 0;
    for (let x = 0; x < shape[0]; x++) {
      for (let y = 0; y < shape[1]; y++) {
        for (let z = 0; z < shape[2]; z++) {
          const v = data[idx];
          dummy.position.set(
            (x - shape[0] / 2 + 0.5) * STEP,
            (y - shape[1] / 2 + 0.5) * STEP,
            (z - shape[2] / 2 + 0.5) * STEP
          );
          dummy.scale.setScalar(v > VOXEL_THRESHOLD ? 1 : 0);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(idx, dummy.matrix);
          const t = v / 255;
          const [r, g, b] = colorFn(t);
          color.setRGB(r, g, b);
          meshRef.current.setColorAt(idx, color);
          idx++;
        }
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [data, shape, mode]);

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <boxGeometry args={[VOXEL, VOXEL, VOXEL]}/>
      <meshLambertMaterial transparent opacity={opacity}/>
    </instancedMesh>
  );
}

// ── Dynamic output volume — fills progressively as kernel sweeps ─────────────
function DynamicVoxels({ data, shape, mode, filledMaskRef, opacity = 0.92 }) {
  const meshRef = useRef();
  const count   = shape[0] * shape[1] * shape[2];
  const colorFn = COLOR_MODES[mode] ?? COLOR_MODES.input;
  const dummy   = useMemo(() => new THREE.Object3D(), []);
  const color   = useMemo(() => new THREE.Color(),    []);

  useFrame(() => {
    if (!meshRef.current || !filledMaskRef.current) return;
    let idx = 0;
    for (let x = 0; x < shape[0]; x++) {
      for (let y = 0; y < shape[1]; y++) {
        for (let z = 0; z < shape[2]; z++) {
          const v = data[idx];
          const filled  = filledMaskRef.current[idx];
          const visible = v > VOXEL_THRESHOLD && filled;
          dummy.position.set(
            (x - shape[0] / 2 + 0.5) * STEP,
            (y - shape[1] / 2 + 0.5) * STEP,
            (z - shape[2] / 2 + 0.5) * STEP
          );
          dummy.scale.setScalar(visible ? 1 : 0);
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(idx, dummy.matrix);
          const t = v / 255;
          const [r, g, b] = colorFn(t);
          color.setRGB(r, g, b);
          meshRef.current.setColorAt(idx, color);
          idx++;
        }
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <boxGeometry args={[VOXEL, VOXEL, VOXEL]}/>
      <meshLambertMaterial transparent opacity={opacity}/>
    </instancedMesh>
  );
}

// ── Wireframe bounding box ────────────────────────────────────────────────────
function BoundingBox({ shape, color = "#5A6478", opacity = 0.55 }) {
  const edges = useMemo(() => {
    const geom = new THREE.BoxGeometry(shape[0] * STEP, shape[1] * STEP, shape[2] * STEP);
    return new THREE.EdgesGeometry(geom);
  }, [shape]);
  return (
    <lineSegments geometry={edges}>
      <lineBasicMaterial color={color} transparent opacity={opacity}/>
    </lineSegments>
  );
}

// ── Orange 3D kernel highlight ────────────────────────────────────────────────
function KernelBox({ positionRef, kernelSize = 3 }) {
  const groupRef = useRef();
  const size = kernelSize * STEP;
  const fillGeom  = useMemo(() => new THREE.BoxGeometry(size, size, size), [size]);
  const edgesGeom = useMemo(() => new THREE.EdgesGeometry(fillGeom),       [fillGeom]);

  useFrame(({ clock }) => {
    if (!groupRef.current || !positionRef.current) return;
    const [x, y, z] = positionRef.current;
    groupRef.current.position.set(x, y, z);
    const s = 1 + 0.05 * Math.sin(clock.elapsedTime * 5);
    groupRef.current.scale.setScalar(s);
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={fillGeom}>
        <meshBasicMaterial color="#E89B2C" transparent opacity={0.32}/>
      </mesh>
      <lineSegments geometry={edgesGeom}>
        <lineBasicMaterial color="#B7700E"/>
      </lineSegments>
    </group>
  );
}

// ── Pulsing cursor at the active output voxel ────────────────────────────────
function OutputCursor({ positionRef }) {
  const ref  = useRef();
  const geom = useMemo(() => new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL), []);
  useFrame(({ clock }) => {
    if (!ref.current || !positionRef.current) return;
    const [x, y, z] = positionRef.current;
    ref.current.position.set(x, y, z);
    const s = 1.6 + 0.4 * Math.sin(clock.elapsedTime * 9);
    ref.current.scale.setScalar(s);
  });
  return (
    <mesh ref={ref} geometry={geom}>
      <meshBasicMaterial color="#C8312B" transparent opacity={0.92}/>
    </mesh>
  );
}

// ── Arrow / flow indicator between input and output volumes ─────────────────
function FlowArrow({ from, to }) {
  const points = useMemo(() => [
    new THREE.Vector3(...from),
    new THREE.Vector3(...to),
  ], [from, to]);
  const geom = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  return (
    <line geometry={geom}>
      <lineBasicMaterial color="#5A6478" transparent opacity={0.5}/>
    </line>
  );
}

// ── Forward-pass animation: kernel sweeps input → output fills voxel by voxel
function ConvAnimation({ inputData, inputShape, outputData, outputShape, mode, kernelSize = 3 }) {
  const kernelPosRef    = useRef([0, 0, 0]);
  const outputCursorRef = useRef([0, 0, 0]);
  const filledMaskRef   = useRef(new Array(outputShape[0] * outputShape[1] * outputShape[2]).fill(false));

  const totalOutput = outputShape[0] * outputShape[1] * outputShape[2];
  const scaleX = inputShape[0] / outputShape[0];
  const scaleY = inputShape[1] / outputShape[1];
  const scaleZ = inputShape[2] / outputShape[2];

  const SWEEP_DUR = 6.0;   // seconds for one forward sweep
  const PAUSE     = 2.0;   // hold at end before resetting
  const CYCLE     = SWEEP_DUR + PAUSE;

  useFrame(({ clock }) => {
    const t      = clock.elapsedTime;
    const phaseT = t % CYCLE;

    // Reset mask at the very start of each cycle
    if (phaseT < 0.05) {
      filledMaskRef.current = new Array(totalOutput).fill(false);
    }

    const progress = Math.min(1, phaseT / SWEEP_DUR);
    const currentIdx = Math.min(
      Math.floor(progress * totalOutput),
      totalOutput - 1
    );
    // Fill up to AND INCLUDING currentIdx so the cursor lights its own voxel
    for (let i = 0; i <= currentIdx; i++) filledMaskRef.current[i] = true;

    const ox = currentIdx % outputShape[0];
    const oy = Math.floor(currentIdx / outputShape[0]) % outputShape[1];
    const oz = Math.floor(currentIdx / (outputShape[0] * outputShape[1]));
    const ix = (ox + 0.5) * scaleX;
    const iy = (oy + 0.5) * scaleY;
    const iz = (oz + 0.5) * scaleZ;

    kernelPosRef.current = [
      (ix - inputShape[0] / 2) * STEP,
      (iy - inputShape[1] / 2) * STEP,
      (iz - inputShape[2] / 2) * STEP,
    ];
    outputCursorRef.current = [
      (ox - outputShape[0] / 2 + 0.5) * STEP,
      (oy - outputShape[1] / 2 + 0.5) * STEP,
      (oz - outputShape[2] / 2 + 0.5) * STEP,
    ];
  });

  const inputWidth  = inputShape[0]  * STEP;
  const outputWidth = outputShape[0] * STEP;
  const GAP_BTW     = 2.6;
  const inX  = -(inputWidth  / 2 + GAP_BTW / 2);
  const outX =  (outputWidth / 2 + GAP_BTW / 2);

  return (
    <>
      {/* Input volume */}
      <group position={[inX, 0, 0]}>
        <StaticVoxels data={inputData} shape={inputShape} mode="input"/>
        <BoundingBox  shape={inputShape}/>
        <KernelBox    positionRef={kernelPosRef} kernelSize={kernelSize}/>
      </group>

      {/* Flow arrow */}
      <FlowArrow
        from={[inX + inputWidth / 2 + 0.2, 0, 0]}
        to={[outX - outputWidth / 2 - 0.2, 0, 0]}
      />

      {/* Output volume */}
      <group position={[outX, 0, 0]}>
        <DynamicVoxels data={outputData} shape={outputShape} mode={mode}
                       filledMaskRef={filledMaskRef}/>
        <BoundingBox   shape={outputShape}/>
        <OutputCursor  positionRef={outputCursorRef}/>
      </group>
    </>
  );
}

// ── Single static volume (input stage) ────────────────────────────────────────
function StaticOnly({ data, shape, mode = "input" }) {
  return (
    <group>
      <StaticVoxels data={data} shape={shape} mode={mode} opacity={0.85}/>
      <BoundingBox  shape={shape}/>
    </group>
  );
}

// ── Auto-orbit camera ─────────────────────────────────────────────────────────
function SceneControls() {
  return (
    <OrbitControls
      enablePan={false}
      autoRotate
      autoRotateSpeed={0.45}
      minDistance={6}
      maxDistance={30}
      enableDamping
      dampingFactor={0.07}
    />
  );
}

// ── Main exported component ───────────────────────────────────────────────────
export default function Conv3DScene({ stage }) {
  const [voxels, setVoxels]     = useState({});
  const [loadErr, setLoadErr]   = useState(null);

  useEffect(() => {
    const stages = ["input", "conv1", "conv2", "conv3", "conv4", "conv5"];
    Promise.all(stages.map(s =>
      fetch(`${import.meta.env.BASE_URL}assets/features/voxels_${s}.json`)
        .then(r => {
          if (!r.ok) throw new Error(`Failed to load voxels_${s}.json`);
          return r.json();
        })
        .then(d => [s, d])
    ))
      .then(results => setVoxels(Object.fromEntries(results)))
      .catch(e => setLoadErr(e.message));
  }, []);

  // FCNetworkScene handles pool/age — bail safely
  if (stage === "pool" || stage === "age") return null;

  const mapping = {
    input: { in: "input", out: null,    mode: "input", k: 3 },
    conv1: { in: "input", out: "conv1", mode: "conv1", k: 3 },
    conv2: { in: "conv1", out: "conv2", mode: "conv2", k: 3 },
    conv3: { in: "conv2", out: "conv3", mode: "conv3", k: 3 },
    conv4: { in: "conv3", out: "conv4", mode: "conv4", k: 3 },
    conv5: { in: "conv4", out: "conv5", mode: "conv5", k: 3 },
    conv6: { in: "conv5", out: "conv5", mode: "conv6", k: 1 },
  };
  const cfg = mapping[stage] ?? mapping.input;

  if (loadErr) {
    return (
      <div className="h-full flex items-center justify-center text-red-500 font-mono text-xs px-6 text-center">
        Could not load 3D brain data: {loadErr}
      </div>
    );
  }

  const inVol  = cfg.in  ? voxels[cfg.in]  : null;
  const outVol = cfg.out ? voxels[cfg.out] : null;

  if (!inVol) {
    return (
      <div className="h-full flex items-center justify-center text-ink2 font-mono text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin"/>
          Loading 3D brain volumes…
        </div>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [10, 6, 13], fov: 42 }}
      style={{ background: "#FAF7F2" }}
      key={stage}
    >
      <ambientLight intensity={0.75}/>
      <directionalLight position={[8, 12, 8]}   intensity={0.65}/>
      <directionalLight position={[-8, -6, -4]} intensity={0.30}/>
      <hemisphereLight skyColor="#FAF7F2" groundColor="#D7D2C7" intensity={0.45}/>

      {outVol ? (
        <ConvAnimation
          inputData={inVol.data}   inputShape={inVol.shape}
          outputData={outVol.data} outputShape={outVol.shape}
          mode={cfg.mode}          kernelSize={cfg.k}
        />
      ) : (
        <StaticOnly data={inVol.data} shape={inVol.shape} mode={cfg.mode}/>
      )}

      <Suspense fallback={null}><SceneControls/></Suspense>
    </Canvas>
  );
}
