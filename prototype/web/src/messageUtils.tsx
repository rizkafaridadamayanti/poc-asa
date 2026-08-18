export function truncateWords(text: string, maxWords = 8, maxChars = 60): string {
  const trimmed = text.trim()
  const words = trimmed.split(/\s+/).filter(Boolean)
  const byWords = words.length <= maxWords ? trimmed : `${words.slice(0, maxWords).join(" ")}…`
  // Guards against pathological input with no whitespace (e.g. a wall of
  // repeated characters), which word-splitting alone can't shorten.
  if (byWords.length <= maxChars) return byWords
  return `${byWords.slice(0, maxChars).trimEnd()}…`
}

export const MEDIA_TYPE_INFO: Record<string, { label: string; icon: string }> = {
  image: { label: "Foto", icon: "bi-image" },
  video: { label: "Video", icon: "bi-camera-video" },
  audio: { label: "Audio", icon: "bi-mic" },
  document: { label: "Dokumen", icon: "bi-file-earmark" },
}

export function MediaTypeBadge({ type }: { type: string }) {
  const info = MEDIA_TYPE_INFO[type]
  if (!info) return null
  return (
    <span className="badge chat-badge-media me-1">
      <i className={`bi ${info.icon} me-1`} />
      {info.label}
    </span>
  )
}
