/** Single source of truth for the app's brand accent — used by the sidebar nav
 * and each page's header. The theme is green + white, matching the WhatsApp-bot
 * identity, plus red reserved for danger and neutral grays elsewhere — so every
 * section shares the same green instead of each page carrying its own hue. */
const PRIMARY = "#16a34a"
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
