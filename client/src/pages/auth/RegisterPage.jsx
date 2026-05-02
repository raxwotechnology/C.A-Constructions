import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';
import { Building2, Loader2, User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '', userType: 'customer' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [focused, setFocused] = useState(null);
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      if (user.userType === 'customer') navigate('/customer/dashboard');
      else navigate('/dashboard');
    }
  }, [user, token, navigate]);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.register(form);
      if (res.data.success) {
        toast.success('Account created! Please login.');
        navigate('/customer/login');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden py-10 px-4">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[100px]"
          style={{ background: 'linear-gradient(135deg, #534AB7, #080344)' }} />
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[100px]"
          style={{ background: 'linear-gradient(135deg, #080344, #534AB7)' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-2xl relative z-10"
      >
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Side: Branding */}
          <div className="md:w-5/12 p-8 text-white flex flex-col justify-between"
               style={{ background: 'linear-gradient(145deg, #080344 0%, #1a0a6b 50%, #534AB7 100%)' }}>
            <div>
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/20">
                <Building2 size={24} className="text-white" />
              </div>
              <h2 className="text-3xl font-black mb-3 leading-tight">Join Raxwo<br/>Technologies</h2>
              <p className="text-white/70 text-sm leading-relaxed mb-8">
                Create a free account to book professional tech services, track projects, and manage appointments.
              </p>
            </div>
            
            <div className="space-y-4">
              {[
                { label: 'Instant Booking', desc: 'Secure consultations instantly' },
                { label: 'Project Tracking', desc: 'Monitor progress in real-time' },
                { label: '24/7 Support', desc: 'Always here to help you' }
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-brand-400" />
                  <div>
                    <p className="text-sm font-bold">{feature.label}</p>
                    <p className="text-xs text-white/50">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="md:w-7/12 p-8 lg:p-10 bg-white">
            <div className="mb-8">
              <h3 className="text-2xl font-black text-slate-800 mb-1">Create Account</h3>
              <p className="text-sm text-slate-500">Get started with your free customer portal.</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex gap-3 animate-in">
                <span className="text-red-500 font-bold">⚠</span>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5">
                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      name="fullName" value={form.fullName} onChange={handleChange}
                      onFocus={() => setFocused('fullName')} onBlur={() => setFocused(null)}
                      placeholder="John Doe"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                      style={{ border: focused === 'fullName' ? '1.5px solid #534AB7' : '1.5px solid #e2e8f0' }}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Phone */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        name="phone" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 13) }))}
                        onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)}
                        placeholder="0300 0000000"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                        style={{ border: focused === 'phone' ? '1.5px solid #534AB7' : '1.5px solid #e2e8f0' }}
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        name="email" type="email" value={form.email} onChange={handleChange}
                        onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                        placeholder="you@email.com"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                        style={{ border: focused === 'email' ? '1.5px solid #534AB7' : '1.5px solid #e2e8f0' }}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Password */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        name="password" type={showPass ? 'text' : 'password'} value={form.password} onChange={handleChange}
                        onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                        placeholder="Min 6 chars"
                        className="w-full pl-11 pr-10 py-3 rounded-xl border text-sm outline-none transition-all"
                        style={{ border: focused === 'password' ? '1.5px solid #534AB7' : '1.5px solid #e2e8f0' }}
                        required minLength={6}
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Confirm Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        name="confirmPassword" type={showConfirmPass ? 'text' : 'password'} value={form.confirmPassword} onChange={handleChange}
                        onFocus={() => setFocused('confirmPassword')} onBlur={() => setFocused(null)}
                        placeholder="Repeat password"
                        className="w-full pl-11 pr-10 py-3 rounded-xl border text-sm outline-none transition-all"
                        style={{ border: focused === 'confirmPassword' ? '1.5px solid #534AB7' : '1.5px solid #e2e8f0' }}
                        required
                      />
                      <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-3.5 text-sm font-bold shadow-xl"
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Creating Account...</> : <>Create Account <ArrowRight size={16} /></>}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-slate-500 text-sm">
                Already have an account?{' '}
                <Link to="/customer/login" className="font-bold hover:underline" style={{ color: '#534AB7' }}>
                  Sign in securely
                </Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
