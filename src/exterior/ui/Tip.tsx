import { useState } from "react";

/** Small "What is this?" tip: hover or tap the (?) to read it. */
export function Tip({ text }: { text?: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <span className="tip" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="tipbtn"
        aria-label="What is this?"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        ?
      </button>
      {open && <span className="tipbody">{text}</span>}
    </span>
  );
}
