"use client";

import { useEffect, useState } from "react";
import { applyTheme, readThemePref, saveThemePref, type ThemePref } from "@/lib/theme";

const THEMES: { value: ThemePref; label: string }[] = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

interface Props {
  cardCount: number;
  longestStreak: number;
  signOutAction: () => Promise<void>;
}

/** The "⋯" menu in the header: theme, a couple of stats, and sign out. */
export default function HeaderMenu({ cardCount, longestStreak, signOutAction }: Props) {
  const [open, setOpen] = useState(false);
  // Starts as "system" on the server; the saved choice loads after mount.
  const [theme, setTheme] = useState<ThemePref>("system");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setTheme(readThemePref());
    // While on Auto, follow the device switching between light and dark.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readThemePref() === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`grid size-9 place-items-center rounded-full transition-colors ${
          open ? "bg-ink/10 text-ink" : "text-muted hover:bg-ink/5 hover:text-ink"
        }`}
      >
        <svg viewBox="0 0 20 20" className="size-5" fill="currentColor" aria-hidden>
          <circle cx="4.5" cy="10" r="1.6" />
          <circle cx="10" cy="10" r="1.6" />
          <circle cx="15.5" cy="10" r="1.6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="surface absolute top-11 right-0 z-40 w-64 p-2 shadow-xl dark:border-ink/10"
          >
            <div className="px-3 pt-2 pb-3">
              <p className="eyebrow mb-2">Theme</p>
              <div className="flex rounded-xl bg-ink/[0.05] p-1">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={theme === t.value}
                    onClick={() => {
                      setTheme(t.value);
                      saveThemePref(t.value);
                    }}
                    className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition-colors ${
                      theme === t.value
                        ? "bg-surface text-ink shadow-sm dark:bg-ink/15"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mx-3 flex justify-between border-t border-ink/5 py-3 text-sm">
              <span className="text-muted">Cards</span>
              <span className="font-semibold tabular-nums">{cardCount}</span>
            </div>
            <div className="mx-3 flex justify-between border-t border-ink/5 py-3 text-sm">
              <span className="text-muted">Longest streak</span>
              <span className="font-semibold tabular-nums">
                {longestStreak} {longestStreak === 1 ? "day" : "days"}
              </span>
            </div>

            <form action={signOutAction} className="border-t border-ink/5 pt-1">
              <button
                type="submit"
                role="menuitem"
                className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink-soft hover:bg-ink/5 hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
