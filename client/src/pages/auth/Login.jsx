import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi'

export default function Login() {
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const user = await login(data.email, data.password)
      toast.success(`Welcome back, ${user.name}!`)
      const redirect = {
        admin: '/admin',
        manager: '/manager',
        developer: '/developer',
        employee: '/employee',
        hr: '/manager',
        client: '/my-projects',
      }
      navigate(redirect[user.role] || '/login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-16">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-blue flex items-center justify-center shadow-blue">
            <span className="text-white font-bold text-xl font-heading">R</span>
          </div>
          <div>
            <span className="font-heading font-bold text-white text-2xl">Raxwo</span>
            <p className="text-white/50 text-xs">Pvt Ltd</p>
          </div>
        </Link>

        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold text-white font-heading leading-tight mb-6"
          >
            Innovating the<br />
            <span className="text-gradient">Future of</span><br />
            Software
          </motion.h1>
          <p className="text-white/60 text-lg max-w-md">
            Your all-in-one platform for HR management, project tracking, recruitment, and client relations.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-10">
            {[
              { num: '50+', label: 'Projects Delivered' },
              { num: '120+', label: 'Satisfied Clients' },
              { num: '35+', label: 'Team Members' },
              { num: '5+', label: 'Years Experience' },
            ].map(s => (
              <div key={s.label} className="glass-card p-4">
                <p className="text-3xl font-bold text-white font-heading">{s.num}</p>
                <p className="text-white/50 text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-sm">© {new Date().getFullYear()} Raxwo Pvt Ltd — Colombo, Sri Lanka</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8 bg-white lg:rounded-l-3xl">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-blue flex items-center justify-center">
              <span className="text-white font-bold font-heading">R</span>
            </div>
            <span className="font-heading font-bold text-primary text-xl">Raxwo Pvt Ltd</span>
          </div>

          <h2 className="text-3xl font-bold text-primary font-heading mb-1">Welcome back</h2>
          <p className="text-gray-500 mb-8">Sign in to your portal</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="form-label">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  {...register('email', { required: 'Email is required' })}
                  type="email"
                  placeholder="you@raxwo.com"
                  className="form-input pl-10"
                />
              </div>
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="form-input pl-10 pr-10"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? <span className="spinner" /> : <>Sign In <FiArrowRight size={16} /></>}
            </button>
          </form>



          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-secondary font-medium hover:underline">Sign up</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
