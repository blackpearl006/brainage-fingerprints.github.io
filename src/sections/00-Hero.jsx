export default function Hero() {
  return (
    <header className="max-w-wide mx-auto px-6 pt-20 pb-14">
      <p className="font-mono text-xs text-ink2 uppercase tracking-widest mb-4">
        Brain Age · Integrated Gradients · Brainnetome Atlas
      </p>
      <h1 className="font-sans text-5xl md:text-6xl font-bold text-ink leading-[1.1] max-w-[22ch]">
        Explainable Brain-Age<br/>
        <span className="text-sig">Fingerprints</span>
      </h1>
      <p className="mt-6 font-serif text-xl text-ink2 max-w-[58ch] leading-relaxed">
        Uncovering universal and population-specific patterns of brain ageing across
        3,569 individuals and 8 cohorts — made interpretable with Integrated Gradients.
      </p>
      <div className="flex flex-wrap gap-3 mt-8">
        <a
          href="#playground"
          className="font-mono text-sm bg-ink text-paper px-6 py-2.5 rounded-lg hover:bg-rule transition-colors"
        >
          Explore Fingerprints →
        </a>
        <a
          href="#resources"
          className="font-mono text-sm border border-rule/40 text-ink2 px-6 py-2.5 rounded-lg hover:text-ink hover:border-ink/60 transition-colors"
        >
          Paper & Code
        </a>
      </div>

      {/* Cohort chips */}
      <div className="flex flex-wrap gap-2 mt-10">
        {["ADNI","OASIS3","MAYO","CAMCAN","SALD","SRPBS","BrainLat","ABIL"].map(c => (
          <span key={c} className="font-mono text-[11px] px-2.5 py-1 rounded-full border border-rule/30 text-ink2 bg-paper2">
            {c}
          </span>
        ))}
        <span className="font-mono text-[11px] px-2.5 py-1 rounded-full bg-ink text-paper">
          8 cohorts · 4 continents
        </span>
      </div>
    </header>
  );
}
