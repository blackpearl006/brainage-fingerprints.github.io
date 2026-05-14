import { useState } from "react";

export default function ReadMore({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className={open ? "" : "hidden md:block"}>{children}</div>
      <button
        onClick={() => setOpen(o => !o)}
        className="md:hidden mt-2 font-mono text-xs text-accent underline"
      >
        {open ? "− Show less" : "+ Read more"}
      </button>
    </div>
  );
}
