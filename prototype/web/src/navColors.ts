/** Single source of truth for the app's brand accent — used by the sidebar nav
 * and each page's header. The theme is eco-green as the brand identity; the
 * status colors (success/warning/danger) are reserved for status meaning
 * elsewhere, not used here — so every section shares the same primary green
 * instead of each page carrying its own hue. */
const PRIMARY = "var(--color-primary)"
const NEUTRAL = "var(--color-secondary)"

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
  pengingatAgenda: PRIMARY,
  spamAlerts: PRIMARY,
  antrianIde: PRIMARY,
} as const
