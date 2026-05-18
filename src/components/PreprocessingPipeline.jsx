import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";

const NiiVueViewer = lazy(() => import("./NiiVueViewer"));

const B = import.meta.env.BASE_URL;
const A = (p) => `${B}assets/preprocessing/${p}`;

const STAGES = [
  {
    n: "01",
    title: "Format conversion",
    short: "DICOM → NIfTI",
    tool: "dcm2niix · fslchfiletype",
    version: "dcm2niix v1.0.20240202",
    cmd: ["dcm2niix -z y -o out/ raw_dicom/", "fslchfiletype NIFTI_GZ input.hdr"],
    body: "Vendor DICOM stacks (or legacy ANALYZE 7.5) are consolidated into a single gzipped NIfTI-1 volume with a proper affine and orientation header. Universal entry point — every downstream FSL/ANTs tool consumes .nii.gz.",
    nifti: null,
    kind: "format",
  },
  {
    n: "02",
    title: "Reorient to standard",
    short: "Match MNI axes",
    tool: "fslreorient2std",
    body: "Axes are permuted/flipped so the volume matches the MNI standard radiological orientation (RAS+). Pure header & axis swap — no resampling, no interpolation, no loss of fidelity. The volume on display is the raw T1 already in standard orientation, with the face removed for privacy.",
    nifti: "raw.nii.gz",
    colormap: "gray",
  },
  {
    n: "03",
    title: "Bias field correction",
    short: "Remove RF shading",
    tool: "N4BiasFieldCorrection (ANTs)",
    version: "ANTs 2.2.0",
    body: "ANTs' N4 algorithm estimates the smooth, low-frequency intensity field caused by RF coil inhomogeneity and divides it out. After N4, the same tissue class has consistent intensity across the brain — a precondition for reliable segmentation.",
    nifti: "bias_corrected.nii.gz",
    colormap: "gray",
  },
  {
    n: "04",
    title: "Robust FOV crop",
    short: "Cut neck & shoulders",
    tool: "robustfov",
    version: "FSL 6.0.7.7 · brain size = 170 mm",
    cmd: ["robustfov -i bias_corrected.nii.gz \\", "          -r robust.nii.gz"],
    body: "Automatically detects the head and crops the lower head / neck / shoulders, retaining a 170 mm superior-inferior block. Shrinking the field of view stabilises brain extraction and registration in the next steps.",
    nifti: "robust.nii.gz",
    colormap: "gray",
  },
  {
    n: "05",
    title: "Brain extraction",
    short: "Skull stripping",
    tool: "bet2",
    version: "FSL 6.0.7.7 · fractional intensity = 0.3",
    cmd: ["bet2 robust.nii.gz brain.nii.gz -f 0.3"],
    body: "BET2 strips the skull, scalp, eyes and dura, keeping only brain tissue. A relatively low fractional intensity (f = 0.3) yields a generous mask that preserves cortical surface at the cost of leaving a small rim of non-brain — chosen to avoid trimming the cortex.",
    nifti: "brain.nii.gz",
    colormap: "gray",
  },
  {
    n: "06",
    title: "Affine registration",
    short: "12-DOF to MNI152 2 mm",
    tool: "flirt",
    version: "FSL 6.0.7.7 · trilinear interpolation",
    cmd: [
      "flirt -in brain.nii.gz \\",
      "      -ref $FSLDIR/data/standard/MNI152_T1_2mm_brain.nii.gz \\",
      "      -dof 12 -interp trilinear \\",
      "      -out linreg_12dof_2mm.nii.gz",
    ],
    body: "A 12-DOF affine (3 translation + 3 rotation + 3 scale + 3 shear) aligns each brain to the MNI152 2 mm template, normalising overall brain size and shape. Trilinear interpolation preserves a smooth intensity histogram, which the SFCN needs at input.",
    nifti: "linreg_12dof_2mm.nii.gz",
    colormap: "gray",
  },
  {
    n: "07",
    title: "Tissue segmentation",
    short: "CSF · GM · WM",
    tool: "fast",
    version: "FSL 6.0.7.7 · T1, 3 classes",
    cmd: ["fast -n 3 -t 1 linreg_12dof_2mm.nii.gz"],
    body: "FAST estimates the probability of each voxel belonging to CSF, grey matter or white matter, producing three partial-volume estimation maps (pve_0, pve_1, pve_2) plus a hard segmentation. These maps are the substrate for WM-based intensity normalisation. The viewer shows the hard segmentation (pveseg).",
    nifti: "seg_pveseg.nii.gz",
    colormap: "actc",
  },
  {
    n: "08",
    title: "White-matter mask",
    short: "PVE_WM ≥ 0.9",
    tool: "fslmaths",
    version: "FSL 6.0.7.7",
    cmd: ["fslmaths fast_pve_2.nii.gz \\", "        -thr 0.9 -bin wm_mask.nii.gz"],
    body: "Voxels with P(WM) ≥ 0.9 are kept as a binary mask. The aggressive 0.9 threshold yields a conservative, high-purity white-matter region — fewer voxels, but voxels that are confidently WM. The viewer shows the mask in red over the registered T1.",
    nifti: "linreg_12dof_2mm.nii.gz",
    overlay: "wm_mask.nii.gz",
    colormap: "gray",
    overlayColormap: "red",
  },
  {
    n: "09",
    title: "WM regions × T1",
    short: "Isolate WM intensities",
    tool: "fslmaths",
    version: "FSL 6.0.7.7",
    cmd: ["fslmaths linreg_12dof_2mm.nii.gz \\", "        -mul wm_mask.nii.gz wm_t1.nii.gz"],
    body: "Element-wise multiplication of the WM mask with the (registered) T1 image, zeroing everything outside white matter. The corpus callosum and deep cerebral WM are clearly retained.",
    nifti: "wm_t1.nii.gz",
    colormap: "gray",
  },
  {
    n: "10",
    title: "Mean WM intensity",
    short: "Subject-specific reference",
    tool: "fslstats",
    version: "FSL 6.0.7.7",
    cmd: ["WM_MEAN=$(fslstats wm_t1.nii.gz -M)"],
    body: "fslstats computes the mean intensity inside the WM-masked region. This single scalar — tied to a biologically defined tissue type — becomes the subject's own intensity reference, sidestepping arbitrary global rescaling.",
    nifti: null,
    kind: "stat",
  },
  {
    n: "11",
    title: "Normalised T1w",
    short: "÷ mean WM intensity",
    tool: "fslmaths",
    version: "FSL 6.0.7.7",
    cmd: ["fslmaths linreg_12dof_2mm.nii.gz \\", "        -div $WM_MEAN normalised.nii.gz"],
    body: "Final step: every voxel is expressed as a ratio relative to the subject's own mean WM intensity. The output is comparable across subjects and scanners without assuming a specific intensity distribution — and is the volume fed into the SFCN ensemble.",
    nifti: "normalised.nii.gz",
    colormap: "gray",
    final: true,
  },
];

