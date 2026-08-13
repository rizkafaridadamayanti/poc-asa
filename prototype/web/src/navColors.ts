/** Single source of truth for the app's brand accent — used by the sidebar nav
 * and each page's header. The theme is navy + white as the brand identity;
 * green/amber/red are reserved for status meaning (success/warning/danger)
 * elsewhere, not used here — so every section shares the same navy instead of
 * each page carrying its own hue. */
const PRIMARY = "#1e3a5f"
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
  pengingatAgenda: PRIMARY,
  spamAlerts: PRIMARY,
  antrianIde: PRIMARY,
} as const
