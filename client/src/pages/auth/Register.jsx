import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi'

export default function Register() {
  const { register: registerUser } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const user = await registerUser({ name: data.name, email: data.email, password: data.password, role: 'client' })
      toast.success('Account created! Welcome to Raxwo Portal')
      navigate('/my-projects')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10"
      >
        <Link to="/" className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-blue flex items-center justify-center shadow-blue">
            <span className="text-white font-bold font-heading">R</span>
          </div>
          <span className="font-heading font-bold text-primary text-xl">Raxwo Pvt Ltd</span>
        </Link>

        <h2 className="text-2xl font-bold text-primary font-heading mb-1">Create Account</h2>
        <p className="text-gray-500 mb-8 text-sm">Register as a client to access the portal</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="form-label">Full Name</label>
            <div className="relative">
              <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input {...register('name', { required: 'Name is required' })} placeholder="Your full name" className="form-input pl-10" />
            </div>
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>

          <div>
            <label className="form-label">Email Address</label>
            <div className="relative">
              <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input {...register('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })} type="email" placeholder="you@company.com" className="form-input pl-10" />
            </div>
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>

          <div>
            <label className="form-label">Password</label>
            <div className="relative">
              <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input {...register('password', { required: 'Password required', minLength: { value: 6, message: 'Min 6 characters' } })} type={showPass ? 'text' : 'password'} placeholder="Min 6 characters" className="form-input pl-10 pr-10" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>

          <div>
            <label className="form-label">Confirm Password</label>
            <div className="relative">
              <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input {...register('confirmPassword', { validate: v => v === watch('password') || 'Passwords do not match' })} type="password" placeholder="Repeat password" className="form-input pl-10" />
            </div>
            {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
            {loading ? <span className="spinner" /> : <>Create Account <FiArrowRight size={16} /></>}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-secondary font-medium hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
