import { Image as ImageIcon, Video, Mic, FileText, type LucideIcon } from "lucide-react"

export function truncateWords(text: string, maxWords = 8, maxChars = 60): string {
  const trimmed = text.trim()
  const words = trimmed.split(/\s+/).filter(Boolean)
  const byWords = words.length <= maxWords ? trimmed : `${words.slice(0, maxWords).join(" ")}…`
  // Guards against pathological input with no whitespace (e.g. a wall of
  // repeated characters), which word-splitting alone can't shorten.
  if (byWords.length <= maxChars) return byWords
  return `${byWords.slice(0, maxChars).trimEnd()}…`
}

export const MEDIA_TYPE_INFO: Record<string, { label: string; icon: LucideIcon; className: string }> = {
  image: { label: "Foto", icon: ImageIcon, className: "bg-blue-50 text-blue-700 border-blue-200" },
  video: { label: "Video", icon: Video, className: "bg-blue-50 text-blue-700 border-blue-200" },
  audio: { label: "Audio", icon: Mic, className: "bg-purple-50 text-purple-700 border-purple-200" },
  document: { label: "Dokumen", icon: FileText, className: "bg-amber-50 text-amber-700 border-amber-200" },
}

export function MediaTypeBadge({ type }: { type: string }) {
  const info = MEDIA_TYPE_INFO[type]
  if (!info) return null
  const Icon = info.icon
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 mr-1 ${info.className}`}
    >
      <Icon className="w-3 h-3" /> {info.label}
    </span>
  )
}
