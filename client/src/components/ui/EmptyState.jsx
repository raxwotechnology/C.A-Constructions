export default function EmptyState({ title, description }) {
  return (
    <div className="card p-8 text-center">
      <h3 className="text-lg font-semibold text-primary font-heading">{title}</h3>
      {description ? <p className="text-sm text-slate-500 mt-2">{description}</p> : null}
    </div>
  )
}
