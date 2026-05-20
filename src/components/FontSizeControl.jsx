import { useEffect, useState } from "react";

const LEVELS = ["sm", "md", "lg", "xl"];
const STORAGE_KEY = "fontscale";

function applyScale(scale) {
  document.documentElement.setAttribute("data-fontscale", scale);
}

export default function FontSizeControl() {
  const [scale, setScale] = useState("md");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = LEVELS.includes(saved) ? saved : "md";
    setScale(initial);
    applyScale(initial);
  }, []);

  const update = (next) => {
    setScale(next);
    applyScale(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  };

  const idx = LEVELS.indexOf(scale);
  const dec = () => idx > 0 && update(LEVELS[idx - 1]);
  const inc = () => idx < LEVELS.length - 1 && update(LEVELS[idx + 1]);

  return (
    <div className="sticky top-0 z-40 bg-paper/85 backdrop-blur border-b border-rule/15">
      <div className="max-w-wide mx-auto px-6 py-2 flex items-center justify-end gap-3">
        <span className="font-mono text-[11px] uppercase tracking-widest text-ink2/70 hidden sm:inline">
          Text size
        </span>
        <div className="flex items-center rounded-lg border border-rule/30 bg-paper2 overflow-hidden">
          <button
            type="button"
            onClick={dec}
            disabled={idx === 0}
            aria-label="Decrease text size"
            className="font-sans px-2.5 py-1 text-sm text-ink2 hover:bg-paper hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            A−
          </button>
          <span
            aria-hidden="true"
            className="font-mono text-[10px] uppercase tracking-widest text-ink2/70 px-2 border-x border-rule/20"
          >
            {scale}
          </span>
          <button
            type="button"
            onClick={inc}
            disabled={idx === LEVELS.length - 1}
            aria-label="Increase text size"
            className="font-sans px-2.5 py-1 text-base font-semibold text-ink hover:bg-paper disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            A+
          </button>
        </div>
      </div>
    </div>
  );
}
