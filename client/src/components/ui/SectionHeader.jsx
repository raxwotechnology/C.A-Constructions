export default function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="page-header relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-hero opacity-80 rounded-l-2xl" />
      <div>
        <h2 className="text-2xl font-bold text-primary font-heading">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-500 mt-1">{subtitle}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}