function FormatPane({ height }) {
  return (
    <div className="bg-ink rounded-xl border border-rule/30 flex items-center justify-center" style={{ height }}>
      <div className="flex items-center gap-12 font-mono text-paper/85">
        <div className="text-center">
          <p className="text-xs text-paper/40 uppercase tracking-widest">input</p>
          <p className="text-4xl mt-3">.dcm</p>
          <p className="text-sm text-paper/40 mt-2">.hdr / .img</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-px w-24 bg-accent/40"/>
          <span className="text-accent text-3xl">→</span>
        </div>
        <div className="text-center px-8 py-6 border border-accent/50 rounded-lg bg-accent/5">
          <p className="text-xs text-accent/80 uppercase tracking-widest">output</p>
          <p className="text-4xl mt-3 text-accent">.nii.gz</p>
          <p className="text-sm text-paper/50 mt-2">single 3D volume</p>
        </div>
      </div>
    </div>
  );
}

function StatPane({ height }) {
  return (
    <div className="bg-ink rounded-xl border border-rule/30 relative overflow-hidden flex flex-col items-center justify-center" style={{ height }}>
      <div className="absolute inset-0 opacity-[0.06]"
           style={{
             backgroundImage: "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
             backgroundSize: "48px 48px",
           }}/>
      <p className="font-mono text-xs text-paper/40 uppercase tracking-widest">fslstats output</p>
      <p className="font-sans font-bold text-accent tabular-nums mt-2 leading-none"
         style={{ fontSize: Math.min(height * 0.4, 220) }}>
        μ<sub className="text-[0.4em]">WM</sub>
      </p>
      <p className="font-mono text-sm text-paper/70 mt-8">mean intensity · white matter</p>
      <p className="font-mono text-xs text-paper/40 mt-2">→ subject-specific reference value</p>
    </div>
  );
}

