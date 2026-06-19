import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiGift, FiClock, FiCopy, FiTag } from 'react-icons/fi'

export default function ClientRewards() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['client-rewards'],
    queryFn: () => api.get('/rewards/me').then((r) => r.data),
  })
  const { data: catalogData } = useQuery({
    queryKey: ['voucher-catalog'],
    queryFn: () => api.get('/rewards/catalog').then((r) => r.data),
  })
  const redeemMut = useMutation({
    mutationFn: (templateId) => api.post('/rewards/vouchers/redeem', { templateId }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Voucher redeemed successfully')
      qc.invalidateQueries({ queryKey: ['client-rewards'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Redemption failed'),
  })

  const reward = data?.reward
  const tier = data?.tier || 'Silver'
  const vouchers = data?.vouchers || []
  const templates = catalogData?.templates || []
  const progressPct = useMemo(() => {
    if (!reward) return 0
    if (tier === 'Silver') return Math.min((reward.totalPoints / 1000) * 100, 100)
    if (tier === 'Gold') return Math.min(((reward.totalPoints - 1000) / 4000) * 100, 100)
    return 100
  }, [reward, tier])

  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-hero pt-32 pb-10">
        <div className="container-max">
          <p className="text-white/70 text-sm">Client Portal</p>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-white mt-2">Rewards Dashboard</h1>
          <p className="text-white/75 mt-2">Loyalty points, vouchers, referrals, and premium benefits.</p>
        </div>
      </section>
      <section className="section-padding bg-slate-50">
        <div className="container-max space-y-6">
          {isLoading ? <div className="text-center py-10">Loading rewards...</div> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="kpi-card kpi-blue"><p className="text-xs uppercase text-slate-500">Points Balance</p><p className="text-xl font-bold text-primary">{reward?.totalPoints || 0}</p></div>
                <div className="kpi-card kpi-navy"><p className="text-xs uppercase text-slate-500">Loyalty Tier</p><p className="text-xl font-bold text-primary">{tier}</p></div>
                <div className="kpi-card kpi-green"><p className="text-xs uppercase text-slate-500">Vouchers</p><p className="text-xl font-bold text-primary">{vouchers.length}</p></div>
                <div className="kpi-card kpi-purple"><p className="text-xs uppercase text-slate-500">Referrals</p><p className="text-xl font-bold text-primary">{(data?.referrals || []).length}</p></div>
              </div>

              <div className="card card-body">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-primary font-heading">Loyalty Tier Progress</h3>
                  <span className="badge badge-navy">{tier}</span>
                </div>
                <div className="progress-bar"><div className="progress-fill bg-[#000080]" style={{ width: `${progressPct}%` }} /></div>
                <p className="text-xs text-slate-500 mt-2">Silver (0-1000), Gold (1000-5000), Platinum (5000+)</p>
              </div>

              <div className="card card-body">
                <h3 className="font-bold text-primary font-heading mb-2">Referral Code</h3>
                <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
                  <span className="font-mono text-sm text-primary">{reward?.referralCode || 'N/A'}</span>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(reward?.referralCode || '')
                      toast.success('Referral code copied')
                    }}
                  >
                    <FiCopy size={14} /> Copy
                  </button>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="card card-body">
                  <h3 className="font-bold text-primary font-heading mb-3">Redeem Rewards</h3>
                  <div className="space-y-2">
                    {templates.map((t) => (
                      <div key={t._id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{t.title || t.type}</p>
                          <p className="text-xs text-slate-500">Cost: {t.pointsCost} pts · Expires {new Date(t.expiryDate).toLocaleDateString()}</p>
                        </div>
                        <button className="btn-primary btn-sm" onClick={() => redeemMut.mutate(t._id)} disabled={(reward?.totalPoints || 0) < (t.pointsCost || 0) || redeemMut.isPending}>
                          <FiGift size={13} /> Redeem
                        </button>
                      </div>
                    ))}
                    {templates.length === 0 ? <p className="text-sm text-slate-400">No active reward vouchers.</p> : null}
                  </div>
                </div>

                <div className="card card-body">
                  <h3 className="font-bold text-primary font-heading mb-3">My Vouchers</h3>
                  <div className="space-y-2">
                    {vouchers.map((v) => (
                      <div key={v._id} className="rounded-xl border border-slate-200 p-3 bg-white">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-primary flex items-center gap-2"><FiTag size={14} /> {v.code}</p>
                          <span className={`badge ${v.isActive ? 'badge-green' : 'badge-gray'}`}>{v.isActive ? 'Active' : 'Used/Inactive'}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{v.title || v.type} · Min spend LKR {Number(v.minimumSpend || 0).toLocaleString()}</p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><FiClock size={12} /> Expires {new Date(v.expiryDate).toLocaleDateString()}</p>
                      </div>
                    ))}
                    {vouchers.length === 0 ? <p className="text-sm text-slate-400">No redeemed vouchers yet.</p> : null}
                  </div>
                </div>
              </div>

              <div className="card card-body">
                <h3 className="font-bold text-primary font-heading mb-3">Reward History</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {(reward?.pointsHistory || []).slice().reverse().map((h, idx) => (
                    <div key={`${h.sourceKey}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex justify-between text-sm">
                      <span className="text-slate-700">{h.note || h.action}</span>
                      <span className={h.points >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {h.points >= 0 ? '+' : ''}{h.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
