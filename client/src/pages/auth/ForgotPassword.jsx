import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiMail, FiPhone, FiLock, FiArrowLeft, FiArrowRight, FiCheckCircle } from 'react-icons/fi'
import { validateStrongPassword, passwordStrengthHints } from '../../lib/passwordValidation'

const STEPS = { IDENTIFIER: 1, OTP: 2, RESET: 3 }

export default function ForgotPassword() {
  const [step, setStep] = useState(STEPS.IDENTIFIER)
  const [identifier, setIdentifier] = useState('')
  const [channel, setChannel] = useState('email') // 'email' | 'sms'
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const newPassword = watch('password', '')

  const sendOtp = async (data) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password/otp', {
        identifier: data.identifier,
        channel,
      })
      setIdentifier(data.identifier.trim())
      if (res.data.devOtp) toast.success(`Dev OTP: ${res.data.devOtp}`, { duration: 12000 })
      else toast.success(res.data.message || 'Verification code sent')
      setStep(STEPS.OTP)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send verification code')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    if (!otp || otp.length < 6) {
      toast.error('Enter the 6-digit code sent to you')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/forgot-password/verify-otp', { identifier, otp })
      toast.success('Code verified')
      setStep(STEPS.RESET)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (data) => {
    const strengthErr = validateStrongPassword(data.password)
    if (strengthErr) {
      toast.error(strengthErr)
      return
    }
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/forgot-password/reset', { identifier, otp, password: data.password })
      toast.success('Password reset successfully. You can sign in now.')
      window.location.href = '/login'
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
      >
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-secondary mb-6">
          <FiArrowLeft size={14} /> Back to sign in
        </Link>

        <h1 className="text-2xl font-bold text-primary font-heading mb-1">Forgot password</h1>
        <p className="text-gray-500 text-sm mb-6">
          {step === STEPS.IDENTIFIER && 'Enter your Email Address or Phone Number and select how to receive your verification OTP code.'}
          {step === STEPS.OTP && `We sent a 6-digit code via ${channel === 'sms' ? 'SMS' : 'Email'} to ${identifier}`}
          {step === STEPS.RESET && 'Choose a new password for your account.'}
        </p>

        {step === STEPS.IDENTIFIER && (
          <form onSubmit={handleSubmit(sendOtp)} className="space-y-5">
            <div>
              <label className="form-label">Email Address or Phone Number</label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  {...register('identifier', { required: 'Email address or Phone number is required' })}
                  type="text"
                  placeholder="e.g. user@example.com or 077XXXXXXX"
                  className="form-input !pl-10"
                />
              </div>
              {errors.identifier && <p className="form-error">{errors.identifier.message}</p>}
            </div>

            {/* OTP Channel Choice */}
            <div>
              <label className="form-label mb-2 block font-semibold text-slate-700">Receive Verification Code via:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setChannel('email')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                    channel === 'email'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FiMail size={16} className={channel === 'email' ? 'text-amber-600' : 'text-slate-400'} />
                  <span>Email</span>
                  {channel === 'email' && <FiCheckCircle size={14} className="text-amber-600 ml-auto" />}
                </button>

                <button
                  type="button"
                  onClick={() => setChannel('sms')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                    channel === 'sms'
                      ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FiPhone size={16} className={channel === 'sms' ? 'text-amber-600' : 'text-slate-400'} />
                  <span>Phone SMS</span>
                  {channel === 'sms' && <FiCheckCircle size={14} className="text-amber-600 ml-auto" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? <span className="spinner" /> : <>Send Verification Code <FiArrowRight size={16} /></>}
            </button>
          </form>
        )}

        {step === STEPS.OTP && (
          <div className="space-y-5">
            <div>
              <label className="form-label">6-Digit Verification Code</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                placeholder="6-digit code"
                className="form-input text-center text-lg tracking-[0.4em] font-mono"
                maxLength={6}
              />
            </div>
            <button type="button" onClick={verifyOtp} disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? <span className="spinner" /> : 'Verify Code'}
            </button>
            <button type="button" onClick={() => setStep(STEPS.IDENTIFIER)} className="btn-ghost w-full justify-center text-sm">
              Use a different contact method
            </button>
          </div>
        )}

        {step === STEPS.RESET && (
          <form onSubmit={handleSubmit(resetPassword)} className="space-y-5">
            <div>
              <label className="form-label">New Password</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  {...register('password', { required: 'Password is required' })}
                  type="password"
                  className="form-input !pl-10"
                  placeholder="••••••••"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{passwordStrengthHints()}</p>
            </div>
            <div>
              <label className="form-label">Confirm New Password</label>
              <input
                {...register('confirmPassword', { required: 'Please confirm your password' })}
                type="password"
                className="form-input"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={loading || !newPassword} className="btn-primary w-full justify-center py-3">
              {loading ? <span className="spinner" /> : 'Reset Password'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