function StagePane({ stage, height }) {
  if (stage.kind === "format") return <FormatPane height={height}/>;
  if (stage.kind === "stat")   return <StatPane height={height}/>;
  return (
    <Suspense fallback={
      <div className="bg-ink rounded-xl border border-rule/30 flex items-center justify-center" style={{ height }}>
        <p className="font-mono text-[11px] text-paper/60 tracking-widest">loading viewer…</p>
      </div>
    }>
      <NiiVueViewer
        url={A(stage.nifti)}
        overlay={stage.overlay ? A(stage.overlay) : undefined}
        colormap={stage.colormap}
        overlayColormap={stage.overlayColormap}
        height={height}
      />
    </Suspense>
  );
}

function NavButton({ direction, stage, onClick, disabled }) {
  const isPrev = direction === "prev";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "group flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border transition-all",
        "border-rule/30 hover:border-ink hover:bg-ink hover:text-paper",
        "disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-current disabled:hover:border-rule/30",
        isPrev ? "text-left" : "text-right flex-row-reverse",
      ].join(" ")}
    >
      <span className={[
        "font-mono text-lg transition-transform",
        !disabled && (isPrev ? "group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5"),
      ].join(" ")}>
        {isPrev ? "←" : "→"}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-mono text-[10px] uppercase tracking-widest text-ink2/70 group-hover:text-paper/60">
          {isPrev ? "previous" : "next"}
        </span>
        <span className="block font-sans text-sm font-semibold truncate">
          {stage ? stage.title : "—"}
        </span>
      </span>
    </button>
  );
}

