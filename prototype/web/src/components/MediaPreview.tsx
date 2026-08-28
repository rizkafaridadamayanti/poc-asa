import { useEffect, useState } from "react"
import { Download } from "lucide-react"
import { api } from "../api.js"

export function MediaPreview({
  messageId,
  mediaType,
  mimetype,
}: {
  messageId: string
  mediaType: string
  mimetype: string | null
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    setUrl(null)
    setError(null)
    api
      .messageMediaBlob(messageId)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [messageId])

  if (error) return <p className="text-rose-600 text-sm mb-0">{error}</p>
  if (!url) return <p className="text-slate-400 text-sm mb-0">Memuat media…</p>

  if (mediaType === "image") {
    return <img src={url} alt="Lampiran" className="max-w-full rounded-xl" />
  }
  if (mediaType === "video") {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video src={url} controls className="w-full rounded-xl" />
    )
  }
  if (mediaType === "audio") {
    // eslint-disable-next-line jsx-a11y/media-has-caption
    return <audio src={url} controls className="w-full" />
  }
  return (
    <a
      href={url}
      download
      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
    >
      <Download className="w-3.5 h-3.5" />
      Unduh berkas{mimetype ? ` (${mimetype})` : ""}
    </a>
  )
}
