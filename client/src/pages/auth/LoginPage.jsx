import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Shield, Lock, Globe, Building2, Loader2, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { login, logout, loading, error, user, token } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (user && token) {
      if (user.userType === 'customer') navigate('/customer/dashboard');
      else navigate('/dashboard');
    }
  }, [user, token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!phone || !password) {
      setLocalError('Please enter your phone number and password.');
      return;
    }
    try {
      const data = await login(phone, password);
      if (data.user?.userType === 'customer') {
        login('', ''); // hack to trigger logout/clear if needed, or better call logout directly if it was available.
        // wait, I can just use `logout()` from useAuth
        logout();
        setLocalError('Access denied: Customers must use the Customer Portal to login.');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setLocalError(err.message || 'Invalid phone or password. Please try again.');
    }
  };

  const err = localError || error;

  return (
    <div className="min-h-screen flex bg-white font-poppins">
      {/* Left Panel */}
      <motion.div
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:flex lg:w-[55%] bg-navy relative overflow-hidden flex-col items-center justify-center p-12"
      >
        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute bottom-[-60px] left-[-60px] w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-[-40px] w-32 h-32 bg-purple/20 rounded-full" />

        <div className="relative z-10 text-center max-w-md">
          {/* Logo circle */}
          <div className="w-28 h-28 bg-black/90 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-2xl">
            <Building2 size={48} className="text-white" />
          </div>

          <h1 className="text-5xl font-black text-white tracking-tight mb-1">Raxwo</h1>
          <p className="text-lg font-semibold text-white/80 uppercase tracking-widest mb-3">Technologies</p>
          <p className="text-white/60 text-sm leading-relaxed mb-10">Empowering Global Innovation</p>

          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { label: 'Employees', value: '50+' },
              { label: 'Projects', value: '200+' },
              { label: 'Clients', value: '100+' },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-white/60 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <Link
            to="/customer/login"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-green-500/30"
          >
            <Users size={16} />
            Customer Portal
          </Link>
        </div>
      </motion.div>

      {/* Right Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex-1 flex items-center justify-center p-8"
      >
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-navy rounded-xl flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <p className="font-black text-navy text-lg leading-tight">Raxwo</p>
              <p className="text-xs text-gray-500">Technologies</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-8">Sign in to your account to continue</p>

          {err && (
            <div className="alert-error mb-5">
              <span className="text-red-500">⚠</span>
              <span>{err}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 13))}
                placeholder="Enter your phone number"
                className="form-input h-11"
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="form-input h-11 pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-11 text-sm font-semibold justify-center"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Signing in...</> : 'Sign In Securely'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 mb-3">New to Raxwo?{' '}
              <Link to="/register" className="text-navy font-semibold hover:underline">Create account</Link>
            </p>
          </div>

          {/* Security badges */}
          <div className="flex items-center justify-center gap-4 mt-4">
            {[{ icon: Shield, label: 'SSL Secured' }, { icon: Lock, label: '256-bit' }, { icon: Globe, label: 'Global Access' }].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1 text-gray-400 text-xs">
                <Icon size={11} />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">© 2025 Raxwo (Pvt) Ltd. All rights reserved.</p>
        </div>
      </motion.div>
    </div>
  );
}
