import { useState, lazy, Suspense } from "react";
import Section from "../components/Section";

const PreprocessingPipeline = lazy(() => import("../components/PreprocessingPipeline"));

const HEADLINE_STEPS = [
  "dcm2niix",
  "fslreorient2std",
  "N4BiasFieldCorrection",
  "robustfov",
  "bet2",
  "flirt 12-DOF · MNI152 2 mm",
  "fast",
  "WM-based intensity normalisation",
];

export default function Preprocessing() {
  const [open, setOpen] = useState(false);

  return (
    <Section
      eyebrow="Preprocessing"
      title="From raw scan to model input"
      lede="An 11-step FSL + ANTs pipeline turns each subject's raw T1-weighted MRI into a spatially-aligned, white-matter-normalised volume — the exact input the SFCN ensemble sees."
    >
      {/* Teaser — always visible */}
      <div className="bg-paper2 border border-rule/20 rounded-xl p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-[11px] text-ink2">
          {HEADLINE_STEPS.map((s, idx) => (
            <span key={s} className="flex items-center gap-2">
              <span className="px-2 py-1 rounded border border-rule/30 bg-paper text-ink">{s}</span>
              {idx < HEADLINE_STEPS.length - 1 && <span className="text-ink2/40">›</span>}
            </span>
          ))}
        </div>
        <p className="font-serif text-[15px] text-ink2 leading-relaxed mt-4">
          Each subject's T1w MRI is reoriented, bias-corrected with{" "}
          <span className="font-mono text-[13px] text-ink">N4 (ANTs 2.2.0)</span>, brain-extracted with{" "}
          <span className="font-mono text-[13px] text-ink">bet2 (f = 0.3)</span>, affinely registered to{" "}
          <span className="font-mono text-[13px] text-ink">MNI152 2 mm</span> via a 12-DOF{" "}
          <span className="font-mono text-[13px] text-ink">flirt</span>, then segmented with{" "}
          <span className="font-mono text-[13px] text-ink">fast</span>. Final intensity normalisation divides the volume by the subject's own mean white-matter intensity (PVE ≥ 0.9), producing a scanner-agnostic, biologically anchored input.
        </p>

        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className={[
            "mt-5 group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg border-2 transition-all font-mono text-xs uppercase tracking-widest",
            open
              ? "border-ink bg-ink text-paper"
              : "border-sig text-sig hover:bg-sig hover:text-paper shadow-sm shadow-sig/20",
          ].join(" ")}
        >
          <span
            className={[
              "inline-block transition-transform text-base leading-none",
              open ? "rotate-180" : "rotate-0",
            ].join(" ")}
          >
            ▾
          </span>
          {open ? "Hide interactive pipeline" : "Open interactive pipeline"}
          {!open && (
            <span className="font-sans text-[10px] normal-case tracking-normal opacity-70">
              · loads 3D viewer & volumes
            </span>
          )}
        </button>
      </div>

      {/* Lazy-loaded interactive pipeline */}
      {open && (
        <div className="mt-8 animate-fade-in">
          <Suspense fallback={
            <div className="h-[620px] rounded-xl bg-ink/5 border border-rule/20 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 rounded-full border-2 border-sig/40 border-t-sig animate-spin"/>
              <p className="font-mono text-[11px] text-ink2 tracking-widest">loading pipeline & volumes…</p>
            </div>
          }>
            <PreprocessingPipeline/>
          </Suspense>
        </div>
      )}
    </Section>
  );
}
