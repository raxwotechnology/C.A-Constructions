import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import {
  FiPlus, FiTrash2, FiGift, FiStar, FiUsers, FiTrendingUp,
  FiAward, FiZap, FiToggleLeft, FiToggleRight, FiX
} from 'react-icons/fi'

const TIER_CFG = {
  Silver:   { color: 'from-slate-300 to-slate-400', badge: 'bg-slate-100 text-slate-600', crown: '🥈', min: 0,    max: 1000 },
  Gold:     { color: 'from-amber-300 to-amber-500', badge: 'bg-amber-100 text-amber-700', crown: '🥇', min: 1000, max: 5000 },
  Platinum: { color: 'from-violet-400 to-violet-600', badge: 'bg-violet-100 text-violet-700', crown: '💎', min: 5000, max: Infinity },
}

const RULE_ACTIONS = [
  'project_completed', 'invoice_paid', 'referral_converted',
  'feedback_submitted', 'subscription_renewed', 'milestone_reached',
]

export default function AdminRewards() {
  const qc = useQueryClient()
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [showVoucherForm, setShowVoucherForm] = useState(false)
  const [ruleForm, setRuleForm] = useState({ action: '', points: 0, isActive: true, campaignName: '' })
  const [voucherForm, setVoucherForm] = useState({
    code: '', title: '', type: 'percentage', value: 10,
    pointsCost: 100, minimumSpend: 0, expiryDate: '', usageLimit: 1, isActive: true, campaignName: '',
  })

  const rf = (k, v) => setRuleForm(s => ({ ...s, [k]: v }))
  const vf = (k, v) => setVoucherForm(s => ({ ...s, [k]: v }))

  const { data: rulesData }     = useQuery({ queryKey: ['reward-rules'],     queryFn: () => api.get('/rewards/admin/rules').then(r => r.data) })
  const { data: vouchersData }  = useQuery({ queryKey: ['reward-vouchers'],  queryFn: () => api.get('/rewards/admin/vouchers').then(r => r.data) })
  const { data: analyticsData } = useQuery({ queryKey: ['reward-analytics'], queryFn: () => api.get('/rewards/admin/analytics').then(r => r.data) })
  const { data: leaderboardData }= useQuery({ queryKey: ['reward-leaderboard'], queryFn: () => api.get('/rewards/admin/leaderboard').then(r => r.data) })

  const ruleMut = useMutation({
    mutationFn: payload => api.post('/rewards/admin/rules', payload).then(r => r.data),
    onSuccess: () => { toast.success('Rule saved'); qc.invalidateQueries({ queryKey: ['reward-rules'] }); setShowRuleForm(false); setRuleForm({ action: '', points: 0, isActive: true, campaignName: '' }) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const ruleToggleMut = useMutation({
    mutationFn: ({ id, isActive }) => api.put(`/rewards/admin/rules/${id}`, { isActive }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reward-rules'] }),
  })

  const voucherMut = useMutation({
    mutationFn: payload => api.post('/rewards/admin/vouchers', payload).then(r => r.data),
    onSuccess: () => { toast.success('Voucher template created'); qc.invalidateQueries({ queryKey: ['reward-vouchers'] }); setShowVoucherForm(false) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const voucherDeleteMut = useMutation({
    mutationFn: id => api.delete(`/rewards/admin/vouchers/${id}`),
    onSuccess: () => { toast.success('Voucher deleted'); qc.invalidateQueries({ queryKey: ['reward-vouchers'] }) },
  })

  const rules    = rulesData?.rules    || []
  const vouchers = vouchersData?.vouchers || []
  const analytics = analyticsData?.analytics || {}
  const topClients = leaderboardData?.clients || []

  // Tier distribution from leaderboard
  const tierCounts = { Silver: 0, Gold: 0, Platinum: 0 }
  topClients.forEach(c => { if (tierCounts[c.tier] !== undefined) tierCounts[c.tier]++ })

  const kpis = [
    { label: 'Total Points Earned', val: (analytics.pointsEarned || 0).toLocaleString(), icon: FiZap, color: 'kpi-blue' },
    { label: 'Vouchers Issued', val: analytics.voucherUsage || 0, icon: FiGift, color: 'kpi-green' },
    { label: 'Referrals', val: analytics.referralGrowth || 0, icon: FiUsers, color: 'kpi-purple' },
    { label: 'Enrolled Clients', val: analytics.totalClientsInRewards || 0, icon: FiAward, color: 'kpi-navy' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Rewards & Loyalty</h1>
          <p className="page-subtitle">Configure loyalty rules, voucher campaigns, tiers, and referral analytics.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRuleForm(true)} className="btn-outline btn-sm gap-1.5"><FiPlus size={13} /> Add Rule</button>
          <button onClick={() => setShowVoucherForm(true)} className="btn-primary btn-sm gap-1.5"><FiGift size={13} /> New Voucher</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={`kpi-card ${k.color}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">{k.label}</p>
                <p className="text-2xl font-black text-primary mt-1">{k.val}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                <k.icon size={18} className="text-secondary" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tier breakdown */}
      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(TIER_CFG).map(([tier, cfg]) => (
          <div key={tier} className="card overflow-hidden">
            <div className={`h-2 bg-gradient-to-r ${cfg.color}`} />
            <div className="p-4 flex items-center gap-3">
              <span className="text-2xl">{cfg.crown}</span>
              <div className="flex-1">
                <p className="font-bold text-primary">{tier}</p>
                <p className="text-xs text-slate-400">{cfg.min.toLocaleString()}–{tier === 'Platinum' ? '∞' : cfg.max.toLocaleString()} pts</p>
              </div>
              <span className={`text-2xl font-black px-3 py-1 rounded-xl ${cfg.badge}`}>{tierCounts[tier]}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Point Rules */}
        <div className="card card-body space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-primary font-heading">Point Earning Rules</h3>
            <button onClick={() => setShowRuleForm(s => !s)} className="btn-ghost btn-sm gap-1"><FiPlus size={13} /> Add</button>
          </div>

          <AnimatePresence>
            {showRuleForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden">
                <div className="bg-slate-50 rounded-xl p-4 space-y-3 border">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Action Key</label>
                      <select className="form-select" value={ruleForm.action} onChange={e => rf('action', e.target.value)}>
                        <option value="">Select action…</option>
                        {RULE_ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                        <option value="custom">Custom…</option>
                      </select>
                      {ruleForm.action === 'custom' && <input className="form-input mt-2" placeholder="Custom action key" onChange={e => rf('action', e.target.value)} />}
                    </div>
                    <div>
                      <label className="form-label">Points Reward</label>
                      <input type="number" className="form-input" placeholder="e.g. 50" value={ruleForm.points} onChange={e => rf('points', Number(e.target.value))} />
                    </div>
                    <div className="col-span-2">
                      <label className="form-label">Campaign Name (optional)</label>
                      <input className="form-input" placeholder="e.g. Q2 Loyalty Campaign" value={ruleForm.campaignName} onChange={e => rf('campaignName', e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowRuleForm(false) }} className="btn-ghost btn-sm flex-1 justify-center">Cancel</button>
                    <button onClick={() => ruleMut.mutate(ruleForm)} disabled={ruleMut.isPending || !ruleForm.action || !ruleForm.points}
                      className="btn-primary btn-sm flex-1 justify-center">Save Rule</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {rules.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No rules configured</p> : null}
            {rules.map(r => (
              <div key={r._id} className={`rounded-xl border px-3 py-2.5 flex items-center justify-between gap-3 ${r.isActive ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 capitalize">{r.action.replace(/_/g,' ')}</p>
                  {r.campaignName && <p className="text-xs text-slate-400">{r.campaignName}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-secondary text-sm">+{r.points} pts</span>
                  <button onClick={() => ruleToggleMut.mutate({ id: r._id, isActive: !r.isActive })}
                    className={`transition-colors ${r.isActive ? 'text-emerald-500' : 'text-slate-300'}`}>
                    {r.isActive ? <FiToggleRight size={22} /> : <FiToggleLeft size={22} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Voucher Templates */}
        <div className="card card-body space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-primary font-heading">Voucher Templates</h3>
            <button onClick={() => setShowVoucherForm(s => !s)} className="btn-ghost btn-sm gap-1"><FiPlus size={13} /> Create</button>
          </div>

          <AnimatePresence>
            {showVoucherForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden">
                <div className="bg-slate-50 rounded-xl p-4 space-y-3 border">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Code (auto if blank)</label>
                      <input className="form-input font-mono uppercase" placeholder="SUMMER20" value={voucherForm.code} onChange={e => vf('code', e.target.value.toUpperCase())} />
                    </div>
                    <div>
                      <label className="form-label">Title</label>
                      <input className="form-input" placeholder="Summer Discount" value={voucherForm.title} onChange={e => vf('title', e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Type</label>
                      <select className="form-select" value={voucherForm.type} onChange={e => vf('type', e.target.value)}>
                        {['percentage','fixed','free_consultation','hosting_discount','premium_support'].map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Value {voucherForm.type === 'percentage' ? '(%)' : '(LKR)'}</label>
                      <input type="number" className="form-input" value={voucherForm.value} onChange={e => vf('value', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="form-label">Points Cost</label>
                      <input type="number" className="form-input" value={voucherForm.pointsCost} onChange={e => vf('pointsCost', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="form-label">Min Spend (LKR)</label>
                      <input type="number" className="form-input" value={voucherForm.minimumSpend} onChange={e => vf('minimumSpend', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="form-label">Expiry Date</label>
                      <input type="date" className="form-input" value={voucherForm.expiryDate} onChange={e => vf('expiryDate', e.target.value)} min={new Date().toISOString().slice(0,10)} />
                    </div>
                    <div>
                      <label className="form-label">Usage Limit</label>
                      <input type="number" className="form-input" min={1} value={voucherForm.usageLimit} onChange={e => vf('usageLimit', Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowVoucherForm(false)} className="btn-ghost btn-sm flex-1 justify-center">Cancel</button>
                    <button onClick={() => voucherMut.mutate(voucherForm)} disabled={voucherMut.isPending}
                      className="btn-primary btn-sm flex-1 justify-center">Create Voucher</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {vouchers.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">No voucher templates</p> : null}
            {vouchers.map(v => (
              <div key={v._id} className="rounded-xl border border-slate-200 p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <FiGift size={14} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{v.code} · {v.title || v.type}</p>
                  <p className="text-xs text-slate-400">
                    {v.type === 'percentage' ? `${v.value}% off` : `LKR ${(v.value||0).toLocaleString()}`}
                    · {v.pointsCost} pts · Used {v.usedCount||0}/{v.usageLimit}
                    {v.expiryDate && ` · Exp ${new Date(v.expiryDate).toLocaleDateString()}`}
                  </p>
                </div>
                <button onClick={() => voucherDeleteMut.mutate(v._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <FiTrash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card card-body">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center"><FiTrendingUp size={16} className="text-amber-600" /></div>
          <h3 className="font-bold text-primary font-heading">Client Loyalty Leaderboard</h3>
        </div>
        {topClients.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No reward clients yet. Rules and vouchers will populate this once clients earn points.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr><th>#</th><th>Client</th><th>Tier</th><th>Points</th><th>Tier Progress</th></tr>
              </thead>
              <tbody>
                {topClients.slice(0, 20).map((c, i) => {
                  const tierCfg = TIER_CFG[c.tier] || TIER_CFG.Silver
                  const min = tierCfg.min, max = tierCfg.max === Infinity ? c.totalPoints : tierCfg.max
                  const pct = Math.min(100, max > min ? ((c.totalPoints - min) / (max - min)) * 100 : 100)
                  return (
                    <tr key={c.userId || i}>
                      <td className="font-bold text-slate-500">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-secondary to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {c.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="font-medium text-slate-800">{c.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge text-xs ${tierCfg.badge}`}>{tierCfg.crown} {c.tier}</span>
                      </td>
                      <td className="font-bold text-secondary">{(c.totalPoints||0).toLocaleString()} pts</td>
                      <td className="min-w-32">
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className={`h-2 rounded-full bg-gradient-to-r ${tierCfg.color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{Math.round(pct)}%</p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
