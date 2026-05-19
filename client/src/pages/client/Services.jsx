import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import { FiCheck, FiStar, FiPackage, FiLayers, FiArrowRight } from 'react-icons/fi'

const BILLING_LABEL = {
  'one-time': 'One-time',
  'monthly': '/month',
  'quarterly': '/quarter',
  'yearly': '/year',
}

function PackageCard({ pkg, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className={`relative rounded-2xl border overflow-hidden flex flex-col ${pkg.isPopular ? 'border-secondary shadow-lg scale-[1.02] z-10' : 'border-slate-200 bg-white'}`}>
      {/* Popular banner */}
      {pkg.isPopular && (
        <div className="bg-gradient-to-r from-secondary to-blue-600 text-white text-center py-1.5 text-xs font-bold tracking-wider">
          {pkg.promotionLabel || '⭐ MOST POPULAR'}
        </div>
      )}

      <div className={`p-6 flex-1 flex flex-col ${pkg.isPopular ? 'bg-gradient-to-br from-blue-50 to-white' : 'bg-white'}`}>
        <h3 className="font-bold text-primary text-lg mb-1">{pkg.name}</h3>

        {/* Price */}
        <div className="mb-4">
          {pkg.discount > 0 && (
            <p className="text-xs text-slate-400 line-through">
              {pkg.currency} {Number(pkg.price / (1 - pkg.discount / 100)).toLocaleString()}
            </p>
          )}
          <div className="flex items-end gap-1">
            <span className="text-sm font-semibold text-slate-500">{pkg.currency}</span>
            <span className="text-3xl font-black text-primary">{Number(pkg.price).toLocaleString()}</span>
            <span className="text-sm text-slate-400 mb-1">{BILLING_LABEL[pkg.billingCycle] || ''}</span>
          </div>
          {pkg.discount > 0 && (
            <span className="inline-block text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full mt-1">
              {pkg.discount}% off
            </span>
          )}
          {pkg.duration && <p className="text-xs text-slate-400 mt-1">Duration: {pkg.duration}</p>}
        </div>

        {/* Features */}
        <ul className="space-y-2 flex-1 mb-6">
          {(pkg.features || []).map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <FiCheck size={14} className={`mt-0.5 shrink-0 ${pkg.isPopular ? 'text-secondary' : 'text-emerald-500'}`} />
              {f}
            </li>
          ))}
        </ul>

        <a href="mailto:info@raxwo.com" className={`w-full py-2.5 rounded-xl text-sm font-bold text-center transition-all flex items-center justify-center gap-2 ${pkg.isPopular ? 'bg-gradient-to-r from-secondary to-blue-600 text-white hover:brightness-110 shadow-md' : 'border-2 border-secondary text-secondary hover:bg-secondary hover:text-white'}`}>
          Get Started <FiArrowRight size={14} />
        </a>
      </div>
    </motion.div>
  )
}

export default function ClientServices() {
  const { data, isLoading } = useQuery({
    queryKey: ['client-services'],
    queryFn: () => api.get('/content/services').then(r => r.data),
  })

  const services = data?.services || []
  const withPackages = services.filter(s => s.packages?.length > 0)
  const withoutPackages = services.filter(s => !s.packages?.length)

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Our Services & Packages</h1>
          <p className="page-subtitle">Explore what we offer and choose the right package for you.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Services with packages */}
          {withPackages.map((service, si) => (
            <motion.div key={service._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.1 }}>
              <div className="mb-6 text-center">
                {service.imageUrl && (
                  <img src={service.imageUrl} alt={service.title} className="w-14 h-14 rounded-2xl object-cover mx-auto mb-3 border border-slate-200" />
                )}
                <h2 className="text-2xl font-black text-primary font-heading">{service.title}</h2>
                <p className="text-slate-500 mt-1 max-w-xl mx-auto">{service.description}</p>
                {service.category && (
                  <span className="inline-block mt-2 badge badge-blue text-xs capitalize">{service.category}</span>
                )}
              </div>
              <div className={`grid gap-6 ${service.packages.length === 1 ? 'max-w-sm mx-auto' : service.packages.length === 2 ? 'sm:grid-cols-2 max-w-2xl mx-auto' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
                {service.packages.map((pkg, pi) => (
                  <PackageCard key={pkg._id} pkg={pkg} delay={pi * 0.08} />
                ))}
              </div>
              {si < withPackages.length - 1 && <hr className="mt-10 border-slate-100" />}
            </motion.div>
          ))}

          {/* Services without packages — simple cards */}
          {withoutPackages.length > 0 && (
            <div>
              {withPackages.length > 0 && <h2 className="text-xl font-bold text-primary mb-4 font-heading">Other Services</h2>}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {withoutPackages.map((s, i) => (
                  <motion.div key={s._id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
                    className="card border border-slate-200 overflow-hidden group hover:shadow-lg transition-shadow">
                    {s.imageUrl && (
                      <img src={s.imageUrl} alt={s.title} className="w-full h-36 object-cover border-b border-slate-100" />
                    )}
                    <div className="p-5">
                      <h3 className="font-bold text-primary text-lg mb-1">{s.title}</h3>
                      <p className="text-sm text-slate-500 mb-3">{s.description}</p>
                      {s.priceText && (
                        <p className="text-secondary font-bold text-sm mb-3">{s.priceText}</p>
                      )}
                      {s.features?.length > 0 && (
                        <ul className="space-y-1.5 mb-4">
                          {s.features.slice(0, 5).map((f, fi) => (
                            <li key={fi} className="flex items-center gap-2 text-sm text-slate-600">
                              <FiCheck size={12} className="text-emerald-500 shrink-0" /> {f}
                            </li>
                          ))}
                        </ul>
                      )}
                      <a href="mailto:info@raxwo.com" className="btn-outline btn-sm w-full justify-center text-xs">
                        Enquire Now
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {services.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <FiLayers size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Services are coming soon.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
