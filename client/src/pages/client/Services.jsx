import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import {
  FiCheck, FiStar, FiLayers, FiArrowRight, FiX,
  FiGrid, FiList, FiFilter, FiPackage, FiZap
} from 'react-icons/fi'
import ClientPageHeader from '../../components/ui/ClientPageHeader'

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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-100"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
          <div>
            <h3 className="font-bold text-xl text-primary font-heading">Rate this Service</h3>
            <p className="text-sm text-slate-500 mt-1">
              For: <span className="font-semibold text-secondary">{service.title}</span>
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white rounded-full bg-white/50 border border-slate-200 transition-all shadow-sm">
            <FiX size={18} />
          </button>
        </div>
        <div className="p-6 sm:p-8 space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {!user && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Name</label>
                  <input {...register('name')} className="form-input bg-slate-50 border-slate-200 focus:bg-white" placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Email</label>
                  <input {...register('email')} type="email" className="form-input bg-slate-50 border-slate-200 focus:bg-white" placeholder="your@email.com" />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Rating <span className="text-red-500">*</span></label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button type="button" key={s} onClick={() => setRating(s)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      rating >= s ? 'bg-amber-400 text-white shadow-lg shadow-amber-400/30 scale-110 -translate-y-1' : 'bg-slate-100 text-slate-300 hover:bg-amber-50 hover:text-amber-300 hover:-translate-y-1'
                    }`}
                  >
                    <FiStar size={20} className={rating >= s ? 'fill-current' : ''} />
                  </button>
                ))}
                {rating > 0 && <span className="self-center ml-3 text-sm font-bold text-amber-500 bg-amber-50 px-3 py-1.5 rounded-full">{['','Poor','Fair','Good','Great','Excellent'][rating]}</span>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Message <span className="text-red-500">*</span></label>
              <textarea {...register('message', { required: 'Please write your feedback' })} className="form-input bg-slate-50 border-slate-200 focus:bg-white resize-none" rows={4} placeholder="Tell us what you think..." />
              {errors.message && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.message.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-md shadow-primary/20 transition-all mt-4">
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Submit Feedback'}
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
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay, duration: 0.5 }}
      className={`relative rounded-3xl overflow-hidden flex flex-col group ${pkg.isPopular ? 'border-2 border-[#20b2f5] shadow-xl shadow-[#20b2f5]/10 z-10 scale-[1.02] bg-white' : 'border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all'}`}>
      
      {pkg.isPopular && (
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-400 to-[#20b2f5]" />
      )}
      
      {pkg.isPopular && (
        <div className="bg-gradient-to-r from-blue-50 to-[#20b2f5]/10 text-primary text-center py-2 text-xs font-bold tracking-widest uppercase border-b border-blue-100 flex items-center justify-center gap-1.5">
          <FiZap className="text-[#20b2f5] fill-[#20b2f5]" size={12} /> {pkg.promotionLabel || 'Most Popular'}
        </div>
      )}
      <div className={`p-7 flex-1 flex flex-col relative`}>
        {pkg.isPopular && <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />}
        
        <h3 className="font-bold text-primary text-xl mb-1.5">{pkg.name}</h3>
        <div className="mb-6 pb-6 border-b border-slate-100">
          {pkg.discount > 0 && <p className="text-xs font-medium text-slate-400 line-through mb-1">{pkg.currency} {Number(pkg.price / (1 - pkg.discount / 100)).toLocaleString()}</p>}
          <div className="flex items-end gap-1.5">
            <span className="text-base font-semibold text-slate-500 mb-1.5">{pkg.currency}</span>
            <span className="text-4xl font-black text-primary tracking-tight">{Number(pkg.price).toLocaleString()}</span>
            <span className="text-sm font-medium text-slate-400 mb-1.5">{BILLING_LABEL[pkg.billingCycle] || ''}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            {pkg.discount > 0 && <span className="inline-block text-[10px] uppercase tracking-wider bg-emerald-100/80 text-emerald-700 font-bold px-2.5 py-1 rounded-full">{pkg.discount}% off</span>}
            {pkg.duration && <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1"><FiLayers size={10}/> {pkg.duration}</span>}
          </div>
        </div>
        <ul className="space-y-3.5 flex-1 mb-8">
          {(pkg.features || []).map((f, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-600 font-medium">
              <div className={`mt-0.5 shrink-0 rounded-full p-0.5 ${pkg.isPopular ? 'bg-blue-100 text-[#20b2f5]' : 'bg-emerald-100 text-emerald-500'}`}>
                <FiCheck size={10} />
              </div> 
              <span className="leading-snug">{f}</span>
            </li>
          ))}
        </ul>
        <a href="mailto:info@raxwo.com" className={`w-full py-3.5 rounded-xl text-sm font-bold text-center transition-all duration-300 flex items-center justify-center gap-2 group/btn relative overflow-hidden ${
          pkg.isPopular ? 'bg-primary text-white shadow-md hover:bg-primary/90' : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
        }`}>
          <span className="relative z-10 flex items-center gap-2">Get Started <FiArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" /></span>
        </a>
      </div>
    </motion.div>
  )
}

/* ─── Service Card (grid view) ─────────────────────────────────── */
function ServiceCard({ service, onFeedback }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true }}
      className="card border border-slate-200 overflow-hidden group hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 bg-white rounded-3xl flex flex-col h-full relative"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-50/50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {service.imageUrl ? (
        <div className="relative h-44 overflow-hidden border-b border-slate-100">
          <img src={service.imageUrl} alt={service.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ) : (
        <div className="h-2 bg-gradient-to-r from-blue-400 to-indigo-500" />
      )}
      
      <div className="p-6 flex-1 flex flex-col relative z-10">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-bold text-primary text-xl font-heading leading-tight group-hover:text-[#20b2f5] transition-colors">{service.title}</h3>
          {service.category && <span className="bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shrink-0 border border-blue-100/50">{service.category}</span>}
        </div>
        <p className="text-sm text-slate-500 mb-5 leading-relaxed flex-1">{service.description}</p>
        
        {service.features?.length > 0 && (
          <div className="bg-slate-50/50 rounded-xl p-3 mb-5 border border-slate-100/80">
            <ul className="space-y-2">
              {service.features.slice(0, 3).map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                  <FiCheck size={12} className="text-[#20b2f5] shrink-0" /> <span className="truncate">{f}</span>
                </li>
              ))}
              {service.features.length > 3 && (
                <li className="text-[11px] font-semibold text-slate-400 pl-5">+{service.features.length - 3} more</li>
              )}
            </ul>
          </div>
        )}
        
        <div className="flex items-center justify-between mt-auto">
          {service.priceText ? (
            <p className="text-primary font-black tracking-tight">{service.priceText}</p>
          ) : <div />}
          <div className="flex items-center gap-2">
            <button onClick={() => onFeedback(service)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50 text-amber-500 hover:bg-amber-400 hover:text-white transition-all shadow-sm">
              <FiStar size={14} />
            </button>
            <a href="mailto:info@raxwo.com" className="h-9 px-4 rounded-xl flex items-center justify-center bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-md">
              Enquire
            </a>
          </div>
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
    <div className="animate-fade-in">
      <ClientPageHeader 
        title="Services & Software Products" 
        subtitle="Explore our premium development solutions, ready-made software products, and scalable plans tailored to accelerate your business growth."
        rightContent={
          hasCategories ? (
            <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 flex items-center shadow-lg">
              <button onClick={() => setViewMode('category')} className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${viewMode === 'category' ? 'bg-white text-primary shadow-md' : 'text-white/80 hover:text-white hover:bg-white/5'}`}>
                <FiList size={16} /> Categories
              </button>
              <button onClick={() => setViewMode('grid')} className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-white text-primary shadow-md' : 'text-white/80 hover:text-white hover:bg-white/5'}`}>
                <FiGrid size={16} /> Grid
              </button>
            </div>
          ) : null
        }
      />

      <section className="section-padding bg-slate-50 min-h-screen">
        <div className="container-max space-y-8">

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-[#20b2f5]/20 border-t-[#20b2f5] rounded-full animate-spin" />
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiLayers size={32} className="text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium text-lg">Services catalogue is empty.</p>
          <p className="text-slate-400 text-sm mt-1">Please check back later.</p>
        </div>
      ) : (
        <>
          {/* Enhanced Category Filter */}
          {hasCategories && (
            <div className="sticky top-20 z-40 bg-slate-50/80 backdrop-blur-xl py-3 border-b border-slate-200/60 shadow-sm rounded-2xl px-4">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 border border-slate-200 shadow-sm text-slate-400 mr-2">
                  <FiFilter size={14} />
                </div>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                      activeCategory === cat
                        ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                        : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={`${activeCategory}-${viewMode}`} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>

              {/* ── Category view (default): grouped by service with packages ── */}
              {viewMode === 'category' ? (
                <div className="space-y-16">
                  {withPackages.map((service, si) => (
                    <motion.div key={service._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.1 }}>
                      <div className="mb-8 text-center bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />
                        
                        {service.imageUrl && <img src={service.imageUrl} alt={service.title} className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 border border-slate-100 shadow-md relative z-10" />}
                        <div className="flex items-center justify-center gap-2 mb-2 relative z-10">
                          {service.category && <span className="bg-blue-50 text-blue-600 font-bold uppercase tracking-wider text-[10px] px-3 py-1 rounded-full border border-blue-100">{service.category}</span>}
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black text-primary font-heading tracking-tight mb-3 relative z-10">{service.title}</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto text-base leading-relaxed relative z-10">{service.description}</p>
                        
                        <div className="mt-5 relative z-10">
                          <button onClick={() => setFeedbackService(service)} className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-white px-4 py-2 rounded-full bg-amber-50 hover:bg-amber-400 border border-amber-200/50 transition-all shadow-sm">
                            <FiStar size={14} className="fill-current" /> Give Feedback
                          </button>
                        </div>
                      </div>
                      
                      <div className={`grid gap-6 ${service.packages.length === 1 ? 'max-w-md mx-auto' : service.packages.length === 2 ? 'sm:grid-cols-2 max-w-4xl mx-auto' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
                        {service.packages.map((pkg, pi) => (
                          <PackageCard key={pkg._id} pkg={pkg} delay={pi * 0.1} />
                        ))}
                      </div>
                      
                      {si < withPackages.length - 1 && (
                        <div className="flex justify-center mt-16">
                          <div className="w-16 h-1 rounded-full bg-slate-200" />
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {withoutPackages.length > 0 && (
                    <div className="pt-8">
                      {withPackages.length > 0 && (
                        <div className="flex items-center gap-4 mb-8">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                            <FiPackage size={20} className="text-blue-500" />
                          </div>
                          <h2 className="text-2xl font-black text-primary font-heading tracking-tight">Other Software Products</h2>
                        </div>
                      )}
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {withoutPackages.map(s => (
                          <ServiceCard key={s._id} service={s} onFeedback={setFeedbackService} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Grid view: all as cards ── */
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filtered.map(s => (
                    <ServiceCard key={s._id} service={s} onFeedback={setFeedbackService} />
                  ))}
                </div>
              )}

              {filtered.length === 0 && (
                <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm mt-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiLayers size={32} className="text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium text-lg">No services found in this category.</p>
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
      </section>
    </div>
  )
}

