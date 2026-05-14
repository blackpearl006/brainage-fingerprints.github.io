export default function GlassBrain({ src, alt, caption }) {
  return (
    <figure className="w-full">
      <img
        src={src}
        alt={alt}
        className="w-full rounded-lg border border-rule/20 bg-paper2"
        onError={e => { e.currentTarget.style.display = "none"; }}
      />
      {caption && (
        <figcaption className="mt-2 text-xs text-ink2 font-sans">{caption}</figcaption>
      )}
    </figure>
  );
}
