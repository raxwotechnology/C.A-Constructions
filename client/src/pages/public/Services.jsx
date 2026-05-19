import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FiCode, FiSmartphone, FiCloud, FiShield, FiTrendingUp, FiUsers, FiDatabase, FiLayers, FiArrowRight, FiCheck } from 'react-icons/fi'
import api from '../../lib/api'
import TiltCard from '../../components/ui/TiltCard'

const services = [
  {
    icon: FiCode, title: 'Web Development', color: 'from-blue-500 to-blue-600',
    desc: 'Full-stack web applications using React, Node.js, MongoDB, and modern cloud infrastructure. We build scalable, maintainable solutions.',
    features: ['React / Next.js frontends', 'Node.js / Express APIs', 'MongoDB & PostgreSQL', 'REST & GraphQL APIs'],
    price: 'From LKR 150,000'
  },
  {
    icon: FiSmartphone, title: 'Mobile App Development', color: 'from-green-500 to-green-600',
    desc: 'Cross-platform iOS and Android apps with React Native. Native performance, beautiful UI, and seamless backend integration.',
    features: ['React Native / Expo', 'iOS & Android', 'Push notifications', 'Offline-first architecture'],
    price: 'From LKR 250,000'
  },
  {
    icon: FiCloud, title: 'Cloud & DevOps', color: 'from-purple-500 to-purple-600',
    desc: 'End-to-end cloud infrastructure setup, CI/CD pipelines, containerization, and ongoing DevOps support.',
    features: ['AWS / Azure / GCP', 'Docker & Kubernetes', 'CI/CD pipelines', '24/7 monitoring'],
    price: 'From LKR 80,000/mo'
  },
  {
    icon: FiLayers, title: 'Enterprise Systems', color: 'from-orange-500 to-orange-600',
    desc: 'Custom ERP, HRM, CRM, and inventory management systems designed for Sri Lankan enterprises.',
    features: ['ERP / HRM Systems', 'Custom workflows', 'EPF/ETF compliance', 'Multi-role portals'],
    price: 'From LKR 500,000'
  },
  {
    icon: FiDatabase, title: 'Database & Backend', color: 'from-red-500 to-red-600',
    desc: 'Database design, optimization, API development, and backend architecture for high-performance applications.',
    features: ['Database design', 'Query optimization', 'API security', 'Data migration'],
    price: 'From LKR 100,000'
  },
  {
    icon: FiShield, title: 'Cybersecurity', color: 'from-gray-600 to-gray-800',
    desc: 'Security audits, penetration testing, vulnerability assessments, and security consulting for your systems.',
    features: ['Penetration testing', 'Security audits', 'GDPR compliance', 'Secure code review'],
    price: 'From LKR 120,000'
  },
]

const process = [
  { step: '01', title: 'Discovery', desc: 'We analyze your requirements, business goals, and technical constraints in a free consultation session.' },
  { step: '02', title: 'Design', desc: 'Our UI/UX team creates wireframes and prototypes. You review and approve before we write a single line of code.' },
  { step: '03', title: 'Development', desc: 'Agile sprints with regular demos. You stay in the loop throughout the entire development cycle.' },
  { step: '04', title: 'Delivery', desc: 'Full deployment, testing, documentation, and training. 3 months of free support included.' },
]

export default function Services() {
  const { data } = useQuery({
    queryKey: ['public-services'],
    queryFn: () => api.get('/content/services').then((r) => r.data),
  })
  const dynamicServices = data?.services || []
  const displayServices = dynamicServices.map((s) => ({
      ...s,
      icon: ({ FiCode, FiSmartphone, FiCloud, FiShield, FiTrendingUp, FiUsers, FiDatabase, FiLayers }[s.icon]) || FiCode,
      gradientStyle: { backgroundImage: `linear-gradient(135deg, ${s.colorFrom || '#3b82f6'}, ${s.colorTo || '#1d4ed8'})` },
      desc: s.description,
      features: s.features || [],
      price: s.priceText || '',
    }))

  return (
    <div>
      {/* Header */}
      <section className="bg-gradient-hero section-padding pt-32 text-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-64 h-64 bg-secondary/15 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-20 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl" />
        </div>
        <div className="container-max relative">
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
              What We Offer
            </motion.span>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl lg:text-5xl font-bold text-white font-heading mb-6 tracking-tight drop-shadow-2xl"
            >
              Our Services
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-white/80 max-w-2xl mx-auto text-xl leading-relaxed"
            >
              Premium software development services tailored for businesses in Sri Lanka and beyond.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="section-padding bg-gray-50">
        <div className="container-max">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayServices.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: i * 0.1, type: 'spring', stiffness: 100 }}
                className="h-full"
              >
                <TiltCard className="h-full">
                  <div className="card card-body card-hover group h-full bg-white/80">
                    <div className={`w-14 h-14 rounded-2xl ${s.gradientStyle ? '' : `bg-gradient-to-br ${s.color}`} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`} style={{ ...s.gradientStyle, transform: 'translateZ(40px)' }}>
                      <s.icon size={24} className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-primary font-heading mb-2" style={{ transform: 'translateZ(30px)' }}>{s.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4" style={{ transform: 'translateZ(20px)' }}>{s.desc}</p>
                    <ul className="space-y-2 mb-5 flex-1" style={{ transform: 'translateZ(25px)' }}>
                      {s.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                          <FiCheck className="text-accent flex-shrink-0" size={14} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100" style={{ transform: 'translateZ(10px)' }}>
                      <span className="text-secondary font-semibold text-sm">{s.price}</span>
                      <Link to="/contact" className="text-secondary text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
                        Get quote <FiArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="section-padding bg-white">
        <div className="container-max">
          <div className="text-center mb-14">
            <span className="badge badge-blue mb-4">How We Work</span>
            <h2 className="text-4xl font-bold text-primary font-heading">Our Development Process</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {process.map((p, i) => (
              <motion.div key={p.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="text-center relative">
                {i < process.length - 1 && <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-secondary/30 to-transparent" />}
                <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center text-2xl font-bold font-heading mx-auto mb-4 relative z-10">
                  {p.step}
                </div>
                <h3 className="font-bold text-primary font-heading mb-2">{p.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-gradient-hero text-center">
        <div className="container-max">
          <h2 className="text-4xl font-bold text-white font-heading mb-4">Ready to Start Your Project?</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">Get a free consultation and project estimate from our expert team.</p>
          <Link to="/contact" className="btn-primary btn-lg">Request a Free Quote <FiArrowRight /></Link>
        </div>
      </section>
    </div>
  )
}
