import { lazy, Suspense } from "react";
import Section from "../components/Section";
import ReadMore from "../components/ReadMore";

const SFCNExplainer = lazy(() => import("../components/SFCNExplainer"));

const STEPS = [
  {
    n: "01",
    title: "T1-MRI preprocessing",
    body: "Brain-extracted, MNI152 2mm registered T1 volumes (91×109×91 voxels) from 8 cohorts. Harmonisation via site-aware pipelines without modifying signal intensities.",
  },
  {
    n: "02",
    title: "SFCN ensemble (100 models)",
    body: "Simple Fully Convolutional Network trained with 5-fold cross-validation × 20 repeats. LRD (Linear Regression Debiasing) applied post-hoc to correct age-bias in the brain-age gap.",
  },
  {
    n: "03",
    title: "Forward propagation",
    body: "Each preprocessed volume is passed through six 3D-convolution blocks (k=3, ×5 + k=1, ×1) interleaved with batch-norm, ReLU and max-pool. Adaptive average-pooling collapses the final 2×3×2×64 feature map to a 64-dim vector, then a 1×1×1 convolution head outputs the predicted age.",
  },
  {
    n: "04",
    title: "Ensemble averaging",
    body: "Predictions from all 100 models (5 folds × 20 repeats) are averaged per subject. The cohort-level signal — used downstream to rank anatomical regions — is built on this stabilised forward output rather than any single network run.",
  },
];

export default function Methods() {
  return (
    <Section
      eyebrow="Methods"
      title="Forward propagation"
      lede="How each preprocessed T1-MRI volume flows through the SFCN ensemble — from raw voxels to a single brain-age estimate, layer by layer."
    >
      <Suspense fallback={
        <div className="h-48 mt-6 rounded-xl bg-ink/5 border border-rule/20 flex items-center justify-center">
          <span className="font-mono text-xs text-ink2">Loading interactive diagram…</span>
        </div>
      }>
        <SFCNExplainer/>
      </Suspense>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {STEPS.map(s => (
          <div key={s.n} className="bg-paper2 rounded-xl p-5 border border-rule/20">
            <p className="font-mono text-xs text-ink2 mb-2">Step {s.n}</p>
            <h3 className="font-sans font-semibold text-ink mb-2 leading-snug">{s.title}</h3>
            <p className="font-serif text-sm text-ink2 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>

      <ReadMore>
        <div className="mt-8 grid md:grid-cols-2 gap-8 font-serif text-sm text-ink2 leading-relaxed">
          <div>
            <h4 className="font-sans font-semibold text-ink mb-2">Thresholding levels</h4>
            <p>
              The Playground exposes four thresholding levels (top 5%, 10%, 15%, 20%). The top-20% threshold is most permissive — maximising sensitivity to broadly relevant regions. Top-5% identifies only the strongest, most consistent contributors.
            </p>
          </div>
          <div>
            <h4 className="font-sans font-semibold text-ink mb-2">Significance criterion</h4>
            <p>
              A binomial test (one-tailed, FDR-corrected) compares observed ROI counts against the null hypothesis of uniform attribution across ROIs. Significant ROIs are marked with ✓ in the table and rendered in solid colour in the 3D viewer.
            </p>
          </div>
        </div>
      </ReadMore>
    </Section>
  );
}
