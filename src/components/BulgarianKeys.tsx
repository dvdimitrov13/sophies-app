"use client";

import { useState } from "react";

// Letters that are awkward to find on a desktop keyboard, most-used first.
const TRICKY = ["ю", "я", "ъ", "ь", "щ", "ш", "ч", "ж", "ц", "й"];

const ALPHABET = "абвгдежзийклмнопрстуфхцчшщъьюя".split("");

interface Props {
  onInsert: (letter: string) => void;
}

/**
 * Clickable Bulgarian letters for desktop. Hidden on touch screens, where the
 * phone's own Bulgarian keyboard is easier. Buttons use onMouseDown +
 * preventDefault so the text box keeps its focus and cursor position.
 */
export default function BulgarianKeys({ onInsert }: Props) {
  const [showAll, setShowAll] = useState(false);
  const letters = showAll ? ALPHABET : TRICKY;

  return (
    <div className="hidden flex-wrap items-center gap-1.5 pointer-fine:flex">
      {letters.map((letter) => (
        <button
          key={letter}
          type="button"
          tabIndex={-1}
          title={`Type ${letter}`}
          onMouseDown={(e) => {
            e.preventDefault();
            onInsert(letter);
          }}
          className="grid size-9 place-items-center rounded-xl border border-ink/10 bg-surface text-lg font-medium text-ink shadow-[inset_0_-2px_0_rgba(20,23,15,0.06)] transition-colors hover:border-lime-400 hover:bg-lime-100 active:bg-lime-300 dark:hover:bg-lime-400/15 dark:active:bg-lime-400/30"
        >
          {letter}
        </button>
      ))}
      <button
        type="button"
        tabIndex={-1}
        onMouseDown={(e) => {
          e.preventDefault();
          setShowAll((v) => !v);
        }}
        className="ml-1 rounded-xl px-2.5 py-2 text-xs font-semibold text-muted hover:bg-ink/5 hover:text-ink"
      >
        {showAll ? "Fewer letters" : "All letters"}
      </button>
    </div>
  );
}
