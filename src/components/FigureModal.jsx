import { useState, useEffect } from "react";

export default function FigureModal({ src, caption, label = "+ View figure" }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = e => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="font-mono text-xs text-accent underline underline-offset-2 hover:text-ink transition-colors"
      >
        {label}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-ink/70 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-w-4xl w-full bg-paper rounded-xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <img src={src} alt={caption} className="w-full rounded"/>
            {caption && (
              <p className="mt-3 text-sm text-ink2 font-sans">{caption}</p>
            )}
            <button
              onClick={() => setOpen(false)}
              className="mt-4 font-mono text-xs text-ink2 hover:text-ink"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
