import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, BarChart, Bar
} from 'recharts'
import { FiZap, FiTrendingUp, FiTrendingDown, FiActivity, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi'
import { formatMoney, chartMoneyTick, tooltipMoney } from '../../lib/currencies'

const money = (v) => formatMoney(v)
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function AdminAIAnalyzer() {
  const [lookback, setLookback] = useState(6)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ai-predictions', lookback],
    queryFn: () => api.get(`/analytics/ai-predict?months=${lookback}`).then(r => r.data),
  })

  const historical = data?.historical || {}
  const predictions = data?.predictions || {}
  const suggestions = data?.suggestions || []
  const nextMonth = months[new Date().getMonth() === 11 ? 0 : new Date().getMonth() + 1]

  const revChartData = [
    ...(historical.revenue || []).map(d => ({ label: d.label, actual: d.value })),
    { label: `${nextMonth} (Pred.)`, predicted: predictions.revenue?.nextValue || 0 },
  ]
  const payChartData = [
    ...(historical.payroll || []).map(d => ({ label: d.label, actual: d.value })),
    { label: `${nextMonth} (Pred.)`, predicted: predictions.payroll?.nextValue || 0 },
  ]
  const projChartData = [
    ...(historical.projects || []).map(d => ({ label: d.label, actual: d.value })),
    { label: `${nextMonth} (Pred.)`, predicted: predictions.projects?.nextValue || 0 },
  ]

  const suggColor = { positive: 'bg-green-50 border-green-200 text-green-800', warning: 'bg-yellow-50 border-yellow-200 text-yellow-800', neutral: 'bg-blue-50 border-blue-200 text-blue-800' }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Analyzer</h1>
          <p className="page-subtitle">AI-powered future predictions based on your business data</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="form-select text-sm" value={lookback} onChange={e => setLookback(Number(e.target.value))}>
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
          <button onClick={() => refetch()} className="btn-primary btn-sm"><FiZap size={14}/> Re-analyze</button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-14 h-14 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"/>
          <p className="text-gray-500 text-sm font-medium">AI is analyzing your business data…</p>
          <p className="text-gray-400 text-xs">Calculating trends and predictions</p>
        </div>
      ) : (
        <>
          {/* Prediction Cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Revenue Prediction', val: money(predictions.revenue?.nextValue || 0), trend: predictions.revenue?.trend || 0, sub: `vs prev period`, color: 'kpi-blue' },
              { label: 'Payroll Prediction', val: money(predictions.payroll?.nextValue || 0), trend: predictions.payroll?.trend || 0, sub: 'expected payroll cost', color: 'kpi-green' },
              { label: 'New Projects', val: `${predictions.projects?.nextValue || 0} projects`, trend: predictions.projects?.trend || 0, sub: 'expected new projects', color: 'kpi-purple' },
            ].map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className={`kpi-card ${c.color}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{c.label}</p>
                    <p className="text-xs text-purple-600 font-medium mb-1 flex items-center gap-1"><FiZap size={10}/> {nextMonth} Prediction</p>
                    <p className="text-2xl font-bold text-primary font-heading">{c.val}</p>
                    <div className={`flex items-center gap-1 mt-1.5 text-xs font-semibold ${c.trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {c.trend >= 0 ? <FiTrendingUp size={12}/> : <FiTrendingDown size={12}/>}
                      {Math.abs(c.trend).toFixed(1)}% {c.sub}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center">
                    <FiActivity size={18} className="text-secondary"/>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <div className="card card-body">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <FiZap className="text-white" size={14}/>
                </div>
                <h3 className="font-bold text-primary font-heading">AI Insights & Recommendations</h3>
              </div>
              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                    className={`flex items-start gap-3 p-4 rounded-xl border ${suggColor[s.type] || suggColor.neutral}`}>
                    <span className="text-xl flex-shrink-0">{s.icon}</span>
                    <p className="text-sm font-medium">{s.message}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Revenue Trend Chart */}
          <div className="card card-body">
            <h3 className="font-bold text-primary font-heading mb-1">Revenue Trend & Prediction</h3>
            <p className="text-xs text-gray-400 mb-4">Blue = actual · Purple dashed = AI prediction</p>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revChartData}>
                <defs>
                  <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={chartMoneyTick}/>
                <Tooltip formatter={(v, n) => [v ? `LKR ${Number(v).toLocaleString()}` : '—', n]} contentStyle={{ borderRadius: '10px', fontSize: '12px' }}/>
                <Area type="monotone" dataKey="actual" name="Actual" stroke="#2563EB" strokeWidth={2.5} fill="url(#revGrad2)" dot={{ fill: '#2563EB', r: 3 }} connectNulls={false}/>
                <Area type="monotone" dataKey="predicted" name="Predicted" stroke="#8B5CF6" strokeWidth={2.5} strokeDasharray="6 3" fill="none" dot={{ fill: '#8B5CF6', r: 5 }} connectNulls={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Payroll + Projects */}
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="card card-body">
              <h3 className="font-bold text-primary font-heading mb-1">Payroll Cost Trend</h3>
              <p className="text-xs text-gray-400 mb-4">Historical + AI prediction</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={payChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={chartMoneyTick}/>
                  <Tooltip formatter={(v) => (v != null ? tooltipMoney(v, '') : ['—', ''])} contentStyle={{ borderRadius: '10px', fontSize: '12px' }}/>
                  <Line type="monotone" dataKey="actual" name="Actual" stroke="#22C55E" strokeWidth={2.5} dot={{ fill: '#22C55E', r: 3 }} connectNulls={false}/>
                  <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#F59E0B" strokeWidth={2.5} strokeDasharray="6 3" dot={{ fill: '#F59E0B', r: 5 }} connectNulls={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card card-body">
              <h3 className="font-bold text-primary font-heading mb-1">Project Intake Trend</h3>
              <p className="text-xs text-gray-400 mb-4">Historical + AI prediction</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={projChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px' }}/>
                  <Bar dataKey="actual" name="Actual" fill="#2563EB" radius={[4,4,0,0]}/>
                  <Bar dataKey="predicted" name="Predicted" fill="#8B5CF6" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
