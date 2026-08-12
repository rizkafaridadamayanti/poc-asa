import { useEffect, useState } from "react"
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

  if (error) return <p className="text-danger small mb-0">{error}</p>
  if (!url) return <p className="text-muted small mb-0">Memuat media…</p>

  if (mediaType === "image") {
    return <img src={url} alt="Lampiran" className="img-fluid rounded" />
  }
  if (mediaType === "video") {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video src={url} controls className="w-100 rounded" />
    )
  }
  if (mediaType === "audio") {
    // eslint-disable-next-line jsx-a11y/media-has-caption
    return <audio src={url} controls className="w-100" />
  }
  return (
    <a href={url} download className="btn btn-outline-secondary btn-sm">
      <i className="bi bi-download me-1" />
      Unduh berkas{mimetype ? ` (${mimetype})` : ""}
    </a>
  )
}
