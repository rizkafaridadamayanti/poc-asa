/** Small flat-style decorative illustrations, hand-drawn as inline SVG so the
 * dashboard doesn't depend on an external asset CDN. People are drawn as
 * solid navy silhouettes (no face/skin tone) to keep them abstract and avoid
 * any representation guesswork. Palette stays within the app's navy brand +
 * amber accent instead of introducing new hues. */

export function ChatIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
      <circle cx="128" cy="94" r="82" fill="#eaf0f7" />
      <circle cx="206" cy="34" r="9" fill="#fde3b8" />
      <circle cx="22" cy="138" r="6" fill="#d9e4f0" />
      <circle cx="38" cy="46" r="5" fill="#fde3b8" />

      {/* seated person silhouette, looking toward the phone */}
      <path d="M26 168 Q26 120 60 114 Q94 120 94 168 Z" fill="#1e3a5f" />
      <circle cx="60" cy="88" r="21" fill="#1e3a5f" />
      <path d="M78 138 Q104 132 114 110" stroke="#1e3a5f" strokeWidth="9" strokeLinecap="round" fill="none" />

      {/* phone with chat bubble */}
      <rect x="116" y="44" width="100" height="122" rx="20" fill="#ffffff" />
      <rect x="116" y="44" width="100" height="122" rx="20" stroke="#1e3a5f" strokeWidth="4" />
      <rect x="132" y="68" width="68" height="12" rx="6" fill="#1e3a5f" />
      <rect x="132" y="90" width="46" height="10" rx="5" fill="#c9d4e2" />
      <rect x="132" y="108" width="56" height="10" rx="5" fill="#c9d4e2" />
      <circle cx="168" cy="140" r="17" fill="#d97706" />
      <path
        d="M159 140 l6 6 l12 -13"
        stroke="#ffffff"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

export function BroadcastIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
      <circle cx="118" cy="94" r="82" fill="#fbeed7" />
      <circle cx="198" cy="132" r="8" fill="#d9e4f0" />
      <circle cx="28" cy="38" r="6" fill="#eaf0f7" />
      <circle cx="44" cy="132" r="5" fill="#eaf0f7" />

      {/* standing person silhouette, holding the megaphone up */}
      <path d="M42 168 Q42 122 74 120 Q106 122 106 168 Z" fill="#1e3a5f" />
      <circle cx="74" cy="96" r="19" fill="#1e3a5f" />
      <path d="M92 132 Q114 122 120 102" stroke="#1e3a5f" strokeWidth="9" strokeLinecap="round" fill="none" />

      {/* megaphone */}
      <rect x="114" y="96" width="30" height="22" rx="6" fill="#1e3a5f" />
      <path d="M144 90 L184 72 L184 136 L144 118 Z" fill="#1e3a5f" />
      <rect x="126" y="118" width="10" height="24" rx="5" fill="#1e3a5f" />
      <path d="M194 82 Q206 104 194 126" stroke="#d97706" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path
        d="M208 72 Q226 104 208 136"
        stroke="#d97706"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
    </svg>
  )
}
