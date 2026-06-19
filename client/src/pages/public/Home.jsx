import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  FiArrowRight, FiCode, FiSmartphone, FiCloud, FiShield,
  FiTrendingUp, FiUsers, FiStar, FiChevronLeft, FiChevronRight,
  FiSearch, FiMessageSquare, FiSettings, FiCheckCircle,
  FiBriefcase, FiExternalLink, FiMenu, FiX, FiHome, FiCalendar
} from 'react-icons/fi'
import TiltCard from '../../components/ui/TiltCard'
import HomeSignInForm from '../../components/ui/HomeSignInForm'
import SiteLogo from '../../components/branding/SiteLogo'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const TECH_STACK = ['React.js','Node.js','MongoDB','Next.js','React Native','AWS','Docker','PostgreSQL','TypeScript','Express.js','Tailwind CSS','Redux','Firebase','GraphQL','Kubernetes']



const SERVICES = [
  { icon: FiCode,        title: 'Web Development',       desc: 'Scalable, modern web applications built with React, Node.js, and cloud infrastructure.', color: 'bg-blue-50 text-blue-600' },
  { icon: FiSmartphone,  title: 'Mobile Apps',           desc: 'Cross-platform iOS & Android apps using React Native that deliver native performance and beautiful UX.', color: 'bg-green-50 text-green-600' },
  { icon: FiCloud,       title: 'Cloud & DevOps',        desc: 'AWS/Azure cloud setup, CI/CD pipelines, Docker orchestration, and 24/7 infrastructure monitoring.', color: 'bg-purple-50 text-purple-600' },
  { icon: FiShield,      title: 'Cybersecurity',         desc: 'Penetration testing, security audits, compliance consulting, and secure software development practices.', color: 'bg-red-50 text-red-600' },
  { icon: FiTrendingUp,  title: 'Digital Transformation', desc: 'End-to-end digital transformation strategy, legacy modernisation, and enterprise system integration.', color: 'bg-orange-50 text-orange-600' },
  { icon: FiUsers,       title: 'IT Consulting',         desc: 'Strategic technology consulting, architecture reviews, and dedicated development team augmentation.', color: 'bg-indigo-50 text-indigo-600' },
]



const STATS = [
  { value: 50,  suffix: '+', label: 'Projects Delivered' },
  { value: 120, suffix: '+', label: 'Happy Clients' },
  { value: 35,  suffix: '+', label: 'Team Members' },
  { value: 5,   suffix: '+', label: 'Years in Business' },
]

function Counter({ target, suffix }) {
  const [count, setCount] = useState(0)
  const ref  = useRef(null)
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

/* ── Embedded Home Navbar ─────────────────────────────────────── */
function HomeNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const isClient = isAuthenticated && user?.role === 'client'

  const handleLogout = () => {
    logout()
    toast.success('Signed out')
    navigate('/login')
  }

  return (
    <nav className="absolute top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
      {/* Logo */}
      <SiteLogo to="/" variant="dark" className="flex-shrink-0" />

      {/* Desktop links */}
      <div className="hidden md:flex items-center gap-2">
        <a
          href="https://raxwo.net/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all"
        >
          <FiHome size={14} /> raxwo.net
        </a>
        <Link
          to="/careers"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all"
        >
          <FiBriefcase size={14} /> Careers
        </Link>

        {isClient ? (
          <>
            <Link to="/my-projects" className="px-4 py-2 rounded-xl text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all">Dashboard</Link>
            <button onClick={handleLogout} className="px-4 py-2 rounded-xl text-sm font-semibold text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-all">Sign Out</button>
          </>
        ) : (
          <Link to="/login" className="ml-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-bold shadow hover:shadow-lg hover:scale-105 transition-all">
            Sign In
          </Link>
        )}
      </div>

      {/* Mobile toggle */}
      <button
        className="md:hidden p-2 rounded-xl text-white hover:bg-white/10 transition-all"
        onClick={() => setMobileOpen(v => !v)}
      >
        {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
      </button>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-4 right-4 mt-2 bg-primary/98 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-1 md:hidden"
        >
          <a href="https://raxwo.net/" className="flex items-center gap-2 px-4 py-3 rounded-xl text-white/80 hover:bg-white/10 text-sm font-medium transition-all">
            <FiHome size={15} /> raxwo.net
          </a>
          <Link to="/careers" className="flex items-center gap-2 px-4 py-3 rounded-xl text-white/80 hover:bg-white/10 text-sm font-medium transition-all" onClick={() => setMobileOpen(false)}>
            <FiBriefcase size={15} /> Careers
          </Link>
          {isClient ? (
            <>
              <Link to="/my-projects" className="flex items-center gap-2 px-4 py-3 rounded-xl text-white/80 hover:bg-white/10 text-sm font-medium" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <button onClick={handleLogout} className="text-left flex items-center gap-2 px-4 py-3 rounded-xl text-red-300 hover:bg-red-500/10 text-sm font-medium">Sign Out</button>
            </>
          ) : (
            <Link to="/login" className="px-4 py-3 rounded-xl bg-white text-primary text-sm font-bold text-center mt-1 shadow" onClick={() => setMobileOpen(false)}>Sign In</Link>
          )}
        </motion.div>
      )}
    </nav>
  )
}

