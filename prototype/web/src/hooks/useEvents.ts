import { useEffect, useRef, useState } from "react"

export type WaDevice = { id: string; name: string | null; platform: string | null }

export type SseEvent =
  | { type: "qr"; qr: string }
  | { type: "connection"; connected: boolean; reason?: string; device?: WaDevice | null }
  | { type: "inbound"; message: Record<string, unknown> }

export function useEvents() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [disconnectReason, setDisconnectReason] = useState<string | null>(null)
  const [device, setDevice] = useState<WaDevice | null>(null)
  const [lastInbound, setLastInbound] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource("/api/events")
    esRef.current = es

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SseEvent
        if (data.type === "connection") {
          setConnected(data.connected)
          if (data.connected) {
            setQr(null)
            setDisconnectReason(null)
            setDevice(data.device ?? null)
          } else {
            setDisconnectReason(data.reason ?? null)
            setDevice(null)
          }
        } else if (data.type === "qr") {
          setQr(data.qr)
        } else if (data.type === "inbound") {
          setLastInbound(data.message)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    }

    es.onerror = () => {
      setError("Event stream disconnected. Retrying…")
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [])

  const dismissQr = () => setQr(null)

  return { connected, qr, disconnectReason, device, lastInbound, error, dismissQr }
}
