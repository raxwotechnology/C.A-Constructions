import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { FiCalendar, FiDollarSign, FiFileText, FiCheck, FiArrowRight, FiCpu, FiSmartphone, FiCloud, FiShield, FiDatabase, FiLayers } from 'react-icons/fi'

const SERVICE_ICONS = { FiCpu, FiSmartphone, FiCloud, FiShield, FiDatabase, FiLayers }

const STATIC_SERVICES = [
  { label: 'Web Development', icon: 'FiCpu', color: 'from-blue-500 to-blue-600' },
  { label: 'Mobile App Development', icon: 'FiSmartphone', color: 'from-green-500 to-green-600' },
  { label: 'Enterprise Systems', icon: 'FiLayers', color: 'from-orange-500 to-orange-600' },
  { label: 'Cloud & DevOps', icon: 'FiCloud', color: 'from-purple-500 to-purple-600' },
  { label: 'Database & Backend', icon: 'FiDatabase', color: 'from-red-500 to-red-600' },
  { label: 'Cybersecurity', icon: 'FiShield', color: 'from-gray-600 to-gray-800' },
]

const STEPS = ['Select Service', 'Project Details', 'Confirmation']

export default function ClientBooking() {
  const [step, setStep] = useState(0)
  const [selectedService, setSelectedService] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm()

  const { data: servicesData } = useQuery({
    queryKey: ['public-services-booking'],
    queryFn: () => api.get('/content/services').then(r => r.data),
  })

  const services = servicesData?.services?.length
    ? servicesData.services.map(s => ({ label: s.title, icon: s.icon || 'FiCpu', color: `from-[${s.colorFrom || '#2563eb'}] to-[${s.colorTo || '#1d4ed8'}]` }))
    : STATIC_SERVICES

  const mutation = useMutation({
    mutationFn: (payload) => api.post('/bookings', payload).then(r => r.data),
    onSuccess: () => setSubmitted(true),
    onError: e => toast.error(e.response?.data?.message || 'Failed to submit booking'),
  })

  const onSubmit = (vals) => {
    mutation.mutate({ ...vals, service: selectedService })
  }

  if (submitted) {
    return (
      <div className="animate-fade-in">
        <section className="bg-gradient-hero pt-32 pb-16">
          <div className="container-max text-center">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheck size={32} className="text-white" />
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-4xl font-bold text-white font-heading mb-4">Booking Submitted!</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
              className="text-white/70 text-lg max-w-xl mx-auto">
              Our team will review your request and contact you within 24 hours to confirm your consultation.
            </motion.p>
          </div>
        </section>
        <section className="section-padding bg-slate-50">
          <div className="container-max max-w-md mx-auto text-center">
            <div className="card card-body">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FiCheck size={20} className="text-emerald-600" />
              </div>
              <h3 className="font-bold text-primary font-heading mb-2">What happens next?</h3>
              <ol className="text-sm text-slate-600 space-y-2 text-left mt-4">
                {['Our team reviews your project brief.', 'We prepare a tailored proposal.', 'You receive a detailed quote within 24h.', 'We schedule a free discovery call.'].map((s, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 bg-secondary text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
              <button onClick={() => { setSubmitted(false); setStep(0); setSelectedService(null) }}
                className="btn-primary w-full justify-center mt-6">Book Another Service <FiArrowRight /></button>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="bg-gradient-hero pt-32 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-20 w-64 h-64 bg-secondary/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-10 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl" />
        </div>
        <div className="container-max relative">
          <p className="text-white/70 text-sm mb-2">Client Portal</p>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">Book a Service</h1>
          <p className="text-white/70 text-lg max-w-xl">Tell us what you need — we'll put together a tailored proposal and connect you with the right team.</p>
        </div>
      </section>

      <section className="section-padding bg-slate-50">
        <div className="container-max max-w-4xl">
          {/* Step indicator */}
          <div className="flex items-center justify-center mb-10">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  i === step ? 'bg-secondary text-white shadow-md' :
                  i < step ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {i < step ? <FiCheck size={13} /> : <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-[10px]">{i + 1}</span>}
                  {s}
                </div>
                {i < STEPS.length - 1 && <div className={`w-8 h-0.5 mx-1 ${i < step ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>

          {/* Step 0: Service Selection */}
          {step === 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-2xl font-bold text-primary font-heading text-center mb-6">What do you need?</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map(s => {
                  const Icon = SERVICE_ICONS[s.icon] || FiCpu
                  return (
                    <motion.button key={s.label} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => { setSelectedService(s.label); setStep(1) }}
                      className={`card p-5 text-left border-2 transition-all duration-200 group ${selectedService === s.label ? 'border-secondary shadow-md' : 'border-transparent hover:border-secondary/40 hover:shadow-sm'}`}>
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <h3 className="font-bold text-primary font-heading text-sm">{s.label}</h3>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">Select <FiArrowRight size={10} /></p>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Step 1: Project Details */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setStep(0)} className="btn-ghost btn-sm">← Back</button>
                <div className="badge badge-blue">{selectedService}</div>
              </div>
              <form onSubmit={handleSubmit(() => setStep(2))} className="card card-body space-y-5">
                <h2 className="text-xl font-bold text-primary font-heading">Project Details</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label flex items-center gap-1.5"><FiCalendar size={12} /> Preferred Start Date *</label>
                    <input type="date" className="form-input" {...register('preferredDate', { required: true })}
                      min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <label className="form-label flex items-center gap-1.5"><FiDollarSign size={12} /> Estimated Budget (LKR) *</label>
                    <input type="number" className="form-input" placeholder="e.g. 250000"
                      {...register('budget', { required: true, min: 1 })} />
                  </div>
                </div>
                <div>
                  <label className="form-label flex items-center gap-1.5"><FiFileText size={12} /> Project Brief *</label>
                  <textarea className="form-input min-h-36 resize-none"
                    placeholder="Describe your project requirements, goals, target audience, and any specific features you need..."
                    {...register('brief', { required: true, minLength: { value: 50, message: 'Please provide at least 50 characters' } })} />
                  {errors.brief && <p className="text-xs text-red-500 mt-1">{errors.brief.message}</p>}
                  <p className="text-xs text-slate-400 mt-1">{watch('brief')?.length || 0} characters (min 50)</p>
                </div>
                <div>
                  <label className="form-label">Additional Notes (optional)</label>
                  <input className="form-input" placeholder="e.g. Preferred tech stack, reference sites, timeline constraints..."
                    {...register('notes')} />
                </div>
                <button type="submit" className="btn-primary w-full justify-center gap-2">
                  Review Booking <FiArrowRight />
                </button>
              </form>
            </motion.div>
          )}

          {/* Step 2: Confirmation */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setStep(1)} className="btn-ghost btn-sm">← Back</button>
              </div>
              <div className="card card-body space-y-5">
                <h2 className="text-xl font-bold text-primary font-heading">Confirm Your Booking</h2>
                <div className="bg-slate-50 rounded-2xl p-5 space-y-3 border border-slate-200">
                  {[
                    { label: 'Service', val: selectedService },
                    { label: 'Preferred Date', val: watch('preferredDate') },
                    { label: 'Budget', val: watch('budget') ? `LKR ${Number(watch('budget')).toLocaleString()}` : '—' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-sm">
                      <span className="text-slate-500">{r.label}</span>
                      <span className="font-semibold text-slate-800">{r.val || '—'}</span>
                    </div>
                  ))}
                  {watch('brief') && (
                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-400 mb-1">Brief</p>
                      <p className="text-sm text-slate-600 line-clamp-4">{watch('brief')}</p>
                    </div>
                  )}
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
                  <p className="font-semibold mb-1">What happens next?</p>
                  <p className="text-blue-600 text-xs">Our team will review your request and reach out within <strong>24 hours</strong> to confirm your consultation and provide a detailed proposal.</p>
                </div>
                <button onClick={handleSubmit(onSubmit)} disabled={mutation.isPending}
                  className="btn-primary w-full justify-center gap-2 py-3 text-base">
                  {mutation.isPending
                    ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                    : <><FiCheck size={16} /> Submit Booking Request</>}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  )
}
