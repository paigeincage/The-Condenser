// Accent-color palette for the user-changeable action color (Settings).
// "maroon" is the app default — it maps to the theme-aware tokens in index.css,
// so we DON'T override anything for it. Every other option overrides the
// --accent family so buttons, chips, icons, and highlights recolor cohesively.

export interface AccentDef {
  id: string;
  label: string;
  base: string;   // --accent
  hover: string;  // --accent-hover
  deep: string;   // --accent-deep
  soft: string;   // --accent-soft (brighter, used for chip text on dark)
}

export const ACCENTS: AccentDef[] = [
  { id: 'maroon', label: 'Maroon', base: '#8B1429', hover: '#A81D37', deep: '#6B0C1F', soft: '#C93D54' },
  { id: 'cobalt', label: 'Cobalt', base: '#2563EB', hover: '#1D4ED8', deep: '#1E40AF', soft: '#60A5FA' },
  { id: 'emerald', label: 'Emerald', base: '#059669', hover: '#047857', deep: '#065F46', soft: '#34D399' },
  { id: 'violet', label: 'Violet', base: '#7C3AED', hover: '#6D28D9', deep: '#5B21B6', soft: '#A78BFA' },
  { id: 'orange', label: 'Orange', base: '#EA580C', hover: '#C2410C', deep: '#9A3412', soft: '#FB923C' },
  { id: 'slate', label: 'Slate', base: '#475569', hover: '#334155', deep: '#1E293B', soft: '#94A3B8' },
];

export const DEFAULT_ACCENT = 'maroon';

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// The --accent family properties this feature controls.
const ACCENT_VARS = [
  '--accent', '--accent-hover', '--accent-deep', '--accent-soft',
  '--accent-tint', '--accent-tint-2', '--accent-glow',
] as const;

/** Apply (or clear) the chosen accent on <html>. Passing 'maroon'/undefined clears overrides. */
export function applyAccent(id: string | undefined): void {
  const html = document.documentElement;
  const def = ACCENTS.find((a) => a.id === id);

  if (!def || def.id === DEFAULT_ACCENT) {
    // Fall back to the theme-aware tokens from index.css.
    for (const v of ACCENT_VARS) html.style.removeProperty(v);
    return;
  }

  html.style.setProperty('--accent', def.base);
  html.style.setProperty('--accent-hover', def.hover);
  html.style.setProperty('--accent-deep', def.deep);
  html.style.setProperty('--accent-soft', def.soft);
  html.style.setProperty('--accent-tint', hexToRgba(def.base, 0.1));
  html.style.setProperty('--accent-tint-2', hexToRgba(def.base, 0.18));
  html.style.setProperty('--accent-glow', hexToRgba(def.hover, 0.3));
}
