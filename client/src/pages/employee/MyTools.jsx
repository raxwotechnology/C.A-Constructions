import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import { FiKey, FiMonitor, FiCode, FiTrendingUp, FiMessageSquare, FiCpu, FiFolder, FiExternalLink, FiClock } from 'react-icons/fi'

const TOOL_TYPE_ICONS = {
  design: { icon: FiMonitor, color: 'from-purple-500 to-pink-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  development: { icon: FiCode, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  marketing: { icon: FiTrendingUp, color: 'from-orange-500 to-amber-500', bg: 'bg-orange-50', text: 'text-orange-700' },
  communication: { icon: FiMessageSquare, color: 'from-green-500 to-emerald-500', bg: 'bg-green-50', text: 'text-green-700' },
  ai: { icon: FiCpu, color: 'from-violet-500 to-indigo-500', bg: 'bg-violet-50', text: 'text-violet-700' },
  project_management: { icon: FiFolder, color: 'from-teal-500 to-cyan-500', bg: 'bg-teal-50', text: 'text-teal-700' },
  other: { icon: FiKey, color: 'from-slate-400 to-slate-600', bg: 'bg-slate-50', text: 'text-slate-600' },
}

export default function MyTools() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-tools'],
    queryFn: () => api.get('/tool-assignments/my').then(r => r.data),
  })

  const assignments = data?.assignments || []

  const byType = assignments.reduce((acc, a) => {
    const type = a.toolType || 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(a)
    return acc
  }, {})

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tools & Accounts</h1>
          <p className="page-subtitle">All software tools and accounts assigned to you.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 text-center">
            <p className="text-xs text-slate-500">Active Tools</p>
            <p className="text-xl font-bold text-emerald-700">{assignments.length}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FiKey size={28} className="text-slate-400" />
          </div>
          <p className="font-semibold text-slate-600">No tools assigned yet.</p>
          <p className="text-sm text-slate-400 mt-1">Contact your admin to request tool access.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byType).map(([type, tools], gi) => {
            const meta = TOOL_TYPE_ICONS[type] || TOOL_TYPE_ICONS.other
            const Icon = meta.icon
            return (
              <motion.div key={type} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.08 }}
                className="card card-body">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center`}>
                    <Icon size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary capitalize">{type.replace('_', ' ')}</h3>
                    <p className="text-xs text-slate-400">{tools.length} tool{tools.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tools.map((tool, i) => (
                    <motion.div key={tool._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white hover:shadow-md transition-shadow group">
                      <div className={`h-1 w-full bg-gradient-to-r ${meta.color}`} />
                      <div className="p-4">
                        {/* Tool header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center`}>
                            <Icon size={18} className={meta.text} />
                          </div>
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">Active</span>
                        </div>

                        <h4 className="font-bold text-primary text-base mb-0.5">{tool.toolName}</h4>
                        <p className="text-xs text-slate-400 capitalize mb-3">{type.replace('_', ' ')}</p>

                        {/* Account email */}
                        {tool.accountEmail && (
                          <div className="bg-slate-50 rounded-xl px-3 py-2 mb-2 border border-slate-100">
                            <p className="text-[10px] text-slate-400 font-semibold uppercase mb-0.5">Account</p>
                            <p className="text-sm font-mono text-slate-700 truncate">{tool.accountEmail}</p>
                          </div>
                        )}

                        {/* Password (masked) */}
                        {tool.accountPassword && tool.accountPassword !== '••••••••' && (
                          <div className="bg-slate-50 rounded-xl px-3 py-2 mb-2 border border-slate-100">
                            <p className="text-[10px] text-slate-400 font-semibold uppercase mb-0.5">Password</p>
                            <p className="text-sm font-mono text-slate-700">••••••••</p>
                          </div>
                        )}

                        {/* Notes */}
                        {tool.notes && (
                          <p className="text-xs text-slate-500 mb-3 italic">{tool.notes}</p>
                        )}

                        {/* Expiry */}
                        {tool.expiresAt && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium mb-3">
                            <FiClock size={11} />
                            Expires {new Date(tool.expiresAt).toLocaleDateString()}
                          </div>
                        )}

                        {/* Action */}
                        {tool.accessUrl && (
                          <a href={tool.accessUrl} target="_blank" rel="noreferrer"
                            className="w-full btn-outline btn-sm text-xs justify-center mt-2 hover:bg-secondary hover:text-white hover:border-secondary transition-colors gap-1.5">
                            <FiExternalLink size={12} /> Open Tool
                          </a>
                        )}

                        {/* Assigned by */}
                        <p className="text-[10px] text-slate-400 mt-3 text-right">
                          Assigned by {tool.assignedBy?.name || 'Admin'} · {new Date(tool.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
