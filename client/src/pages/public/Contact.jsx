import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FiMapPin, FiPhone, FiMail, FiClock, FiSend } from 'react-icons/fi'
import api from '../../lib/api'

export default function Contact() {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const { data: siteData } = useQuery({
    queryKey: ['site-settings-public'],
    queryFn: () => api.get('/site-settings').then((r) => r.data),
  })
  const settings = siteData?.settings || {}

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const fd = new FormData();
      Object.entries(data).forEach(([key, val]) => {
        if (key !== 'cv' && val) fd.append(key, val);
      });
      if (data.cv && data.cv.length > 0) {
        fd.append('cv', data.cv[0]);
      }
      await api.post('/contact/apply', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Application sent! We\'ll get back to you soon.')
      reset()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to send application.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <section className="bg-gradient-hero section-padding pt-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 right-20 w-64 h-64 bg-secondary/15 rounded-full blur-3xl" />
        </div>
        <div className="container-max relative text-center">
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95, filter: 'blur(10px)' }} 
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }} 
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className="flex flex-col items-center"
          >
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="badge bg-white/10 text-white border border-white/20 mb-6 shadow-xl px-4 py-2"
            >
              Get In Touch
            </motion.span>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl lg:text-5xl font-bold text-white font-heading mb-6 tracking-tight drop-shadow-2xl"
            >
              Contact <span className="text-[#20b2f5]">Us</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-white/80 max-w-2xl mx-auto text-xl md:text-2xl leading-relaxed font-normal"
            >
              Ready to start your project? Get a free consultation and quote from our expert team.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-gray-50">
        <div className="container-max">
          <div className="grid lg:grid-cols-3 gap-10">
            {/* Contact Info */}
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-primary font-heading mb-2">Let's Talk</h2>
                <p className="text-gray-500 text-sm leading-relaxed">Fill out the form and our team will respond within one business day.</p>
              </div>
              {/* Info Items */}
              {[
                { icon: FiMapPin, label: 'Company', value: settings.siteName || 'Raxwo Technology' },
                { icon: FiPhone, label: 'Phone', value: settings.contactPhone || '+94 11 234 5678' },
                { icon: FiMail, label: 'Email', value: settings.contactEmail || 'hello@raxwo.com' },
              ].map((info, i) => (
                <motion.div 
                  key={info.label} 
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, type: 'spring' }}
                  className="flex gap-4 hover:translate-x-2 transition-transform cursor-default group"
                >
                  <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-secondary/20 transition-colors">
                    <info.icon className="text-secondary" size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{info.label}</p>
                    <p className="text-gray-700 text-sm whitespace-pre-line">{info.value}</p>
                  </div>
                </motion.div>
              ))}


            </div>

            {/* Form */}
            <div className="lg:col-span-2 card card-body">
              <h3 className="text-xl font-bold text-primary font-heading mb-6">Send Us a Message</h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Full Name *</label>
                    <input {...register('name', { required: 'Required' })} placeholder="John Silva" className="form-input" />
                    {errors.name && <p className="form-error">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="form-label">Email *</label>
                    <input {...register('email', { required: 'Required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })} type="email" placeholder="you@company.com" className="form-input" />
                    {errors.email && <p className="form-error">{errors.email.message}</p>}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Phone</label>
                    <input {...register('phone')} placeholder="+94 77 xxx xxxx" className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Position Applied For *</label>
                    <input {...register('position', { required: 'Required' })} placeholder="e.g. Frontend Developer" className="form-input" />
                    {errors.position && <p className="form-error">{errors.position.message}</p>}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Resume / Portfolio Link</label>
                    <input {...register('resumeLink')} placeholder="https://linkedin.com/in/..." className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Upload Resume (PDF)</label>
                    <input {...register('cv')} type="file" accept=".pdf,.doc,.docx" className="form-input py-2" />
                  </div>
                </div>
                <div>
                  <label className="form-label">Cover Letter / Message *</label>
                  <textarea {...register('message', { required: 'Required', minLength: { value: 20, message: 'Min 20 characters' } })}
                    rows={5} placeholder="Tell us why you are a great fit for this position..." className="form-input resize-none" />
                  {errors.message && <p className="form-error">{errors.message.message}</p>}
                </div>
                <button type="submit" disabled={loading} className="btn-primary btn-lg w-full justify-center">
                  {loading ? <span className="spinner" /> : <><FiSend size={16} /> Submit Application</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
