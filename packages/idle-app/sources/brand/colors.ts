/**
 * Idle brand color palette.
 * Used for logo, marketing, and optional theme overrides.
 * App semantic colors live in theme.ts and reference these where appropriate.
 */
export const idleBrandColors = {
  /** Dark primary (headers, dark surfaces) */
  teal: '#0D3B47',
  /** Accent: links, active states, "on" indicator */
  cyan: '#00C9B1',
  /** Optional highlight / secondary CTA */
  amber: '#E8B84C',
  /** Dark background alternative */
  slate900: '#0F172A',
  slate600: '#475569',
  slate400: '#94A3B8',
  paper: '#F8FAFC',
  white: '#FFFFFF',
} as const;

export type IdleBrandColors = typeof idleBrandColors;
