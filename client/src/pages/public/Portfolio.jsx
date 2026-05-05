import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FiExternalLink, FiArrowRight } from 'react-icons/fi'
import api from '../../lib/api'

const projects = [
  { title: 'TechCorp ERP System', category: 'Enterprise', tech: ['React', 'Node.js', 'MongoDB'], desc: 'Full ERP system with HR, payroll, inventory, and client management for a Colombo-based tech firm.', color: 'from-blue-500 to-blue-700', result: '40% ops efficiency gain' },
  { title: 'FashionHub E-Commerce', category: 'E-Commerce', tech: ['Next.js', 'Stripe', 'PostgreSQL'], desc: 'Multi-vendor e-commerce platform with vendor dashboards, inventory tracking, and payment processing.', color: 'from-purple-500 to-purple-700', result: '3x revenue increase' },
  { title: 'HealthCare Patient Portal', category: 'Healthcare', tech: ['React Native', 'Node.js', 'MySQL'], desc: 'Patient management system with appointment scheduling, medical records, and billing integration.', color: 'from-green-500 to-green-700', result: '60% admin time saved' },
  { title: 'LogiTrack Delivery App', category: 'Logistics', tech: ['React Native', 'Google Maps', 'Socket.io'], desc: 'Real-time delivery tracking app for a logistics company with driver and customer portals.', color: 'from-orange-500 to-orange-700', result: '25% delivery efficiency' },
  { title: 'SchoolMS Learning Platform', category: 'Education', tech: ['React', 'Express', 'MongoDB'], desc: 'Comprehensive school management system with student, teacher, and parent portals.', color: 'from-red-500 to-red-700', result: '5,000+ daily users' },
  { title: 'FinPro Accounting Suite', category: 'Finance', tech: ['Vue.js', 'Node.js', 'PostgreSQL'], desc: 'Cloud-based accounting software with GST/VAT, invoicing, and financial reporting.', color: 'from-teal-500 to-teal-700', result: '200+ businesses using' },
]

export default function Portfolio() {
  const { data } = useQuery({
    queryKey: ['public-portfolio'],
    queryFn: () => api.get('/content/portfolio').then((r) => r.data),
  })
  const dynamicProjects = data?.items || []
  const displayProjects = dynamicProjects.length > 0
    ? dynamicProjects.map((p) => ({
      title: p.title,
      category: p.category,
      tech: p.technologies || [],
      desc: p.description,
      result: p.result || 'Delivered',
      color: '',
      gradientStyle: { backgroundImage: `linear-gradient(135deg, ${p.colorFrom || '#3b82f6'}, ${p.colorTo || '#1d4ed8'})` },
      caseStudyUrl: p.caseStudyUrl || '',
      imageUrl: p.imageUrl || '',
    }))
    : projects

  return (
    <div>
      <section className="bg-gradient-hero section-padding pt-32 text-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 right-10 w-64 h-64 bg-secondary/15 rounded-full blur-3xl" />
        </div>
        <div className="container-max relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="badge bg-white/10 text-white border border-white/20 mb-4">Our Work</span>
            <h1 className="text-5xl font-bold text-white font-heading mb-4">Portfolio & Case Studies</h1>
            <p className="text-white/70 max-w-2xl mx-auto text-lg">Real projects, real results — see how we've transformed businesses across Sri Lanka.</p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-gray-50">
        <div className="container-max">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayProjects.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="card card-hover overflow-hidden group"
              >
                <div className={`h-40 ${p.gradientStyle ? '' : `bg-gradient-to-br ${p.color}`} relative flex items-end p-5`} style={p.gradientStyle || undefined}>
                  <div className="absolute inset-0 opacity-20 bg-[url('/grid.svg')]" />
                  <span className="badge bg-white/20 text-white border border-white/30 relative z-10">{p.category}</span>
                </div>
                <div className="card-body">
                  <h3 className="text-lg font-bold text-primary font-heading mb-2">{p.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">{p.desc}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {p.tech.map(t => <span key={t} className="badge badge-blue text-xs">{t}</span>)}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-accent font-semibold text-sm">✓ {p.result}</span>
                    <button className="text-secondary text-sm flex items-center gap-1 hover:gap-2 transition-all">
                      Case study <FiExternalLink size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-white text-center">
        <div className="container-max">
          <h2 className="text-4xl font-bold text-primary font-heading mb-4">Have a Project in Mind?</h2>
          <p className="text-gray-500 mb-8 max-w-xl mx-auto">Let's discuss your requirements and build something amazing together.</p>
          <Link to="/contact" className="btn-primary btn-lg">Start a Project <FiArrowRight /></Link>
        </div>
      </section>
    </div>
  )
}
