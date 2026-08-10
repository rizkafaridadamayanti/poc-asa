import { QRCodeSVG } from "qrcode.react"

export function QrModal({ qr, onClose }: { qr: string; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "0.75rem",
          maxWidth: "360px",
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 0.75rem" }}>Pair WhatsApp</h2>
        <p style={{ color: "var(--muted)", marginBottom: "1.25rem" }}>
          Open WhatsApp on your test phone → Settings → Linked Devices → Link a Device → scan this QR code.
        </p>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <QRCodeSVG value={qr} size={240} />
        </div>
        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
