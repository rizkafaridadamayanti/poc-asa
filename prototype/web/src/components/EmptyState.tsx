export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <i className={`bi ${icon}`} />
      </span>
      <p className="empty-state-text mb-0">{text}</p>
    </div>
  )
}
