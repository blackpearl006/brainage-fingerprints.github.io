export default function Section({ eyebrow, title, lede, children, id }) {
  return (
    <section id={id} className="max-w-wide mx-auto px-6 py-16">
      <div className="grid md:grid-cols-12 gap-6 mb-10">
        <div className="md:col-span-4">
          {eyebrow && (
            <p className="font-sans text-xs font-semibold tracking-widest uppercase text-ink2 mb-2">
              {eyebrow}
            </p>
          )}
          <h2 className="font-sans text-3xl font-bold text-ink leading-tight">{title}</h2>
        </div>
        {lede && (
          <p className="md:col-span-8 font-serif text-lg text-ink2 leading-relaxed self-end">
            {lede}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
