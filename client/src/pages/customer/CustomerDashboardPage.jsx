import { useQuery } from '@tanstack/react-query';
import { appointmentAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/ui';
import { Calendar, Clock, CheckCircle, ArrowRight, Sparkles, Package, User, Star, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

function StatBox({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-black mb-1" style={{ fontFamily: 'Poppins,sans-serif', color: '#080344' }}>{value}</p>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}

export default function CustomerDashboardPage() {
  const { user } = useAuth();

  const { data: apptData, isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => appointmentAPI.getAll().then(r => r.data.data),
  });

  const appointments = apptData || [];
  const upcoming = appointments.filter(a => ['pending', 'confirmed'].includes(a.status));
  const completed = appointments.filter(a => a.status === 'completed');
  const totalSpent = completed.reduce((sum, a) => sum + (a.finalAmount || 0), 0);

  return (
    <div className="space-y-7 animate-in">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl p-8 text-white"
        style={{ background: 'linear-gradient(135deg, #080344 0%, #1a0a6b 55%, #534AB7 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, white, transparent)' }} />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />

        <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-3.5 py-1.5 mb-4">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-white/90">Portal Active</span>
            </div>
            <h1 className="text-3xl font-black mb-2" style={{ fontFamily: 'Poppins,sans-serif', letterSpacing: '-0.03em' }}>
              Welcome back, {user?.fullName?.split(' ')[0]}! 👋
            </h1>
            <p className="text-white/65 text-sm max-w-md">
              Manage your appointments, explore premium services, and track your history from your personal hub.
            </p>
          </div>

          {/* Discount Badge */}
          {user?.discount > 0 && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-4 text-center shadow-xl shadow-amber-500/30">
              <Star size={20} className="mx-auto mb-1 text-white" />
              <p className="text-2xl font-black text-white leading-none">{user.discount}%</p>
              <p className="text-[11px] text-white/80 font-semibold uppercase tracking-wider mt-0.5">Loyalty<br />Discount</p>
            </motion.div>
          )}
        </div>

        {/* Quick action buttons */}
        <div className="relative z-10 flex flex-wrap gap-3 mt-6">
          <Link to="/customer/services" className="inline-flex items-center gap-2 bg-white text-navy text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all shadow-sm hover:shadow-md">
            <Package size={15} /> Book a Service
          </Link>
          <Link to="/customer/appointments" className="inline-flex items-center gap-2 bg-white/15 border border-white/20 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-white/20 transition-all backdrop-blur-sm">
            <Calendar size={15} /> My Appointments
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox icon={Calendar} label="Total Bookings" value={appointments.length} color="bg-blue-500" />
        <StatBox icon={Clock} label="Upcoming" value={upcoming.length} color="bg-amber-500" />
        <StatBox icon={CheckCircle} label="Completed" value={completed.length} color="bg-emerald-500" />
        <StatBox icon={TrendingUp} label="Total Spent" value={`₨${totalSpent.toLocaleString()}`} color="bg-purple" style={{ background: '#534AB7' }} />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-navy text-base" style={{ fontFamily: 'Poppins,sans-serif' }}>Upcoming Appointments</h3>
              <p className="text-xs text-slate-500 mt-0.5">{upcoming.length} scheduled</p>
            </div>
            <Link to="/customer/appointments" className="text-xs font-bold text-purple hover:text-navy transition-colors flex items-center gap-1">
              View all <ArrowRight size={13} />
            </Link>
          </div>

          <div className="divide-y divide-slate-50">
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Calendar size={22} className="text-slate-400" />
                </div>
                <p className="font-bold text-slate-700 mb-1">No upcoming appointments</p>
                <p className="text-sm text-slate-400 mb-5">Browse our services to get started.</p>
                <Link to="/customer/services" className="btn btn-primary btn-sm">Browse Services</Link>
              </div>
            ) : upcoming.slice(0, 5).map((appt, i) => (
              <div key={appt._id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                {/* Date block */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-navy to-brand-700 flex flex-col items-center justify-center flex-shrink-0 shadow-sm"
                  style={{ background: 'linear-gradient(135deg,#080344,#534AB7)' }}>
                  <span className="text-[9px] font-bold text-white/70 uppercase">
                    {appt.appointmentDate ? format(new Date(appt.appointmentDate), 'MMM') : '—'}
                  </span>
                  <span className="text-lg font-black text-white leading-none">
                    {appt.appointmentDate ? format(new Date(appt.appointmentDate), 'dd') : '—'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{appt.service?.name || 'Service'}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <Clock size={11} /> {appt.appointmentTime || 'TBD'}
                    <span className="text-slate-300">·</span>
                    <span className="font-bold text-emerald-600">₨{Number(appt.finalAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
                <StatusBadge status={appt.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Promo Card */}
          <div className="rounded-3xl p-6 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#534AB7 0%,#080344 100%)' }}>
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5" />
            <Sparkles size={28} className="text-amber-300 mb-3 relative z-10" />
            <h3 className="font-black text-xl mb-1 relative z-10" style={{ fontFamily: 'Poppins,sans-serif' }}>Premium Services</h3>
            <p className="text-white/65 text-sm mb-5 relative z-10">Web Dev, Mobile Apps, Marketing & more — all from expert engineers.</p>
            <Link to="/customer/services" className="relative z-10 inline-flex items-center gap-2 bg-white text-navy text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
              Explore Now <ArrowRight size={14} />
            </Link>
          </div>

          {/* Profile Summary */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#534AB7,#080344)' }}>
                {user?.fullName?.charAt(0) || 'C'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800 text-sm truncate">{user?.fullName}</p>
                <p className="text-xs text-slate-500">{user?.phone}</p>
              </div>
            </div>
            {user?.discount > 0 && (
              <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3 mb-4">
                <p className="text-xs font-bold text-amber-700">🎉 {user.discount}% loyalty discount is active on all bookings!</p>
              </div>
            )}
            <Link to="/customer/profile" className="btn btn-secondary w-full text-xs">
              <User size={13} /> Edit Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
