/**
 * Idle brand color palette.
 * Used for logo, marketing, and optional theme overrides.
 * App semantic colors live in theme.ts and reference these where appropriate.
 */
export const idleBrandColors = {
  /** Deep dark primary — replaced old teal #0D3B47 with ink */
  ink: '#0A0F1A',
  /** Warm accent — replaced old cyan #00C9B1 and amber #E8B84C */
  amber: '#C9A84C',
  /** Mid-tone neutral — replaced old slate600 #475569 */
  silver: '#8B949E',
  /** Light neutral — replaced old slate400 #94A3B8 */
  frost: '#C8D1DB',
  /** Light surface — replaced old paper #F8FAFC */
  glass: '#E8EDF2',
  white: '#FFFFFF',
} as const;

export type IdleBrandColors = typeof idleBrandColors;
