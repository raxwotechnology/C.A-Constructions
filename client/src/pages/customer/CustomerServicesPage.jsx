import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { EmptyState } from '../../components/ui';
import {
  Package, Clock, CheckCircle, Tag, Zap, Star, ChevronRight,
  Calendar, X, Loader2, ArrowRight, Shield, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const categoryIcons = {
  'Web Development': Zap,
  'Mobile Apps': Package,
  'Marketing': Star,
  'Consulting': Shield,
  'Design': Sparkles,
};

const categoryColors = [
  { bg: 'linear-gradient(135deg,#080344 0%,#534AB7 100%)', light: '#EEEDF8', text: '#534AB7' },
  { bg: 'linear-gradient(135deg,#0ea5e9 0%,#0369a1 100%)', light: '#e0f2fe', text: '#0369a1' },
  { bg: 'linear-gradient(135deg,#10b981 0%,#047857 100%)', light: '#ecfdf5', text: '#047857' },
  { bg: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)', light: '#fffbeb', text: '#b45309' },
  { bg: 'linear-gradient(135deg,#ec4899 0%,#be185d 100%)', light: '#fdf2f8', text: '#be185d' },
];

function BookingModal({ service, user, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    service: service?._id || '',
    appointmentDate: '',
    appointmentTime: '',
    notes: '',
  });

  const discountedPrice = service
    ? service.price - (service.price * (user?.discount || 0)) / 100
    : 0;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24 }}
        className="modal w-full max-w-lg"
      >
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg,#080344,#534AB7)' }}>
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="font-black text-navy text-base" style={{ fontFamily: 'Poppins,sans-serif' }}>
                Book Appointment
              </h3>
              <p className="text-xs text-slate-500">{service?.name}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body space-y-5">
          {/* Price summary */}
          <div className="rounded-2xl p-4 border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Service Price</p>
              <div className="flex items-center gap-2">
                {user?.discount > 0 && (
                  <span className="text-slate-400 line-through text-sm">₨{Number(service?.price).toLocaleString()}</span>
                )}
                <span className="text-2xl font-black text-navy" style={{ fontFamily: 'Poppins,sans-serif' }}>
                  ₨{discountedPrice.toLocaleString()}
                </span>
              </div>
              {user?.discount > 0 && (
                <p className="text-xs text-emerald-600 font-bold mt-0.5">
                  🎉 {user.discount}% loyalty discount applied!
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-2">
              <Clock size={14} className="text-slate-400" />
              <span className="text-sm font-bold text-slate-700">{service?.duration} min</span>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input type="date" value={form.appointmentDate}
                onChange={e => setForm(p => ({ ...p, appointmentDate: e.target.value }))}
                className="form-input" required min={format(new Date(), 'yyyy-MM-dd')} />
            </div>
            <div className="form-group">
              <label className="form-label">Time *</label>
              <input type="time" value={form.appointmentTime}
                onChange={e => setForm(p => ({ ...p, appointmentTime: e.target.value }))}
                className="form-input" required />
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Additional Notes</label>
            <textarea value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="form-textarea" rows={3}
              placeholder="Special requirements, project details, questions..." />
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button
            onClick={() => onSubmit(form)}
            disabled={loading || !form.appointmentDate || !form.appointmentTime}
            className="btn btn-primary">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Booking...</> : <><CheckCircle size={15} /> Confirm Booking</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function CustomerServicesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedService, setSelectedService] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => appointmentAPI.getServices().then(r => r.data.data),
  });

  const services = servicesData || [];
  const categories = ['All', ...new Set(services.map(s => s.category).filter(Boolean))];
  const filtered = selectedCategory === 'All' ? services : services.filter(s => s.category === selectedCategory);

  const bookMutation = useMutation({
    mutationFn: appointmentAPI.create,
    onSuccess: () => {
      qc.invalidateQueries(['my-appointments']);
      toast.success('🎉 Appointment booked successfully!');
      setSelectedService(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Booking failed.')
  });

  return (
    <>
      <AnimatePresence>
        {selectedService && (
          <BookingModal
            service={selectedService}
            user={user}
            onClose={() => setSelectedService(null)}
            onSubmit={(form) => bookMutation.mutate(form)}
            loading={bookMutation.isPending}
          />
        )}
      </AnimatePresence>

      <div className="space-y-7 animate-in">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl p-7 text-white"
          style={{ background: 'linear-gradient(135deg,#080344 0%,#1a0a6b 55%,#534AB7 100%)' }}>
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute bottom-0 left-1/2 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-3.5 py-1.5 mb-4">
              <Package size={13} className="text-white/80" />
              <span className="text-xs font-bold text-white/90">Service Catalog</span>
            </div>
            <h1 className="text-3xl font-black mb-2" style={{ fontFamily: 'Poppins,sans-serif', letterSpacing: '-0.03em' }}>
              Professional Services
            </h1>
            <p className="text-white/65 text-sm max-w-lg">
              Browse our curated catalog of expert tech services. Book directly and get confirmed instantly.
            </p>
            {user?.discount > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/30 rounded-xl px-4 py-2">
                <Star size={15} className="text-amber-300" fill="currentColor" />
                <span className="text-sm font-bold text-amber-300">
                  Your {user.discount}% loyalty discount is applied automatically!
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Category filters */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                  selectedCategory === cat
                    ? 'text-white shadow-lg'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-purple hover:text-purple'
                }`}
                style={selectedCategory === cat ? { background: 'linear-gradient(135deg,#080344,#534AB7)' } : {}}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Services Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="card p-6 space-y-4">
                <div className="skeleton h-12 w-12 rounded-2xl" />
                <div className="skeleton h-5 w-2/3" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-10 w-full mt-4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Package size={24} className="text-slate-400" />
            </div>
            <p className="font-bold text-slate-700 mb-1">No services available</p>
            <p className="text-sm text-slate-400">We're updating our catalog. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((s, i) => {
              const color = categoryColors[i % categoryColors.length];
              const Icon = categoryIcons[s.category] || Package;
              const discountedPrice = s.price - (s.price * (user?.discount || 0)) / 100;

              return (
                <motion.div
                  key={s._id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="card flex flex-col group cursor-pointer"
                  onClick={() => setSelectedService(s)}
                >
                  {/* Color top bar */}
                  <div className="h-1.5 w-full rounded-t-2xl" style={{ background: color.bg }} />

                  <div className="p-6 flex-1 flex flex-col">
                    {/* Icon + category */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                        style={{ background: color.bg }}>
                        <Icon size={22} className="text-white" />
                      </div>
                      {s.category && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: color.light, color: color.text }}>
                          {s.category}
                        </span>
                      )}
                    </div>

                    {/* Title & desc */}
                    <h3 className="text-lg font-black text-navy mb-2" style={{ fontFamily: 'Poppins,sans-serif' }}>
                      {s.name}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed flex-1 line-clamp-2">
                      {s.description || 'Professional service delivered by Raxwo expert engineers.'}
                    </p>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                        <Clock size={12} />
                        {s.duration} min
                      </div>
                      <div className="ml-auto text-right">
                        {user?.discount > 0 && (
                          <p className="text-[11px] text-slate-400 line-through">
                            ₨{Number(s.price).toLocaleString()}
                          </p>
                        )}
                        <p className="text-xl font-black text-navy" style={{ fontFamily: 'Poppins,sans-serif' }}>
                          ₨{discountedPrice.toLocaleString()}
                        </p>
                        {user?.discount > 0 && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded inline-block">
                            -{user.discount}% OFF
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CTA */}
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedService(s); }}
                      className="mt-4 w-full py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 group-hover:shadow-lg"
                      style={{ background: color.bg, boxShadow: '0 4px 14px rgba(83,74,183,0.25)' }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      Book Now <ArrowRight size={15} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
