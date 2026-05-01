import { useQuery } from '@tanstack/react-query';
import { analyticsAPI } from '../../api';
import { StatCard, CardSkeleton } from '../../components/ui';
import { Brain, TrendingUp, TrendingDown, BarChart2, Zap, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { motion } from 'framer-motion';

export default function AnalyticsPage() {
  const { data: dashData, isLoading } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => analyticsAPI.getDashboard().then(r => r.data.data),
  });

  const { data: aiData } = useQuery({
    queryKey: ['ai-predictions'],
    queryFn: () => analyticsAPI.getAIPredictions().then(r => r.data.data),
  });

  const radarData = [
    { subject: 'Revenue', A: 82 },
    { subject: 'Attendance', A: 91 },
    { subject: 'Projects', A: 74 },
    { subject: 'Sales', A: 68 },
    { subject: 'Efficiency', A: 87 },
    { subject: 'Customer Sat.', A: 79 },
  ];

  const forecastData = [
    { month: 'May', predicted: 65000, actual: 63000 },
    { month: 'Jun', predicted: 71000, actual: null },
    { month: 'Jul', predicted: 78000, actual: null },
    { month: 'Aug', predicted: 82000, actual: null },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><Brain size={22} className="text-purple" /> AI Analytics</h1>
          <p className="page-subtitle">AI-powered business intelligence and forecasting</p>
        </div>
        <span className="badge-purple">AI Powered</span>
      </div>

      {/* AI Status card */}
      {aiData?.message && (
        <div className="alert-warning">
          <AlertCircle size={16} />
          <span>{aiData.message}</span>
        </div>
      )}

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />) : [
          { icon: TrendingUp, label: 'Revenue Growth', value: '+12.4%', iconBg: 'bg-green-50', iconColor: 'text-green-600' },
          { icon: BarChart2, label: 'Attendance Rate', value: '91.2%', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
          { icon: Zap, label: 'Project On-Time Rate', value: '74%', iconBg: 'bg-purple/10', iconColor: 'text-purple' },
          { icon: TrendingUp, label: 'AI Confidence', value: '87%', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Forecast */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2"><Brain size={16} className="text-purple" /> Revenue Forecast</h3>
            <span className="badge-purple text-xs">AI</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₨${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => v ? [`₨${v.toLocaleString()}`, ''] : ['N/A', '']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="actual" stroke="#080344" strokeWidth={2} dot={{ fill: '#080344', r: 4 }} name="Actual" />
                <Line type="monotone" dataKey="predicted" stroke="#534AB7" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#534AB7', r: 4 }} name="Predicted" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-navy rounded" />Actual</div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-purple rounded" style={{ borderStyle: 'dashed' }} />AI Predicted</div>
            </div>
          </div>
        </div>

        {/* Performance Radar */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Business Performance Radar</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Radar name="Performance" dataKey="A" stroke="#080344" fill="#080344" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center gap-2"><Brain size={16} className="text-purple" /> AI Insights & Recommendations</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { icon: TrendingUp, title: 'Revenue Trend', insight: 'Revenue is growing at 12.4% MoM. Highest performing category is Software Services.', color: 'green', action: 'Continue current strategy' },
              { icon: BarChart2, title: 'Attendance Pattern', insight: 'Attendance peaks on Tuesday-Thursday. WFH days show 15% lower productivity on Mondays.', color: 'blue', action: 'Consider flexible schedules' },
              { icon: Zap, title: 'Project Health', insight: '3 projects are at risk of missing deadlines. The AI predicts a 74% on-time completion rate.', color: 'amber', action: 'Review resource allocation' },
            ].map(item => (
              <div key={item.title} className={`p-4 rounded-xl bg-${item.color}-50 border border-${item.color}-100`}>
                <div className="flex items-center gap-2 mb-2">
                  <item.icon size={16} className={`text-${item.color}-600`} />
                  <h4 className={`font-semibold text-sm text-${item.color}-800`}>{item.title}</h4>
                </div>
                <p className="text-xs text-gray-700 mb-3">{item.insight}</p>
                <p className={`text-xs font-semibold text-${item.color}-700`}>→ {item.action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
