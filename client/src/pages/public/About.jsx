import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiAward, FiUsers, FiTarget, FiGlobe, FiHeart, FiZap, FiShield, FiTrendingUp } from 'react-icons/fi'

const team = [
  { name: 'Rajan Perera', role: 'CEO & Founder', dept: 'Leadership', initials: 'RP', color: 'bg-blue-500' },
  { name: 'Amali Silva', role: 'CTO', dept: 'Engineering', initials: 'AS', color: 'bg-purple-500' },
  { name: 'Nimal Fernando', role: 'Head of Design', dept: 'Design', initials: 'NF', color: 'bg-green-500' },
  { name: 'Sanduni Jayawardena', role: 'HR Manager', dept: 'Human Resources', initials: 'SJ', color: 'bg-orange-500' },
  { name: 'Kasun Rathnayake', role: 'Lead Engineer', dept: 'Engineering', initials: 'KR', color: 'bg-red-500' },
  { name: 'Malini Gunawardena', role: 'Project Manager', dept: 'Operations', initials: 'MG', color: 'bg-teal-500' },
]

const values = [
  { icon: FiZap, title: 'Innovation First', desc: 'We embrace new technologies and creative approaches to solve complex problems.', color: 'bg-yellow-50 text-yellow-600' },
  { icon: FiHeart, title: 'Client-Centric', desc: 'Every decision we make starts with our clients\' success and satisfaction in mind.', color: 'bg-red-50 text-red-600' },
  { icon: FiShield, title: 'Quality & Trust', desc: 'We deliver robust, tested, and secure solutions you can depend on for years.', color: 'bg-blue-50 text-blue-600' },
  { icon: FiUsers, title: 'Collaborative Spirit', desc: 'We believe the best work happens when talented people work together openly.', color: 'bg-green-50 text-green-600' },
  { icon: FiTarget, title: 'Results-Driven', desc: 'We measure success by the tangible impact our work has on your business.', color: 'bg-purple-50 text-purple-600' },
  { icon: FiGlobe, title: 'Global Mindset', desc: 'Sri Lankan roots, global standards — we serve clients across 15+ countries.', color: 'bg-teal-50 text-teal-600' },
]

const milestones = [
  { year: '2020', title: 'Founded in Colombo', desc: 'Raxwo was founded with a vision to bring world-class software development to Sri Lanka.' },
  { year: '2021', title: 'First 10 Clients', desc: 'Delivered 10 successful projects across e-commerce, healthcare, and finance verticals.' },
  { year: '2022', title: 'Team of 20', desc: 'Expanded to 20 engineers and designers, opened our first dedicated office in Colombo 03.' },
  { year: '2023', title: 'ISO Certified & 50+ Projects', desc: 'Achieved ISO 9001 certification and surpassed 50 completed projects milestone.' },
  { year: '2024', title: 'International Expansion', desc: 'Serving clients in UAE, UK, and Australia. Team grew to 35+ professionals.' },
  { year: '2026', title: 'Raxwo Portal Launch', desc: 'Launched our proprietary HRM platform to streamline internal operations.' },
]

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }

