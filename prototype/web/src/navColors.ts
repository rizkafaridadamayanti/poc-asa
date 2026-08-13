/** Single source of truth for the app's brand accent — used by the sidebar nav
 * and each page's header. The site sticks to a 3-color theme (indigo primary,
 * green success, red danger) plus neutral grays, so every section shares the
 * same indigo instead of each page carrying its own signature hue. */
const PRIMARY = "#4f46e5"
const NEUTRAL = "#64748b"

export const NAV_COLORS = {
  dashboard: PRIMARY,
  messages: PRIMARY,
  riwayat: NEUTRAL,
  summaries: PRIMARY,
  groups: PRIMARY,
  infografis: PRIMARY,
  digest: PRIMARY,
  informasiBaru: PRIMARY,
  qa: PRIMARY,
} as const
