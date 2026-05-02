import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Phone, Lock, Loader2, ArrowRight, Zap, Shield, Star, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const features = [
  { icon: Shield, label: 'Secure Bookings', text: 'All data encrypted end-to-end' },
  { icon: Zap, label: 'Instant Confirmation', text: 'Get confirmed in seconds' },
  { icon: Star, label: 'Loyalty Rewards', text: 'Earn discounts on every booking' },
  { icon: CheckCircle, label: '24/7 Support', text: 'Always here when you need us' },
];

export default function CustomerLoginPage() {
  const { login, logout, loading, user, token } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(null);

  useEffect(() => {
    if (user && token) {
      if (user.userType === 'customer') navigate('/customer/dashboard');
      else navigate('/dashboard');
    }
  }, [user, token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await login(phone, password);
      if (data.user?.userType !== 'customer') {
        logout();
        setError('This portal is for customers only. Staff must use the Staff Login.');
      } else {
        navigate('/customer/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid phone or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── Left Panel ── */}
      <motion.div
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #080344 0%, #1a0a6b 50%, #534AB7 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full" style={{ background: 'rgba(83,74,183,0.25)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full" style={{ background: 'rgba(8,3,68,0.6)', filter: 'blur(80px)' }} />
        <div className="absolute top-1/2 right-0 w-64 h-64 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', filter: 'blur(40px)' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div>
            <p className="font-black text-white text-lg leading-none" style={{ fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.02em' }}>Raxwo</p>
            <p className="text-white/40 text-[10px] uppercase tracking-widest">Technologies</p>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-6">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white/80 text-xs font-semibold tracking-wide">Customer Portal Active</span>
            </div>
            <h1 className="text-5xl font-black text-white leading-tight mb-4" style={{ fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.03em' }}>
              Your services,<br />
              <span style={{ background: 'linear-gradient(90deg,#a78bfa,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                on demand.
              </span>
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-sm">
              Book professional tech services, track your projects, and manage appointments — all from one powerful portal.
            </p>
          </div>

          {/* Feature Pills */}
          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label, text }) => (
              <div key={label} className="bg-white/08 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mb-3">
                  <Icon size={15} className="text-white/80" />
                </div>
                <p className="text-white text-sm font-bold mb-0.5">{label}</p>
                <p className="text-white/45 text-xs leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-white/25 text-xs">© 2025 Raxwo Technologies Pvt Ltd</p>
        </div>
      </motion.div>

      {/* ── Right Panel ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex-1 flex items-center justify-center p-6 md:p-12"
        style={{ background: '#F4F6FC' }}
      >
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl bg-navy flex items-center justify-center" style={{ background: '#080344' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <div>
              <p className="font-black text-navy text-base leading-none" style={{ fontFamily: 'Poppins, sans-serif', color: '#080344' }}>Raxwo</p>
              <p className="text-slate-400 text-[10px] uppercase tracking-widest">Customer Portal</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl p-8 shadow-2xl" style={{ boxShadow: '0 8px 48px rgba(8,3,68,0.12), 0 0 0 1px rgba(83,74,183,0.06)' }}>
            <div className="mb-8">
              <h2 className="text-2xl font-black mb-1.5" style={{ fontFamily: 'Poppins, sans-serif', color: '#080344', letterSpacing: '-0.03em' }}>
                Welcome back 👋
              </h2>
              <p className="text-slate-500 text-sm">Sign in to your customer account to continue.</p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl p-4 mb-6"
                >
                  <span className="text-rose-500 text-base mt-0.5">⚠</span>
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Phone field */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Phone Number
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 13))}
                    onFocus={() => setFocused('phone')}
                    onBlur={() => setFocused(null)}
                    placeholder="0300 0000000"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border text-sm outline-none transition-all"
                    style={{
                      border: focused === 'phone' ? '1.5px solid #534AB7' : '1.5px solid #e2e8f0',
                      boxShadow: focused === 'phone' ? '0 0 0 4px rgba(83,74,183,0.10)' : 'none',
                    }}
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    placeholder="Your password"
                    className="w-full pl-11 pr-12 py-3.5 rounded-xl border text-sm outline-none transition-all"
                    style={{
                      border: focused === 'password' ? '1.5px solid #534AB7' : '1.5px solid #e2e8f0',
                      boxShadow: focused === 'password' ? '0 0 0 4px rgba(83,74,183,0.10)' : 'none',
                    }}
                    required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3.5 text-sm"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Signing in...</>
                ) : (
                  <>Sign In <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-slate-400 text-xs font-medium">or</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* Links */}
            <div className="space-y-3 text-center text-sm">
              <p className="text-slate-500">
                New customer?{' '}
                <Link to="/register" className="font-bold hover:underline" style={{ color: '#534AB7' }}>
                  Create a free account
                </Link>
              </p>
              <p className="text-slate-400 text-xs">
                Staff member?{' '}
                <Link to="/login" className="text-slate-500 font-semibold hover:underline">
                  Staff Login →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
