/** Small flat-style decorative illustrations, hand-drawn as inline SVG so the
 * dashboard doesn't depend on an external asset CDN. Palette stays within the
 * app's navy brand + amber accent instead of introducing new hues. */

export function ChatIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
      <circle cx="110" cy="92" r="78" fill="#eaf0f7" />
      <circle cx="182" cy="34" r="10" fill="#fde3b8" />
      <circle cx="26" cy="132" r="7" fill="#d9e4f0" />
      <rect x="46" y="46" width="112" height="88" rx="18" fill="#1e3a5f" />
      <rect x="62" y="66" width="80" height="10" rx="5" fill="#ffffff" fillOpacity="0.9" />
      <rect x="62" y="86" width="56" height="10" rx="5" fill="#ffffff" fillOpacity="0.55" />
      <path d="M70 134 L70 152 L92 134 Z" fill="#1e3a5f" />
      <circle cx="150" cy="110" r="20" fill="#d97706" />
      <path
        d="M141 110 l6 6 l12 -13"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

export function BroadcastIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
      <circle cx="110" cy="92" r="78" fill="#fbeed7" />
      <circle cx="184" cy="120" r="9" fill="#d9e4f0" />
      <circle cx="30" cy="46" r="6" fill="#eaf0f7" />
      <rect x="52" y="82" width="34" height="26" rx="6" fill="#1e3a5f" />
      <path d="M86 78 L134 58 L134 132 L86 112 Z" fill="#1e3a5f" />
      <rect x="66" y="108" width="12" height="28" rx="6" fill="#1e3a5f" />
      <path d="M148 70 Q160 95 148 120" stroke="#d97706" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M164 58 Q184 95 164 132" stroke="#d97706" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  )
}
