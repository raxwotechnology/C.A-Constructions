import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import {
  FiCheck, FiStar, FiLayers, FiArrowRight, FiX,
  FiGrid, FiList, FiFilter, FiPackage
} from 'react-icons/fi'

const BILLING_LABEL = {
  'one-time': 'One-time', monthly: '/mo', quarterly: '/qtr', yearly: '/yr',
}

/* ─── Feedback Modal ────────────────────────────────────────────── */
function FeedbackModal({ service, onClose }) {
  const { user } = useAuthStore()
  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const [loading, setLoading] = useState(false)
  const [rating, setRating] = useState(0)

  const onSubmit = async (data) => {
    if (!rating) return toast.error('Please pick a star rating')
    setLoading(true)
    try {
      await api.post('/feedback', {
        ...data,
        rating,
        service: service._id,
        name: user?.name || data.name || 'Anonymous',
        email: user?.email || data.email || '',
      })
      toast.success('Thanks for your feedback!')
      reset(); setRating(0); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50">
          <div>
            <h3 className="font-bold text-lg text-primary">Give Feedback</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              For: <span className="font-semibold text-secondary">{service.title}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl border border-slate-200 transition-all">
            <FiX size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!user && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Name</label>
                  <input {...register('name')} className="form-input" placeholder="Your name" />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input {...register('email')} type="email" className="form-input" placeholder="your@email.com" />
                </div>
              </div>
            )}
            <div>
              <label className="form-label">Rating <span className="text-red-500">*</span></label>
              <div className="flex gap-2 mt-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button type="button" key={s} onClick={() => setRating(s)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      rating >= s ? 'bg-amber-400 text-white shadow-md scale-110' : 'bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-400'
                    }`}
                  >
                    <FiStar size={16} className={rating >= s ? 'fill-current' : ''} />
                  </button>
                ))}
                {rating > 0 && <span className="self-center ml-1 text-sm font-semibold text-amber-500">{['','Poor','Fair','Good','Great','Excellent'][rating]}</span>}
              </div>
            </div>
            <div>
              <label className="form-label">Message <span className="text-red-500">*</span></label>
              <textarea {...register('message', { required: 'Please write your feedback' })} className="form-input resize-none" rows={4} placeholder="Tell us what you think..." />
              {errors.message && <p className="form-error">{errors.message.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? <span className="spinner" /> : 'Submit Feedback'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Package Card ─────────────────────────────────────────────── */
function PackageCard({ pkg, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className={`relative rounded-2xl border overflow-hidden flex flex-col ${pkg.isPopular ? 'border-secondary shadow-lg scale-[1.02] z-10' : 'border-slate-200 bg-white'}`}>
      {pkg.isPopular && (
        <div className="bg-gradient-to-r from-secondary to-blue-600 text-white text-center py-1.5 text-xs font-bold tracking-wider">
          {pkg.promotionLabel || '⭐ MOST POPULAR'}
        </div>
      )}
      <div className={`p-6 flex-1 flex flex-col ${pkg.isPopular ? 'bg-gradient-to-br from-blue-50 to-white' : 'bg-white'}`}>
        <h3 className="font-bold text-primary text-lg mb-1">{pkg.name}</h3>
        <div className="mb-4">
          {pkg.discount > 0 && <p className="text-xs text-slate-400 line-through">{pkg.currency} {Number(pkg.price / (1 - pkg.discount / 100)).toLocaleString()}</p>}
          <div className="flex items-end gap-1">
            <span className="text-sm font-semibold text-slate-500">{pkg.currency}</span>
            <span className="text-3xl font-black text-primary">{Number(pkg.price).toLocaleString()}</span>
            <span className="text-sm text-slate-400 mb-1">{BILLING_LABEL[pkg.billingCycle] || ''}</span>
          </div>
          {pkg.discount > 0 && <span className="inline-block text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full mt-1">{pkg.discount}% off</span>}
          {pkg.duration && <p className="text-xs text-slate-400 mt-1">Duration: {pkg.duration}</p>}
        </div>
        <ul className="space-y-2 flex-1 mb-6">
          {(pkg.features || []).map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <FiCheck size={13} className={`mt-0.5 shrink-0 ${pkg.isPopular ? 'text-secondary' : 'text-emerald-500'}`} /> {f}
            </li>
          ))}
        </ul>
        <a href="mailto:info@raxwo.com" className={`w-full py-2.5 rounded-xl text-sm font-bold text-center transition-all flex items-center justify-center gap-2 ${
          pkg.isPopular ? 'bg-gradient-to-r from-secondary to-blue-600 text-white hover:brightness-110 shadow-md' : 'border-2 border-secondary text-secondary hover:bg-secondary hover:text-white'
        }`}>
          Get Started <FiArrowRight size={14} />
        </a>
      </div>
    </motion.div>
  )
}

/* ─── Service Card (grid view) ─────────────────────────────────── */
function ServiceCard({ service, onFeedback }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card border border-slate-200 overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      {service.imageUrl && <img src={service.imageUrl} alt={service.title} className="w-full h-36 object-cover border-b border-slate-100" />}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-primary text-lg">{service.title}</h3>
          {service.category && <span className="badge bg-blue-50 text-blue-600 text-[10px] border border-blue-100 shrink-0">{service.category}</span>}
        </div>
        <p className="text-sm text-slate-500 mb-3 leading-relaxed">{service.description}</p>
        {service.priceText && <p className="text-secondary font-bold text-sm mb-3">{service.priceText}</p>}
        {service.features?.length > 0 && (
          <ul className="space-y-1.5 mb-4">
            {service.features.slice(0, 4).map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                <FiCheck size={12} className="text-emerald-500 shrink-0" /> {f}
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <a href="mailto:info@raxwo.com" className="btn-outline btn-sm flex-1 justify-center text-xs">Enquire</a>
          <button onClick={() => onFeedback(service)} className="btn-ghost btn-sm px-3 text-amber-500 hover:bg-amber-50 border border-amber-100">
            <FiStar size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Main Page ────────────────────────────────────────────────── */
export default function ClientServices() {
  const [feedbackService, setFeedbackService] = useState(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [viewMode, setViewMode] = useState('category') // 'category' | 'grid'

  const { data, isLoading } = useQuery({
    queryKey: ['client-services'],
    queryFn: () => api.get('/content/services').then(r => r.data),
  })

  const services = data?.services || []

  // Build category list
  const categories = ['All', ...Array.from(new Set(services.map(s => s.category).filter(Boolean)))]
  const hasCategories = categories.length > 1

  // Filtered services
  const filtered = activeCategory === 'All'
    ? services
    : services.filter(s => s.category === activeCategory)

  const withPackages = filtered.filter(s => s.packages?.length > 0)
  const withoutPackages = filtered.filter(s => !s.packages?.length)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Our Services & Packages</h1>
          <p className="page-subtitle">Explore what we offer and choose the right package for you.</p>
        </div>
        {hasCategories && (
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button onClick={() => setViewMode('category')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${viewMode === 'category' ? 'bg-white shadow text-secondary' : 'text-slate-500'}`}>
              <FiList size={12} /> Categories
            </button>
            <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${viewMode === 'grid' ? 'bg-white shadow text-secondary' : 'text-slate-500'}`}>
              <FiGrid size={12} /> All
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" />
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-slate-200">
          <FiLayers size={44} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Services are coming soon.</p>
        </div>
      ) : (
        <>
          {/* Category filter tabs */}
          {hasCategories && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
              <FiFilter size={13} className="text-slate-400 shrink-0" />
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    activeCategory === cat
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/30 hover:text-primary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={`${activeCategory}-${viewMode}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* ── Category view (default): grouped by service with packages ── */}
              {viewMode === 'category' ? (
                <div className="space-y-12">
                  {withPackages.map((service, si) => (
                    <motion.div key={service._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.08 }}>
                      <div className="mb-6 text-center">
                        {service.imageUrl && <img src={service.imageUrl} alt={service.title} className="w-14 h-14 rounded-2xl object-cover mx-auto mb-3 border border-slate-200" />}
                        <div className="flex items-center justify-center gap-2 mb-1">
                          {service.category && <span className="badge bg-blue-50 text-blue-700 text-xs border border-blue-100">{service.category}</span>}
                        </div>
                        <h2 className="text-2xl font-black text-primary font-heading">{service.title}</h2>
                        <p className="text-slate-500 mt-1 max-w-xl mx-auto text-sm">{service.description}</p>
                        <button onClick={() => setFeedbackService(service)} className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-amber-500 hover:text-amber-600 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 transition-all">
                          <FiStar size={11} /> Give Feedback
                        </button>
                      </div>
                      <div className={`grid gap-6 ${service.packages.length === 1 ? 'max-w-sm mx-auto' : service.packages.length === 2 ? 'sm:grid-cols-2 max-w-2xl mx-auto' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
                        {service.packages.map((pkg, pi) => (
                          <PackageCard key={pkg._id} pkg={pkg} delay={pi * 0.07} />
                        ))}
                      </div>
                      {si < withPackages.length - 1 && <hr className="mt-12 border-slate-100" />}
                    </motion.div>
                  ))}

                  {withoutPackages.length > 0 && (
                    <div>
                      {withPackages.length > 0 && <h2 className="text-xl font-bold text-primary mb-5 font-heading flex items-center gap-2"><FiPackage size={18} /> Other Services</h2>}
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {withoutPackages.map(s => (
                          <ServiceCard key={s._id} service={s} onFeedback={setFeedbackService} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Grid view: all as cards ── */
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filtered.map(s => (
                    <ServiceCard key={s._id} service={s} onFeedback={setFeedbackService} />
                  ))}
                </div>
              )}

              {filtered.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                  <FiLayers size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">No services in this category.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      <AnimatePresence>
        {feedbackService && (
          <FeedbackModal service={feedbackService} onClose={() => setFeedbackService(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
