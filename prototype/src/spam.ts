export type SpamCheckResult = { score: number; reasons: string[] }

export const SPAM_ALERT_THRESHOLD = 50

const LINK_RE = /(https?:\/\/|www\.)\S+/gi
// Matched against the whole text (not just LINK_RE hits) — shorteners are often shared bare, e.g. "bit.ly/klaim".
const SUSPICIOUS_DOMAIN_RE = /\b(bit\.ly|tinyurl\.com|linkr\.bio|s\.id|shorturl\.at|cutt\.ly|wa\.me)\/\S+/i
const MONEY_KEYWORDS =
  /\b(transfer|rekening|kirim\s*(uang|dana)|top\s*up|deposit|pinjaman|modal\s*kecil|untung\s*besar|gaji\s*harian|cepat\s*kaya)\b/i
const URGENCY_KEYWORDS = /\b(segera|batas\s*waktu|jangan\s*sampai|terbatas|hari\s*ini\s*juga|klaim\s*sekarang|buruan)\b/i
const PRIZE_KEYWORDS = /\b(menang|pemenang|hadiah|undian|selamat\s*anda|anda\s*terpilih)\b/i
const ACCOUNT_KEYWORDS =
  /\b(verifikasi\s*akun|akun\s*anda|diblokir|suspend|kode\s*otp|kode\s*rahasia|kata\s*sandi|password)\b/i

function capsRatio(text: string): number {
  const letters = text.replace(/[^a-zA-Z]/g, "")
  if (letters.length < 8) return 0
  const upper = letters.replace(/[^A-Z]/g, "")
  return upper.length / letters.length
}

/** Cheap regex/keyword heuristic — no LLM call, safe to run on every inbound message. */
export function checkSpam(text: string): SpamCheckResult {
  const reasons: string[] = []
  let score = 0

  const links = text.match(LINK_RE) || []
  if (links.length > 0) {
    score += 20
    reasons.push(`contains ${links.length} link(s)`)
  }
  if (SUSPICIOUS_DOMAIN_RE.test(text)) {
    score += 20
    reasons.push("shortened/suspicious link")
  }
  if (MONEY_KEYWORDS.test(text)) {
    score += 25
    reasons.push("money/transfer keywords")
  }
  if (PRIZE_KEYWORDS.test(text)) {
    score += 25
    reasons.push("prize/lottery keywords")
  }
  if (ACCOUNT_KEYWORDS.test(text)) {
    score += 20
    reasons.push("account/credential phishing keywords")
  }
  if (URGENCY_KEYWORDS.test(text)) {
    score += 10
    reasons.push("urgency language")
  }
  if (capsRatio(text) > 0.6) {
    score += 10
    reasons.push("excessive caps")
  }
  if ((text.match(/!/g) || []).length >= 3) {
    score += 5
    reasons.push("excessive exclamation marks")
  }

  return { score: Math.min(score, 100), reasons }
}