export default function About() {
  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <section className="relative bg-gradient-hero pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute -bottom-20 -left-40 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl" />
        </div>
        <div className="container-max relative z-10 text-center">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.15 } } }}>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/80 text-sm mb-6">
              <FiAward size={14} /> Trusted by 120+ businesses
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-5xl lg:text-6xl font-bold text-white font-heading leading-tight mb-6">
              About <span className="bg-gradient-to-r from-blue-300 to-blue-100 bg-clip-text text-transparent">Raxwo</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-white/70 text-xl max-w-2xl mx-auto">
              We are a passionate team of engineers, designers, and strategists building the future of software — from Colombo, Sri Lanka, for the world.
            </motion.p>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80L1440 80L1440 20C1200 80 960 0 720 40C480 80 240 0 0 20L0 80Z" fill="#F8FAFC" />
          </svg>
        </div>
      </section>

      {/* Mission */}
      <section className="section-padding bg-gray-50">
        <div className="container-max">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="badge badge-blue mb-4">Our Mission</span>
              <h2 className="text-4xl font-bold text-primary font-heading mb-6">
                Empowering Businesses Through Technology
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                At Raxwo, we believe technology should be an enabler, not a barrier. Founded in 2020, we've grown from a small startup into a team of 35+ professionals delivering enterprise-grade software solutions to clients across Asia, the Middle East, and beyond.
              </p>
              <p className="text-gray-600 leading-relaxed mb-8">
                Our strength lies in our ability to understand business challenges and translate them into elegant, scalable technical solutions — all while maintaining the warmth and personal touch of a boutique consultancy.
              </p>
              <div className="flex gap-4">
                <Link to="/careers" className="btn-primary">Join Our Team <FiArrowRight /></Link>
                <Link to="/contact" className="btn-outline">Get in Touch</Link>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="grid grid-cols-2 gap-4">
              {[
                { num: '120+', label: 'Happy Clients', color: 'bg-blue-500' },
                { num: '50+', label: 'Projects Delivered', color: 'bg-green-500' },
                { num: '35+', label: 'Team Members', color: 'bg-purple-500' },
                { num: '15+', label: 'Countries Served', color: 'bg-orange-500' },
              ].map(s => (
                <div key={s.label} className="card card-body text-center">
                  <p className={`text-4xl font-bold font-heading mb-1 bg-clip-text text-transparent bg-gradient-to-br ${s.color === 'bg-blue-500' ? 'from-blue-500 to-blue-700' : s.color === 'bg-green-500' ? 'from-green-500 to-green-700' : s.color === 'bg-purple-500' ? 'from-purple-500 to-purple-700' : 'from-orange-500 to-orange-700'}`}>{s.num}</p>
                  <p className="text-gray-500 text-sm">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-white">
        <div className="container-max">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <span className="badge badge-green mb-4">Our Values</span>
            <h2 className="text-4xl font-bold text-primary font-heading mb-4">What Drives Us</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Six core values that guide every decision, every line of code, and every client interaction.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="card card-body card-hover group"
              >
                <div className={`w-12 h-12 rounded-2xl ${v.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <v.icon size={22} />
                </div>
                <h3 className="font-semibold text-primary font-heading mb-2">{v.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section-padding bg-gray-50">
        <div className="container-max">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <span className="badge badge-purple mb-4">Our Journey</span>
            <h2 className="text-4xl font-bold text-primary font-heading mb-4">Milestones & Growth</h2>
          </motion.div>

          <div className="relative max-w-3xl mx-auto">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-8">
              {milestones.map((m, i) => (
                <motion.div
                  key={m.year}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-6"
                >
                  <div className="w-16 flex-shrink-0 flex flex-col items-center">
                    <div className="w-4 h-4 rounded-full bg-secondary border-4 border-white shadow-blue z-10" />
                    <span className="text-xs font-bold text-secondary mt-2">{m.year}</span>
                  </div>
                  <div className="card card-body flex-1 mb-0">
                    <h3 className="font-semibold text-primary font-heading mb-1">{m.title}</h3>
                    <p className="text-gray-500 text-sm">{m.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section-padding bg-white">
        <div className="container-max">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <span className="badge badge-blue mb-4">The Team</span>
            <h2 className="text-4xl font-bold text-primary font-heading mb-4">Meet Our Leaders</h2>
            <p className="text-gray-500 max-w-xl mx-auto">A diverse, talented group of professionals passionate about building great software.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card card-body card-hover text-center group"
              >
                <div className={`w-20 h-20 ${member.color} rounded-2xl flex items-center justify-center text-white font-bold text-2xl font-heading mx-auto mb-4 group-hover:scale-105 transition-transform shadow-lg`}>
                  {member.initials}
                </div>
                <h3 className="font-semibold text-primary font-heading">{member.name}</h3>
                <p className="text-secondary text-sm font-medium mt-0.5">{member.role}</p>
                <span className="badge badge-gray mt-2">{member.dept}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-gradient-hero">
        <div className="container-max text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-4xl font-bold text-white font-heading mb-6">Ready to Work With Us?</h2>
            <p className="text-white/70 text-lg max-w-xl mx-auto mb-10">
              Whether you need a new system built from scratch or want to modernize your existing platform, let's talk.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/contact" className="btn-primary btn-lg">Start a Project <FiArrowRight /></Link>
              <Link to="/careers" className="btn-outline btn-lg border-white/30 text-white hover:bg-white/10">Join Our Team</Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
