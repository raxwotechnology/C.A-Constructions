import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { FiArrowRight, FiCode, FiSmartphone, FiCloud, FiShield, FiTrendingUp, FiUsers, FiStar, FiChevronLeft, FiChevronRight, FiSearch, FiMessageSquare, FiSettings, FiCheckCircle } from 'react-icons/fi'

const TECH_STACK = ['React.js', 'Node.js', 'MongoDB', 'Next.js', 'React Native', 'AWS', 'Docker', 'PostgreSQL', 'TypeScript', 'Express.js', 'Tailwind CSS', 'Redux', 'Firebase', 'GraphQL', 'Kubernetes']

const Hero3D = lazy(() => import('../../components/ui/Hero3D'))
import TiltCard from '../../components/ui/TiltCard'
import HomeSignInForm from '../../components/ui/HomeSignInForm'

const PROCESS_STEPS = [
  { icon: FiSearch,      num: '01', title: 'Discovery',      desc: 'We understand your business goals, user needs, and technical requirements through deep consultation.' },
  { icon: FiMessageSquare,num:'02', title: 'Planning',       desc: 'We define scope, architecture, timelines, and assign the right team — then share a detailed proposal.' },
  { icon: FiSettings,    num: '03', title: 'Development',    desc: 'Agile sprints with weekly demos. You see progress at every stage, not just at delivery.' },
  { icon: FiCheckCircle, num: '04', title: 'Launch & Support', desc: 'Rigorous QA, UAT, deployment, and 12-month post-launch support included in every project.' },
]

const services = [
  { icon: FiCode, title: 'Web Development', desc: 'Scalable, modern web applications built with the latest technologies like React, Node.js, and cloud infrastructure.', color: 'bg-blue-50 text-blue-600' },
  { icon: FiSmartphone, title: 'Mobile Apps', desc: 'Cross-platform iOS & Android apps using React Native that deliver native performance and beautiful UX.', color: 'bg-green-50 text-green-600' },
  { icon: FiCloud, title: 'Cloud & DevOps', desc: 'AWS/Azure cloud setup, CI/CD pipelines, Docker orchestration, and 24/7 infrastructure monitoring.', color: 'bg-purple-50 text-purple-600' },
  { icon: FiShield, title: 'Cybersecurity', desc: 'Penetration testing, security audits, compliance consulting, and secure software development practices.', color: 'bg-red-50 text-red-600' },
  { icon: FiTrendingUp, title: 'Digital Transformation', desc: 'End-to-end digital transformation strategy, legacy modernization, and enterprise system integration.', color: 'bg-orange-50 text-orange-600' },
  { icon: FiUsers, title: 'IT Consulting', desc: 'Strategic technology consulting, architecture reviews, and dedicated development team augmentation.', color: 'bg-navy-50 text-navy-600' },
]

const testimonials = [
  { name: 'Kamal Perera', company: 'TechCorp Lanka', quote: 'Raxwo delivered our ERP system on time and on budget. The quality exceeded our expectations. Highly professional team!', rating: 5, role: 'CEO' },
  { name: 'Priya Jayawardena', company: 'FashionHub LK', quote: 'Our e-commerce platform has tripled our revenue since Raxwo rebuilt it. Outstanding technical expertise and after-sales support.', rating: 5, role: 'Founder' },
  { name: 'Dimuth Fernando', company: 'HealthCare Solutions', quote: 'The patient management system they built is robust, secure and user-friendly. Our staff adapted instantly.', rating: 5, role: 'CTO' },
]

const stats = [
  { value: 50, suffix: '+', label: 'Projects Delivered' },
  { value: 120, suffix: '+', label: 'Happy Clients' },
  { value: 35, suffix: '+', label: 'Team Members' },
  { value: 5, suffix: '+', label: 'Years in Business' },
]

function Counter({ target, suffix }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = Math.ceil(target / 60)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(start)
    }, 25)
    return () => clearInterval(timer)
  }, [inView, target])
  return <span ref={ref}>{count}{suffix}</span>
}

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }

