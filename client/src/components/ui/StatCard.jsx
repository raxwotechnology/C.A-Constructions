import { motion } from 'framer-motion'

export default function StatCard({ title, value, subtitle, icon: Icon, tone = 'navy', index = 0 }) {
  const toneClass = {
    navy: 'kpi-navy',
    blue: 'kpi-blue',
    green: 'kpi-green',
    purple: 'kpi-purple',
    gray: 'kpi-gray',
    orange: 'kpi-orange',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`kpi-card ${toneClass[tone] || toneClass.navy}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-bold text-primary font-heading">{value}</p>
          {subtitle ? <p className="text-xs text-slate-400 mt-1">{subtitle}</p> : null}
        </div>
        {Icon ? (
          <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
            <Icon size={18} />
          </span>
        ) : null}
      </div>
    </motion.div>
  )
}