/* ── Home Page ────────────────────────────────────────────────── */
export default function Home() {
  const [testIdx, setTestIdx] = useState(0)

  return (
    <div className="overflow-x-hidden">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen bg-gradient-hero flex items-center overflow-hidden">
        {/* Subtle static bg blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        {/* Embedded nav */}
        <HomeNav />

        <div className="container-max relative z-10 pt-28 pb-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — headline */}
            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.15 } } }}>
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/80 text-sm mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                🇱🇰 Based in Sri Lanka — Serving Globally
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-5xl lg:text-6xl font-bold text-white font-heading leading-tight mb-6">
                Innovative<br />
                <span className="bg-gradient-to-r from-blue-200 via-white to-blue-300 bg-clip-text text-transparent">
                  Software Solutions
                </span><br />
                in Sri Lanka
              </motion.h1>

              <motion.p variants={fadeUp} className="text-white/70 text-lg leading-relaxed mb-10 max-w-xl">
                We build powerful, scalable web & mobile applications that transform businesses. From startups to enterprise — we deliver results that matter.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                <Link to="/contact" className="btn-primary btn-lg">
                  Get a Free Quote <FiArrowRight />
                </Link>
                <Link to="/booking" className="btn-secondary btn-lg bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 hover:border-emerald-600 flex items-center gap-2">
                  Book a Service
                </Link>
                <Link to="/services" className="btn-outline btn-lg border-white/30 text-white hover:bg-white/10 hover:text-white">
                  View Our Services
                </Link>
              </motion.div>

              {/* Extra nav links — Careers & Back */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mt-8">
                <Link
                  to="/careers"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm font-medium hover:bg-white/20 hover:text-white transition-all backdrop-blur-sm"
                >
                  <FiBriefcase size={14} />
                  View Open Positions
                </Link>
                <a
                  href="https://raxwo.net/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/15 text-white/60 text-sm font-medium hover:bg-white/15 hover:text-white transition-all backdrop-blur-sm"
                >
                  <FiExternalLink size={14} />
                  Back to raxwo.net
                </a>
              </motion.div>
            </motion.div>

            {/* Right — sign-in form */}
            <HomeSignInForm />
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80L1440 80L1440 20C1200 80 960 0 720 40C480 80 240 0 0 20L0 80Z" fill="#F8FAFC" />
          </svg>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-16">
        <div className="container-max">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map(s => (
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

      {/* ── Tech Stack ────────────────────────────────────────── */}
      <section className="bg-white border-y border-slate-100 py-6">
        <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">
          Built With Modern, Battle-Tested Technologies
        </p>
        <div className="flex flex-wrap justify-center gap-4 px-6">
          {TECH_STACK.map((tech, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary/60" />{tech}
            </span>
          ))}
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────── */}
      <section className="section-padding bg-white">
        <div className="container-max">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <span className="badge badge-blue mb-4">Our Services</span>
            <h2 className="text-4xl font-bold text-primary font-heading mb-4">What We Build</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">End-to-end software solutions tailored for Sri Lankan businesses and global clients.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((s, i) => (
              <motion.div key={s.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="group cursor-pointer h-full">
                <TiltCard className="h-full">
                  <div className="p-8 h-full flex flex-col items-start bg-white/60">
                    <div className={`w-14 h-14 rounded-2xl ${s.color} flex items-center justify-center mb-6 shadow-sm`} style={{ transform: 'translateZ(40px)' }}>
                      <s.icon size={26} />
                    </div>
                    <h3 className="font-bold text-xl text-primary font-heading mb-3" style={{ transform: 'translateZ(30px)' }}>{s.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1" style={{ transform: 'translateZ(20px)' }}>{s.desc}</p>
                    <Link to="/services" className="mt-auto text-secondary font-medium text-sm flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity" style={{ transform: 'translateZ(30px)' }}>
                      Learn more <FiArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
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



      {/* ── Careers CTA ──────────────────────────────────────── */}
      <section className="section-padding bg-white">
        <div className="container-max">
          <div className="bg-gradient-hero rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 rounded-3xl" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 60%)' }} />
            <div className="relative">
              <span className="badge bg-white/10 text-white border border-white/20 mb-4"><FiBriefcase size={12} className="inline mr-1" /> Join Our Team</span>
              <h2 className="text-4xl font-bold text-white font-heading mb-4">Build Your Career at Raxwo</h2>
              <p className="text-white/70 max-w-xl mx-auto mb-8">
                We're always looking for talented engineers, designers, and problem-solvers. Work on exciting projects with a passionate team.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/careers" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100 transition-all shadow-lg">
                  View Open Positions <FiArrowRight />
                </Link>
                <a href="https://raxwo.net/" className="btn-outline btn-lg border-white/30 text-white hover:bg-white/10">
                  <FiExternalLink size={16} /> Back to raxwo.net
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
