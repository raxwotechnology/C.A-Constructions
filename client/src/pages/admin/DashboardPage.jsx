import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { analyticsAPI, authAPI } from '../../api';
import { StatCard, CardSkeleton, StatusBadge } from '../../components/ui';
import {
  Users, FolderKanban, DollarSign, Calendar, TrendingUp, Clock,
  Package, BarChart2, Plus, X, Eye, EyeOff, Loader2, ShieldCheck, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

function AddAdminModal({ onClose }) {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '', dateOfBirth: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await authAPI.register({ ...form, userType: 'admin' });
      toast.success(`Admin account created for ${form.fullName}!`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create admin account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="modal">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#080344,#534AB7)' }}>
              <ShieldCheck size={17} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-navy text-lg" style={{ fontFamily: 'Poppins,sans-serif' }}>Add Administrator</h3>
              <p className="text-slate-500 text-xs">Grant full system access to a new admin.</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl p-3 mb-5">
              <span>⚠</span><span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} className="form-input" placeholder="e.g. Ahmed Ali" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input type="tel" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value.replace(/\D/g,'').slice(0,13)})} className="form-input" placeholder="0300 0000000" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="form-input" placeholder="admin@raxwo.com" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input type="date" required value={form.dateOfBirth} onChange={e => setForm({...form, dateOfBirth: e.target.value})} className="form-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} required value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="form-input pr-10" placeholder="Min 6 chars" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input type="password" required value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} className="form-input" placeholder="Repeat password" />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
              <strong>⚠ Warning:</strong> Administrator accounts have full access to all system data, settings, and employee records. Only grant this to trusted personnel.
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary py-2.5 px-6 font-semibold shadow-lg hover:shadow-xl transition-all w-36">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Creating...</> : <><ShieldCheck size={15} /> Create Admin</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const chartData = [
  { month: 'Jan', revenue: 45000, expenses: 28000 },
  { month: 'Feb', revenue: 52000, expenses: 31000 },
  { month: 'Mar', revenue: 48000, expenses: 29000 },
  { month: 'Apr', revenue: 61000, expenses: 35000 },
  { month: 'May', revenue: 55000, expenses: 32000 },
  { month: 'Jun', revenue: 67000, expenses: 38000 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs">
        <p className="font-bold text-slate-800 mb-2">{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: ₨{Number(p.value).toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [showAddAdmin, setShowAddAdmin] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsAPI.getDashboard().then(r => r.data.data),
    refetchInterval: 60000,
  });

  const stats = data?.stats || {};
  const financial = data?.financial || {};
  const recentProjects = data?.recentProjects || [];
  const recentEmployees = data?.recentEmployees || [];

  const statCards = [
    { icon: Users, label: 'Total Employees', value: stats.totalEmployees ?? '—', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', trend: '+3 this month', trendUp: true },
    { icon: FolderKanban, label: 'Active Projects', value: stats.activeProjects ?? '—', iconBg: 'bg-violet-100', iconColor: 'text-violet-600', trend: '2 due this week', trendUp: false },
    { icon: Clock, label: "Today's Attendance", value: stats.todayAttendance ?? '—', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', trend: 'On time', trendUp: true },
    { icon: Calendar, label: 'Pending Bookings', value: stats.pendingAppointments ?? '—', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', trend: 'Action needed', trendUp: false },
  ];

  return (
    <>
      {showAddAdmin && <AddAdminModal onClose={() => setShowAddAdmin(false)} />}

      <div className="space-y-7 animate-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              {format(new Date(), 'EEEE, MMMM d, yyyy')} · Raxwo Technologies HQ
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user?.userType === 'admin' && (
              <>
                <button
                  onClick={() => setShowAddAdmin(true)}
                  className="btn btn-secondary gap-2"
                >
                  <ShieldCheck size={15} />
                  Add Admin
                </button>
                <Link to="/employees/developers" className="btn btn-primary">
                  <Plus size={15} />
                  Add Employee
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {isLoading
            ? Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />)
            : statCards.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.iconBg}`}>
                      <s.icon size={20} className={s.iconColor} />
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {s.trend}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-navy mb-0.5" style={{ fontFamily: 'Poppins,sans-serif' }}>{s.value}</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
                </div>
              </motion.div>
            ))
          }
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue vs Expenses area chart */}
          <div className="card lg:col-span-2">
            <div className="card-header">
              <div>
                <h3 className="card-title">Revenue vs Expenses</h3>
                <p className="text-xs text-slate-400 mt-0.5">This year's financial performance</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-navy inline-block" />Revenue</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple inline-block" style={{ background: '#534AB7' }} />Expenses</span>
              </div>
            </div>
            <div className="card-body pt-2">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#080344" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#080344" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#534AB7" stopOpacity={0.10} />
                      <stop offset="95%" stopColor="#534AB7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Inter' }} axisLine={false} tickLine={false} tickFormatter={v => `₨${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#080344" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
                  <Area type="monotone" dataKey="expenses" stroke="#534AB7" strokeWidth={2} fill="url(#expGrad)" dot={false} strokeDasharray="5 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Financial Summary card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">This Month</h3>
              <span className="text-xs text-slate-400">{format(new Date(), 'MMMM yyyy')}</span>
            </div>
            <div className="card-body space-y-4">
              {[
                { label: 'Total Revenue', value: financial.monthRevenue || 0, color: '#059669', bg: '#ecfdf5', bar: '#10b981' },
                { label: 'Total Expenses', value: financial.monthExpense || 0, color: '#dc2626', bg: '#fff1f2', bar: '#f43f5e' },
                { label: 'Net Profit', value: financial.monthProfit || 0, color: '#080344', bg: '#EEEDF8', bar: '#534AB7' },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-xl" style={{ background: item.bg }}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold text-slate-600">{item.label}</span>
                    <span className="text-sm font-black" style={{ color: item.color }}>₨{item.value.toLocaleString()}</span>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ background: 'rgba(0,0,0,0.06)' }}>
                    <div className="h-full rounded-full" style={{ background: item.bar, width: `${Math.min((item.value / 100000) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
              <Link to="/financial" className="flex items-center justify-center gap-1.5 text-xs font-bold text-navy hover:text-purple transition-colors pt-2">
                View Full Report <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Projects</h3>
              <Link to="/projects" className="text-xs font-bold text-purple hover:text-navy transition-colors flex items-center gap-1">
                View all <ChevronRight size={13} />
              </Link>
            </div>
            <div className="divide-y divide-slate-100/80">
              {recentProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                    <FolderKanban size={20} className="text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">No projects yet</p>
                </div>
              ) : recentProjects.map(p => (
                <div key={p._id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <FolderKanban size={15} className="text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{p.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#080344,#534AB7)', width: `${p.progressPercentage || 0}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-500 font-semibold flex-shrink-0">{p.progressPercentage || 0}%</span>
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Employees */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Staff</h3>
              <Link to="/employees/developers" className="text-xs font-bold text-purple hover:text-navy transition-colors flex items-center gap-1">
                View all <ChevronRight size={13} />
              </Link>
            </div>
            <div className="divide-y divide-slate-100/80">
              {recentEmployees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                    <Users size={20} className="text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">No employees yet</p>
                </div>
              ) : recentEmployees.map((e, i) => (
                <div key={e._id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{ background: `hsl(${(i * 67) % 360}, 60%, 45%)` }}>
                    {e.fullName?.charAt(0) || 'E'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{e.fullName}</p>
                    <p className="text-xs text-slate-500 capitalize">{e.userType?.replace('_', ' ')}</p>
                  </div>
                  <StatusBadge status={e.isActive ? 'active' : 'inactive'} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