export default function PreprocessingPipeline() {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const stage = STAGES[i];
  const prevStage = i > 0 ? STAGES[i - 1] : null;
  const nextStage = i < STAGES.length - 1 ? STAGES[i + 1] : null;
  const timerRef = useRef(null);

  const next = useCallback(() => setI(v => Math.min(STAGES.length - 1, v + 1)), []);
  const prev = useCallback(() => setI(v => Math.max(0, v - 1)), []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target?.tagName === "INPUT" || e.target?.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  useEffect(() => {
    if (!playing) return;
    timerRef.current = setInterval(() => {
      setI(v => {
        if (v >= STAGES.length - 1) { setPlaying(false); return v; }
        return v + 1;
      });
    }, 3200);
    return () => clearInterval(timerRef.current);
  }, [playing]);

  return (
    <div>
      {/* Step rail (full width) */}
      <div className="relative mt-2 mb-6">
        <div className="absolute left-0 right-0 top-4 h-px bg-rule/20"/>
        <ol className="relative flex flex-wrap gap-1.5 justify-between">
          {STAGES.map((s, idx) => {
            const active = idx === i;
            const done = idx < i;
            return (
              <li key={s.n}>
                <button
                  onClick={() => { setPlaying(false); setI(idx); }}
                  title={s.title}
                  className={[
                    "group flex flex-col items-center gap-1 px-1 py-1 transition-all",
                    active ? "scale-110" : "opacity-60 hover:opacity-100",
                  ].join(" ")}
                >
                  <span className={[
                    "w-9 h-9 rounded-full font-mono text-[11px] flex items-center justify-center border-2 transition-all",
                    active ? "bg-sig text-paper border-sig shadow-lg shadow-sig/30"
                           : done ? "bg-ink text-paper border-ink"
                                  : "bg-paper text-ink2 border-rule/40 group-hover:border-ink",
                  ].join(" ")}>
                    {s.n}
                  </span>
                  <span className={[
                    "font-mono text-[9px] uppercase tracking-wider max-w-[80px] text-center leading-tight transition-colors",
                    active ? "text-sig font-semibold" : "text-ink2",
                  ].join(" ")}>
                    {s.short}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Full-width viewer — same height across every stage */}
      <StagePane stage={stage} height={460}/>
      <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-ink2 gap-4">
        <span className="truncate">{stage.nifti ? `volume · ${stage.nifti}` : `schematic · ${stage.short.toLowerCase()}`}</span>
        <span className="hidden md:inline font-sans text-[11px] text-ink2/70">
          {stage.nifti ? "drag · scroll · click crosshair — switch planes top-right" : ""}
        </span>
        <span className="whitespace-nowrap">stage {i + 1} of {STAGES.length}</span>
      </div>

      {/* Info (below the viewer) — code blocks removed */}
      <div className="grid gap-4 mt-6 md:grid-cols-1">
        <div className="bg-paper2 border border-rule/20 rounded-xl p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-xs text-ink2">
              Step {stage.n}{stage.final && <span className="text-sig"> · final output</span>}
            </p>
            {stage.version && (
              <p className="font-mono text-[10px] text-ink2/70 truncate ml-2">{stage.version}</p>
            )}
          </div>
          <h3 className="font-sans font-semibold text-ink text-2xl mt-1 leading-snug">{stage.title}</h3>
          <p className="font-mono text-[11px] text-sig mt-1">{stage.tool}</p>
          <p className="font-serif text-[15px] text-ink2 leading-relaxed mt-4">{stage.body}</p>
        </div>
      </div>

      {/* Nav row */}
      <div className="flex items-stretch gap-2 mt-6 max-w-3xl mx-auto">
        <NavButton direction="prev" stage={prevStage} onClick={() => { setPlaying(false); prev(); }} disabled={i === 0}/>
        <button
          onClick={() => setPlaying(p => !p)}
          title={playing ? "pause auto-advance" : "auto-advance through stages"}
          className={[
            "w-14 flex items-center justify-center rounded-lg border transition-all",
            playing
              ? "bg-sig text-paper border-sig hover:bg-sig/90"
              : "border-rule/30 text-ink2 hover:border-ink hover:text-ink",
          ].join(" ")}
        >
          <span className="font-mono text-sm">{playing ? "❚❚" : "▶"}</span>
        </button>
        <NavButton direction="next" stage={nextStage} onClick={() => { setPlaying(false); next(); }} disabled={i === STAGES.length - 1}/>
      </div>
      <p className="font-mono text-[10px] text-ink2/50 text-center mt-2">
        use <kbd className="px-1 py-0.5 rounded border border-rule/30 text-ink2">←</kbd>
        {" "}<kbd className="px-1 py-0.5 rounded border border-rule/30 text-ink2">→</kbd> to navigate ·
        click <kbd className="px-1 py-0.5 rounded border border-rule/30 text-ink2">▶</kbd> to auto-play
      </p>

      {/* Pipeline at a glance */}
      <div className="mt-10 pt-6 border-t border-rule/20">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink2 mb-3">Pipeline at a glance</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-[11px]">
          {STAGES.map((s, idx) => (
            <span key={s.n} className="flex items-center gap-2">
              <button
                onClick={() => { setPlaying(false); setI(idx); }}
                className={[
                  "px-2 py-1 rounded border transition-colors",
                  idx === i ? "border-sig text-sig bg-sig/5"
                            : "border-rule/30 text-ink2 hover:text-ink hover:border-ink",
                ].join(" ")}
              >
                <span className="text-ink2/60 mr-1.5">{s.n}</span>
                {s.tool.split(" ")[0]}
              </button>
              {idx < STAGES.length - 1 && <span className="text-ink2/40">›</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