export default function Home() {
  const [testIdx, setTestIdx] = useState(0)

  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <section className="relative min-h-screen bg-gradient-hero flex items-center overflow-hidden">
        {/* Animated bg blobs & 3D */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl" />
          <Suspense fallback={null}>
            <Hero3D />
          </Suspense>
        </div>

        <div className="container-max relative z-10 py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.15 } } }}>
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/80 text-sm mb-6">
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                🇱🇰 Based in Colombo, Sri Lanka
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-5xl lg:text-6xl font-bold text-white font-heading leading-tight mb-6">
                Innovative<br />
                <span className="bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(15,23,42,0.45)]">Software Solutions</span><br />
                in Sri Lanka
              </motion.h1>

              <motion.p variants={fadeUp} className="text-white/70 text-lg leading-relaxed mb-10 max-w-xl">
                We build powerful, scalable web & mobile applications that transform businesses. From startups to enterprise — we deliver results that matter.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                <Link to="/contact" className="btn-primary btn-lg">
                  Get a Free Quote <FiArrowRight />
                </Link>
                <Link to="/services" className="btn-outline btn-lg border-white/30 text-white hover:bg-white/10 hover:text-white">
                  View Our Services
                </Link>
              </motion.div>
            </motion.div>

            {/* Hero Sign In Form */}
            <HomeSignInForm />
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80L1440 80L1440 20C1200 80 960 0 720 40C480 80 240 0 0 20L0 80Z" fill="#F8FAFC" />
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gray-50 py-16">
        <div className="container-max">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map(s => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <p className="text-4xl font-bold text-primary font-heading">
                  <Counter target={s.value} suffix={s.suffix} />
                </p>
                <p className="text-gray-500 mt-1 text-sm">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack Trust Strip */}
      <section className="bg-white border-y border-slate-100 py-6 overflow-hidden">
        <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">Built With Modern, Battle-Tested Technologies</p>
        <div className="flex gap-6 animate-marquee whitespace-nowrap" style={{ animation: 'marquee 20s linear infinite' }}>
          {[...TECH_STACK, ...TECH_STACK].map((tech, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 shrink-0">
              <span className="w-2 h-2 rounded-full bg-secondary/60" />{tech}
            </span>
          ))}
        </div>
        <style>{`@keyframes marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }`}</style>
      </section>

      {/* Services */}
      <section className="section-padding bg-white">
        <div className="container-max">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <span className="badge badge-blue mb-4">Our Services</span>
            <h2 className="text-4xl font-bold text-primary font-heading mb-4">What We Build</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">End-to-end software solutions tailored for Sri Lankan businesses and global clients.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group cursor-pointer h-full"
              >
                <TiltCard className="h-full">
                  <div className="p-8 h-full flex flex-col items-start bg-white/60">
                    <div className={`w-14 h-14 rounded-2xl ${s.color} flex items-center justify-center mb-6 shadow-sm transition-transform duration-500`} style={{ transform: 'translateZ(40px)' }}>
                      <s.icon size={26} />
                    </div>
                    <h3 className="font-bold text-xl text-primary font-heading mb-3" style={{ transform: 'translateZ(30px)' }}>{s.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1" style={{ transform: 'translateZ(20px)' }}>{s.desc}</p>
                    <div className="mt-auto text-secondary font-medium text-sm flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity" style={{ transform: 'translateZ(30px)' }}>
                      Learn more <FiArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/services" className="btn-outline">View All Services <FiArrowRight /></Link>
          </div>
        </div>
      </section>

      {/* How We Work */}
      <section className="section-padding bg-slate-50">
        <div className="container-max">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <span className="badge badge-blue mb-4">Our Process</span>
            <h2 className="text-4xl font-bold text-primary font-heading mb-4">How We Work</h2>
            <p className="text-gray-500 max-w-xl mx-auto">A proven 4-step process that gets your project from idea to production without surprises.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS_STEPS.map((step, i) => (
              <motion.div key={step.num}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="h-full">
                <TiltCard className="h-full">
                  <div className="card card-body relative group h-full bg-white/70">
                    <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-br from-secondary to-blue-600 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg" style={{ transform: 'translateZ(30px)' }}>
                      {step.num}
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-secondary/10 flex items-center justify-center mb-4 mt-2 transition-transform duration-500" style={{ transform: 'translateZ(40px)' }}>
                      <step.icon size={20} className="text-secondary" />
                    </div>
                    <h3 className="font-bold text-primary font-heading mb-2" style={{ transform: 'translateZ(20px)' }}>{step.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed" style={{ transform: 'translateZ(10px)' }}>{step.desc}</p>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/contact" className="btn-primary btn-lg">Start Your Project <FiArrowRight /></Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-padding bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 text-9xl font-bold text-white">"</div>
        </div>
        <div className="container-max relative">
          <div className="text-center mb-12">
            <span className="badge badge-blue mb-4 bg-white/10 text-white border border-white/20">Client Success</span>
            <h2 className="text-4xl font-bold text-white font-heading mb-4">What Our Clients Say</h2>
          </div>

          <div className="max-w-3xl mx-auto">
            <motion.div key={testIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-10 text-center">
              <div className="flex justify-center mb-4">
                {[...Array(testimonials[testIdx].rating)].map((_, i) => (
                  <FiStar key={i} className="text-yellow-400 fill-yellow-400" size={20} />
                ))}
              </div>
              <blockquote className="text-white/90 text-xl italic leading-relaxed mb-8">
                "{testimonials[testIdx].quote}"
              </blockquote>
              <div>
                <p className="text-white font-semibold font-heading">{testimonials[testIdx].name}</p>
                <p className="text-white/60 text-sm">{testimonials[testIdx].role}, {testimonials[testIdx].company}</p>
              </div>
            </motion.div>

            <div className="flex justify-center gap-4 mt-6">
              <button onClick={() => setTestIdx(i => (i - 1 + testimonials.length) % testimonials.length)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                <FiChevronLeft />
              </button>
              {testimonials.map((_, i) => (
                <button key={i} onClick={() => setTestIdx(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${i === testIdx ? 'bg-white w-6' : 'bg-white/40'}`} />
              ))}
              <button onClick={() => setTestIdx(i => (i + 1) % testimonials.length)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                <FiChevronRight />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Careers */}
      <section className="section-padding bg-white">
        <div className="container-max">
          <div className="bg-gradient-to-br from-navy-900 to-secondary rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-hero opacity-80 rounded-3xl" />
            <div className="relative">
              <span className="badge bg-white/10 text-white border border-white/20 mb-4">Join Our Team</span>
              <h2 className="text-4xl font-bold text-white font-heading mb-4">Build Your Career at Raxwo</h2>
              <p className="text-white/70 max-w-xl mx-auto mb-8">
                We're always looking for talented engineers, designers, and problem-solvers. Work on exciting projects with a passionate team.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/careers" className="btn-primary btn-lg">View Open Positions <FiArrowRight /></Link>
                <Link to="/contact" className="btn-outline btn-lg border-white/30 text-white hover:bg-white/10">Contact HR Team</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
