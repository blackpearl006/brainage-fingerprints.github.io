import Section from "../components/Section";
import ReadMore from "../components/ReadMore";

const STEPS = [
  {
    n: "01",
    title: "T1-MRI preprocessing",
    body: "Brain-extracted, MNI152 2mm registered T1 volumes (91×109×91 voxels) from 8 cohorts. Harmonisation via site-aware pipelines without modifying signal intensities.",
  },
  {
    n: "02",
    title: "SFCN ensemble (100 models)",
    body: "Simple Fully Convolutional Network trained with 5-fold cross-validation × 20 random seeds. LRD (Linear Regression Debiasing) applied post-hoc to correct age-bias in the brain-age gap.",
  },
  {
    n: "03",
    title: "Integrated Gradients attribution",
    body: "IG attributes each voxel's contribution to the predicted brain age, using a zero-filled (black) baseline. Attributions are sign-preserved and averaged across the 100-model ensemble per subject.",
  },
  {
    n: "04",
    title: "ROI aggregation & binomial test",
    body: "Voxel attributions are summed within each of 246 Brainnetome ROIs and ranked per subject. An ROI is counted if it falls in the top-N% of a subject's attribution map. A binomial test determines whether the cohort-level count exceeds chance.",
  },
];

export default function Methods() {
  return (
    <Section
      eyebrow="Methods"
      title="Integrated Gradients pipeline"
      lede="A four-step pipeline attributes brain-age predictions to anatomical ROIs, producing statistically tested fingerprints per cohort and analysis configuration."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
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
