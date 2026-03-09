/**
 * Idle brand color palette — Northglass monochrome.
 * No color accents. White is the only accent.
 * Values match live northglass.io (src/styles/global.css).
 */
export const idleBrandColors = {
  /** Primary background */
  black: '#0A0A0A',
  /** Elevated surfaces */
  elevated: '#111111',
  /** Secondary surfaces */
  surface: '#141414',
  /** Hover states */
  subtle: '#1A1A1A',
  /** Disabled backgrounds, subtle dividers */
  muted: '#1F1F1F',
  /** Card borders, input borders */
  border: '#2A2A2A',
  /** Primary text, headings, accent */
  white: '#FAFAFA',
  /** Body text */
  secondary: '#C0C0C0',
  /** Captions, timestamps */
  gray: '#888888',
  /** Disabled text */
  disabled: '#505050',
} as const;

export type IdleBrandColors = typeof idleBrandColors;
