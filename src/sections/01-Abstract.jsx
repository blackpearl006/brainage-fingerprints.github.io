import Section from "../components/Section";

const STATS = [
  { stat: "3,569", label: "participants",      detail: "8 cohorts · 4 continents" },
  { stat: "246",   label: "brain ROIs",        detail: "Brainnetome atlas, whole-brain" },
  { stat: "26",    label: "Universal ROIs",     detail: "significant in all 8 cohorts" },
  { stat: "100",   label: "SFCN models",       detail: "5 folds × 20 repeats ensemble" },
];

export default function Abstract() {
  return (
    <Section
      eyebrow="Study"
      title="What we found"
      lede="Twenty-six Universal ROIs emerge as consistent brain-age predictors across all 8 cohorts. Population-specific patterns reveal distinct ageing signatures, with marked differences in East Asian and Latin American brains when trained on Caucasian-only data."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        {STATS.map(s => (
          <div key={s.stat} className="bg-paper2 rounded-xl p-6 border border-rule/20">
            <p className="font-sans text-4xl font-bold text-sig tabular-nums">{s.stat}</p>
            <p className="font-sans text-sm font-semibold text-ink mt-1">{s.label}</p>
            <p className="font-serif text-sm text-ink2 mt-1 leading-snug">{s.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8 mt-10 font-serif text-base text-ink2 leading-relaxed">
        <div>
          <h3 className="font-sans font-semibold text-ink text-lg mb-2">Cross-sectional fingerprints</h3>
          <p>
            Using Integrated Gradients on an ensemble of 100 SFCN models, we identify which Brainnetome ROIs most strongly influence brain-age predictions per subject, then aggregate across subjects within each cohort to produce cohort-specific fingerprints.
          </p>
        </div>
        <div>
          <h3 className="font-sans font-semibold text-ink text-lg mb-2">Population generalisation</h3>
          <p>
            Models trained exclusively on Caucasian cohorts show substantial MAE degradation on East Asian (SRPBS) and Latin American (BrainLat) test sets, while models trained on diverse data achieve consistent performance — highlighting the importance of multi-population training.
          </p>
        </div>
      </div>
    </Section>
  );
}
