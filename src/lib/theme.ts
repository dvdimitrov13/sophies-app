/**
 * Light / dark theme. The choice is saved per device in localStorage, so a
 * phone and a laptop can differ. "system" follows the device setting.
 */

export type ThemePref = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

export function readThemePref(): ThemePref {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Storage can be unavailable (private mode); fall back to the device.
  }
  return "system";
}

export function applyTheme(pref: ThemePref) {
  const dark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function saveThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Ignore: the theme still applies for this visit.
  }
  applyTheme(pref);
}

/** Runs before the page paints, so it never flashes the wrong theme. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
