import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiTrash2 } from 'react-icons/fi'

export default function AdminRewards() {
  const qc = useQueryClient()
  const [ruleForm, setRuleForm] = useState({ action: '', points: 0, isActive: true, campaignName: '' })
  const [voucherForm, setVoucherForm] = useState({
    code: '',
    title: '',
    type: 'percentage',
    value: 10,
    pointsCost: 100,
    minimumSpend: 0,
    expiryDate: '',
    usageLimit: 1,
    isActive: true,
    campaignName: '',
  })

  const { data: rulesData } = useQuery({ queryKey: ['reward-rules'], queryFn: () => api.get('/rewards/admin/rules').then((r) => r.data) })
  const { data: vouchersData } = useQuery({ queryKey: ['reward-vouchers'], queryFn: () => api.get('/rewards/admin/vouchers').then((r) => r.data) })
  const { data: analyticsData } = useQuery({ queryKey: ['reward-analytics'], queryFn: () => api.get('/rewards/admin/analytics').then((r) => r.data) })
  const { data: leaderboardData } = useQuery({ queryKey: ['reward-leaderboard'], queryFn: () => api.get('/rewards/admin/leaderboard').then((r) => r.data) })

  const ruleMut = useMutation({
    mutationFn: (payload) => api.post('/rewards/admin/rules', payload).then((r) => r.data),
    onSuccess: () => { toast.success('Rule saved'); qc.invalidateQueries({ queryKey: ['reward-rules'] }) },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })
  const voucherMut = useMutation({
    mutationFn: (payload) => api.post('/rewards/admin/vouchers', payload).then((r) => r.data),
    onSuccess: () => { toast.success('Voucher template created'); qc.invalidateQueries({ queryKey: ['reward-vouchers'] }) },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })
  const voucherDeleteMut = useMutation({
    mutationFn: (id) => api.delete(`/rewards/admin/vouchers/${id}`).then((r) => r.data),
    onSuccess: () => { toast.success('Voucher deleted'); qc.invalidateQueries({ queryKey: ['reward-vouchers'] }) },
  })

  const rules = rulesData?.rules || []
  const vouchers = vouchersData?.vouchers || []
  const analytics = analyticsData?.analytics || {}
  const topClients = leaderboardData?.clients || []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Rewards Management</h1>
          <p className="page-subtitle">Configure loyalty rules, voucher campaigns, and referral analytics.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="kpi-card kpi-blue"><p className="text-xs uppercase text-slate-500">Points Earned</p><p className="text-2xl font-bold text-primary">{analytics.pointsEarned || 0}</p></div>
        <div className="kpi-card kpi-green"><p className="text-xs uppercase text-slate-500">Voucher Usage</p><p className="text-2xl font-bold text-primary">{analytics.voucherUsage || 0}</p></div>
        <div className="kpi-card kpi-purple"><p className="text-xs uppercase text-slate-500">Referrals</p><p className="text-2xl font-bold text-primary">{analytics.referralGrowth || 0}</p></div>
        <div className="kpi-card kpi-navy"><p className="text-xs uppercase text-slate-500">Reward Clients</p><p className="text-2xl font-bold text-primary">{analytics.totalClientsInRewards || 0}</p></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card card-body space-y-3">
          <h3 className="font-bold text-primary font-heading">Point Rules / Campaigns</h3>
          <div className="grid grid-cols-2 gap-3">
            <input className="form-input" placeholder="Action key" value={ruleForm.action} onChange={(e) => setRuleForm((s) => ({ ...s, action: e.target.value }))} />
            <input className="form-input" type="number" placeholder="Points" value={ruleForm.points} onChange={(e) => setRuleForm((s) => ({ ...s, points: Number(e.target.value || 0) }))} />
            <input className="form-input" placeholder="Campaign name" value={ruleForm.campaignName} onChange={(e) => setRuleForm((s) => ({ ...s, campaignName: e.target.value }))} />
            <select className="form-select" value={ruleForm.isActive ? 'active' : 'inactive'} onChange={(e) => setRuleForm((s) => ({ ...s, isActive: e.target.value === 'active' }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button className="btn-primary w-fit" onClick={() => ruleMut.mutate(ruleForm)}><FiPlus size={14} /> Save Rule</button>
          <div className="space-y-2">
            {rules.map((r) => (
              <div key={r._id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm flex justify-between">
                <span className="text-slate-700">{r.action} ({r.campaignName || 'Default'})</span>
                <span className={`font-semibold ${r.isActive ? 'text-green-600' : 'text-slate-400'}`}>{r.points} pts</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-body space-y-3">
          <h3 className="font-bold text-primary font-heading">Create Voucher Template</h3>
          <div className="grid grid-cols-2 gap-3">
            <input className="form-input" placeholder="Code (optional)" value={voucherForm.code} onChange={(e) => setVoucherForm((s) => ({ ...s, code: e.target.value.toUpperCase() }))} />
            <input className="form-input" placeholder="Title" value={voucherForm.title} onChange={(e) => setVoucherForm((s) => ({ ...s, title: e.target.value }))} />
            <select className="form-select" value={voucherForm.type} onChange={(e) => setVoucherForm((s) => ({ ...s, type: e.target.value }))}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
              <option value="free_consultation">Free consultation</option>
              <option value="hosting_discount">Hosting discount</option>
              <option value="premium_support">Premium support</option>
            </select>
            <input className="form-input" type="number" placeholder="Value" value={voucherForm.value} onChange={(e) => setVoucherForm((s) => ({ ...s, value: Number(e.target.value || 0) }))} />
            <input className="form-input" type="number" placeholder="Points cost" value={voucherForm.pointsCost} onChange={(e) => setVoucherForm((s) => ({ ...s, pointsCost: Number(e.target.value || 0) }))} />
            <input className="form-input" type="number" placeholder="Minimum spend" value={voucherForm.minimumSpend} onChange={(e) => setVoucherForm((s) => ({ ...s, minimumSpend: Number(e.target.value || 0) }))} />
            <input className="form-input" type="date" value={voucherForm.expiryDate} onChange={(e) => setVoucherForm((s) => ({ ...s, expiryDate: e.target.value }))} />
            <input className="form-input" type="number" placeholder="Usage limit" value={voucherForm.usageLimit} onChange={(e) => setVoucherForm((s) => ({ ...s, usageLimit: Number(e.target.value || 1) }))} />
          </div>
          <button className="btn-primary w-fit" onClick={() => voucherMut.mutate(voucherForm)}><FiPlus size={14} /> Add Voucher</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-3">Voucher Templates & Instances</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {vouchers.map((v) => (
              <div key={v._id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{v.code} · {v.title || v.type}</p>
                  <p className="text-xs text-slate-500">Value {v.value} · Cost {v.pointsCost} · Used {v.usedCount}/{v.usageLimit}</p>
                </div>
                <button className="btn-ghost btn-sm text-red-500" onClick={() => voucherDeleteMut.mutate(v._id)}><FiTrash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-body">
          <h3 className="font-bold text-primary font-heading mb-3">Top Clients by Rewards</h3>
          <div className="space-y-2">
            {topClients.map((c) => (
              <div key={c.userId} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex justify-between text-sm">
                <span className="text-slate-700">{c.name} <span className="text-slate-400">({c.tier})</span></span>
                <span className="font-semibold text-[#000080]">{c.totalPoints} pts</span>
              </div>
            ))}
            {topClients.length === 0 ? <p className="text-sm text-slate-400">No reward clients yet.</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
