import Section from "../components/Section";

const LINKS = [
  { label: "Preprint",          href: "#", desc: "arXiv (coming soon)",                       icon: "📄" },
  { label: "GitHub",            href: "#", desc: "Training code + IG pipeline",               icon: "⌥" },
  { label: "Model Weights",     href: "#", desc: "Zenodo — 50 SFCN checkpoints",             icon: "⬇" },
  { label: "Processed Data",    href: "#", desc: "ROI attribution CSVs (Zenodo)",             icon: "📊" },
];

export default function Resources() {
  return (
    <Section
      id="resources"
      eyebrow="Resources"
      title="Data & Code"
      lede="All model weights, data, and analysis code will be released on acceptance. Pre-release access available on request."
    >
      <div className="grid sm:grid-cols-2 gap-4 mt-2">
        {LINKS.map(r => (
          <a
            key={r.label}
            href={r.href}
            className="flex items-center justify-between bg-paper2 rounded-xl p-5 border border-rule/20 hover:border-ink/30 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">{r.icon}</span>
              <div>
                <p className="font-sans font-semibold text-ink group-hover:text-sig transition-colors">
                  {r.label}
                </p>
                <p className="font-serif text-sm text-ink2 mt-0.5">{r.desc}</p>
              </div>
            </div>
            <span className="font-mono text-ink2 group-hover:text-ink transition-colors text-lg">→</span>
          </a>
        ))}
      </div>

      <div className="mt-8 bg-paper2 rounded-xl p-6 border border-rule/20">
        <p className="font-sans font-semibold text-ink mb-1">Citation</p>
        <pre className="font-mono text-xs text-ink2 whitespace-pre-wrap leading-relaxed bg-paper rounded-lg p-4 mt-2 border border-rule/20">
{`@article{aithal2026brainage,
  title   = {Explainable Brain-Age Fingerprints across
             Diverse Populations},
  author  = {Aithal, Ninad and others},
  journal = {TBD},
  year    = {2026}
}`}
        </pre>
      </div>
    </Section>
  );
}
