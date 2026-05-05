import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { FiMapPin, FiPhone, FiMail, FiClock, FiSend } from 'react-icons/fi'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../../lib/api'

export default function Contact() {
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const { data: siteData } = useQuery({
    queryKey: ['site-settings-public'],
    queryFn: () => api.get('/site-settings').then((r) => r.data),
  })
  const settings = siteData?.settings || {}
  const mapLat = Number(settings.mapLat ?? 7.0289)
  const mapLng = Number(settings.mapLng ?? 80.0153)
  const mapZoom = Number(settings.mapZoom ?? 13)
  const contactAddress = settings.contactAddress || 'Weliweriya, Sri Lanka'

  const onSubmit = async (data) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    toast.success('Message sent! We\'ll get back to you within 24 hours.')
    reset()
    setLoading(false)
  }

  return (
    <div>
      <section className="bg-gradient-hero section-padding pt-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 right-20 w-64 h-64 bg-secondary/15 rounded-full blur-3xl" />
        </div>
        <div className="container-max relative text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="badge bg-white/10 text-white border border-white/20 mb-4">Get In Touch</span>
            <h1 className="text-5xl font-bold text-white font-heading mb-4">Contact Us</h1>
            <p className="text-white/70 max-w-2xl mx-auto text-lg">Ready to start your project? Get a free consultation and quote from our expert team.</p>
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
              {[
                { icon: FiMapPin, label: 'Address', value: contactAddress },
                { icon: FiPhone, label: 'Phone', value: settings.contactPhone || '+94 11 234 5678' },
                { icon: FiMail, label: 'Email', value: settings.contactEmail || 'hello@raxwo.com' },
                { icon: FiClock, label: 'Hours', value: 'Mon – Fri: 8AM – 6PM\nSat: 9AM – 1PM (IST)' },
              ].map(info => (
                <div key={info.label} className="flex gap-4">
                  <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <info.icon className="text-secondary" size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{info.label}</p>
                    <p className="text-gray-700 text-sm whitespace-pre-line">{info.value}</p>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl overflow-hidden h-64 border border-slate-200 shadow-card">
                <MapContainer center={[mapLat, mapLng]} zoom={mapZoom} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <CircleMarker center={[mapLat, mapLng]} radius={10} pathOptions={{ color: '#2563EB', fillColor: '#2563EB', fillOpacity: 0.7 }}>
                    <Popup>{contactAddress}</Popup>
                  </CircleMarker>
                </MapContainer>
              </div>
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
                    <label className="form-label">Company</label>
                    <input {...register('company')} placeholder="Your company name" className="form-input" />
                  </div>
                </div>
                <div>
                  <label className="form-label">Service Interested In</label>
                  <select {...register('service')} className="form-select">
                    <option value="">Select a service...</option>
                    {['Web Development', 'Mobile App Development', 'Cloud & DevOps', 'Enterprise Systems', 'Database & Backend', 'Cybersecurity', 'IT Consulting', 'Other'].map(s => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Project Budget (LKR)</label>
                  <select {...register('budget')} className="form-select">
                    <option value="">Select budget range...</option>
                    {['Under 100,000', '100,000 – 300,000', '300,000 – 500,000', '500,000 – 1,000,000', 'Over 1,000,000'].map(b => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Message *</label>
                  <textarea {...register('message', { required: 'Required', minLength: { value: 20, message: 'Min 20 characters' } })}
                    rows={5} placeholder="Describe your project requirements, timeline, and any specific needs..." className="form-input resize-none" />
                  {errors.message && <p className="form-error">{errors.message.message}</p>}
                </div>
                <button type="submit" disabled={loading} className="btn-primary btn-lg w-full justify-center">
                  {loading ? <span className="spinner" /> : <><FiSend size={16} /> Send Message</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
