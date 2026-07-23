import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiCheckCircle, FiShield, FiCompass } from 'react-icons/fi'
import SiteLogo from '../../components/branding/SiteLogo'

export default function Login() {
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { email: 'racreationshd@gmail.com', password: '' }
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const user = await login(data.email, data.password)
      toast.success(`Welcome back, ${user.name}!`)
      const redirect = {
        admin: '/admin',
        manager: '/manager',
        developer: '/developer',
        designer: '/designer',
        marketing: '/marketing',
        client: '/my-dashboard',
      }
      const dest = redirect[user.role]
      if (!dest) {
        toast.error(`No dashboard configured for role "${user.role}"`)
        return
      }
      navigate(dest)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100/70 to-amber-50/30 text-slate-800 flex flex-col lg:flex-row relative overflow-hidden font-sans">
      {/* Background Soft Glow Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[450px] h-[450px] bg-blue-400/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 right-10 w-96 h-96 bg-orange-400/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Blueprint Subtle Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none" />

      {/* Left Panel - Construction Showcase */}
      <div className="flex-1 flex flex-col justify-between p-8 sm:p-12 lg:p-16 relative z-10">
        <div>
          <div className="flex items-center justify-between">
            <SiteLogo to="/" variant="light" />
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-slate-200/80 text-xs text-amber-700 font-semibold shadow-sm backdrop-blur-md">
              <FiShield size={14} className="text-amber-600" /> Authorized Portal
            </div>
          </div>

          <div className="mt-10 lg:mt-16 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100/80 border border-amber-300/60 text-amber-900 text-xs font-bold uppercase tracking-wider mb-6 shadow-xs"
            >
              <FiCompass className="animate-spin-slow text-amber-600" size={14} /> Construction & Architecture ERP
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black font-heading leading-[1.1] tracking-tight text-slate-900 mb-6"
            >
              BUILDING YOUR <br />
              <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 bg-clip-text text-transparent">
                DREAM HOME &
              </span> <br />
              STRUCTURES
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl mb-10"
            >
              Enterprise Management System for <strong className="text-slate-900">R A Creations & Home Designs</strong>. Managing 3D Architectural Designs, Turnkey House Construction, BOQs, Site Operations & Client Projects.
            </motion.p>

            {/* Feature Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10"
            >
              {[
                { title: 'Turnkey Construction', desc: 'Foundation to Handover' },
                { title: '3D Architecture', desc: 'Floor Plans & Elevations' },
                { title: 'BOQ & Estimations', desc: 'Accurate Cost Control' },
              ].map((feat) => (
                <div key={feat.title} className="p-3.5 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 text-amber-700 text-xs font-bold mb-1">
                    <FiCheckCircle size={14} className="text-amber-600" /> {feat.title}
                  </div>
                  <p className="text-slate-500 text-[11px]">{feat.desc}</p>
                </div>
              ))}
            </motion.div>

            {/* Stats Counters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-4 gap-3 sm:gap-4 p-5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm backdrop-blur-md"
            >
              {[
                { num: '250+', label: 'Projects' },
                { num: '500+', label: 'Clients' },
                { num: '45+', label: 'Engineers' },
                { num: '10+', label: 'Years' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-xl sm:text-2xl font-black text-amber-700 font-heading">{s.num}</p>
                  <p className="text-slate-500 text-[10px] sm:text-xs font-medium uppercase tracking-wider mt-0.5">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Company Contact Details Footer */}
        <div className="mt-12 pt-6 border-t border-slate-200/80 text-xs text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-bold text-slate-800">R A Creations & Home Designs</p>
            <p className="text-[11px] text-slate-500">Colombo & Island-wide Construction Services</p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>📞 0770749690</span>
            <span>✉️ racreationshd@gmail.com</span>
            <a href="http://www.rach.lk" target="_blank" rel="noreferrer" className="text-amber-700 font-medium hover:underline">www.rach.lk</a>
          </div>
        </div>
      </div>

      {/* Right Panel - Light Mode Form Card */}
      <div className="w-full lg:w-[480px] shrink-0 p-6 sm:p-10 flex flex-col justify-center relative z-20 bg-white/95 border-l border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md mx-auto"
        >
          <div className="lg:hidden mb-8 flex justify-center">
            <SiteLogo to="/" variant="light" />
          </div>

          <div className="mb-8 text-center sm:text-left">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1 block">Portal Authentication</span>
            <h2 className="text-3xl font-black text-slate-900 font-heading tracking-tight">Sign In</h2>
            <p className="text-slate-500 text-sm mt-1">Access your R A Creations & Home Designs Account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-600 transition-colors">
                  <FiMail size={16} />
                </div>
                <input
                  {...register('email', { required: 'Email is required' })}
                  type="email"
                  placeholder="racreationshd@gmail.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-medium"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <Link to="/forgot-password" className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-600 transition-colors">
                  <FiLock size={16} />
                </div>
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-sm rounded-xl shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 mt-6 cursor-pointer"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <>
                  Sign In to System <FiArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              New client?{' '}
              <Link to="/register" className="font-bold text-amber-700 hover:text-amber-800 transition-colors">
                Register for Client Portal
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
