import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiUser } from 'react-icons/fi'

export default function HomeSignInForm() {
  const { login, register: registerUser } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm()

  const switchMode = (newMode) => {
    setMode(newMode)
    reset()
    setShowPass(false)
  }

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      if (mode === 'signin') {
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
      } else {
        await registerUser({
          name: data.name,
          email: data.email,
          password: data.password,
          role: 'client',
          referralCode: data.referralCode || '',
        })
        toast.success('Account created! Welcome to Raxwo Portal')
        navigate('/my-dashboard')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || (mode === 'signin' ? 'Login failed' : 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'form-input !pl-10 bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-primary focus:ring-primary/20'

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative z-20 w-full max-w-md mx-auto lg:ml-auto bg-white rounded-2xl p-8 shadow-2xl border border-slate-100"
    >
      <div className="flex bg-slate-100 rounded-xl p-1 mb-7 gap-1">
        {['signin', 'signup'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => switchMode(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              mode === tab
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {mode === 'signin' ? (
            <>
              <h2 className="text-2xl font-bold text-primary font-heading mb-1">Welcome back</h2>
              <p className="text-slate-500 mb-6 text-sm">Sign in to your portal</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-primary font-heading mb-1">Create Account</h2>
              <p className="text-slate-500 mb-6 text-sm">Register as a client to get started</p>
            </>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name — signup only */}
            {mode === 'signup' && (
              <div>
                <label className="form-label text-slate-700">Full Name</label>
                <div className="relative">
                  <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    {...register('name', { required: 'Name is required' })}
                    type="text"
                    placeholder="Your full name"
                    className={inputClass}
                  />
                </div>
                {errors.name && <p className="form-error text-red-300">{errors.name.message}</p>}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="form-label text-slate-700">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  {...register('email', { required: 'Email is required' })}
                  type="email"
                  placeholder="you@raxwo.com"
                  className={inputClass}
                />
              </div>
              {errors.email && <p className="form-error text-red-300">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="form-label text-slate-700">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: mode === 'signup' ? { value: 6, message: 'Minimum 6 characters' } : undefined,
                  })}
                  type={showPass ? 'text' : 'password'}
                  placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
                  className={`${inputClass} pr-10`}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary">
                  {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              {errors.password && <p className="form-error text-red-300">{errors.password.message}</p>}
            </div>

            {/* Referral — signup only */}
            {mode === 'signup' && (
              <div>
                <label className="form-label text-slate-700">Referral Code <span className="text-slate-400">(optional)</span></label>
                <div className="relative">
                  <input
                    {...register('referralCode')}
                    type="text"
                    placeholder="Enter referral code"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* Forgot password — signin only */}
            {mode === 'signin' && (
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-slate-500 hover:text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 mt-1 shadow-md text-white"
            >
              {loading
                ? <span className="spinner border-white" />
                : <>{mode === 'signin' ? 'Sign In' : 'Create Account'} <FiArrowRight size={16} /></>
              }
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            {mode === 'signin' ? (
              <>Don't have an account?{' '}
                <button onClick={() => switchMode('signup')} className="text-secondary font-medium hover:underline">Sign up</button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => switchMode('signin')} className="text-secondary font-medium hover:underline">Sign in</button>
              </>
            )}
          </p>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
