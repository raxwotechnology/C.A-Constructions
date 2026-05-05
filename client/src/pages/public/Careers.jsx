import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import { FiBriefcase, FiMapPin, FiClock, FiArrowRight, FiSearch } from 'react-icons/fi'
import { useState } from 'react'

export default function Careers() {
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['public-jobs'],
    queryFn: () => api.get('/recruitment/jobs?status=open').then(r => r.data),
  })

  const jobs = (data?.jobs || []).filter(j => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase()) || j.department.toLowerCase().includes(search.toLowerCase())
    const matchDept = !dept || j.department === dept
    return matchSearch && matchDept
  })

  const departments = [...new Set((data?.jobs || []).map(j => j.department))]

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-hero section-padding pt-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 right-20 w-64 h-64 bg-secondary/15 rounded-full blur-3xl" />
        </div>
        <div className="container-max relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <span className="badge bg-white/10 text-white border border-white/20 mb-4">We're Hiring</span>
            <h1 className="text-5xl font-bold text-white font-heading mb-4">Join Our Team</h1>
            <p className="text-white/70 max-w-2xl mx-auto text-lg">Build your career at Raxwo. Work on exciting projects with brilliant minds in a collaborative, growth-focused environment.</p>
          </motion.div>

          {/* Why Raxwo */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: '🚀', title: 'Exciting Projects', desc: 'Work on cutting-edge systems for diverse industries' },
              { icon: '📈', title: 'Career Growth', desc: 'Clear advancement paths with mentorship and training' },
              { icon: '💰', title: 'Competitive Pay', desc: 'Market-leading salaries with EPF/ETF and bonuses' },
            ].map(p => (
              <div key={p.title} className="glass-card p-6 text-center">
                <div className="text-3xl mb-3">{p.icon}</div>
                <h3 className="font-semibold text-white font-heading mb-1">{p.title}</h3>
                <p className="text-white/60 text-sm">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Jobs */}
      <section className="section-padding bg-gray-50">
        <div className="container-max">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search positions..." className="form-input pl-10" />
            </div>
            <select value={dept} onChange={e => setDept(e.target.value)} className="form-select md:w-48">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-20">
              <FiBriefcase size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-500">No positions found</h3>
              <p className="text-gray-400 mt-2">Try adjusting your search or check back soon.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job, i) => (
                <motion.div
                  key={job._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="card card-body card-hover flex flex-col md:flex-row md:items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <FiBriefcase className="text-secondary" size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-primary font-heading text-lg">{job.title}</h3>
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-gray-500"><FiBriefcase size={12} /> {job.department}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500"><FiMapPin size={12} /> {job.location}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500"><FiClock size={12} /> {job.type}</span>
                      {job.salaryRange?.min && (
                        <span className="text-xs text-accent font-medium">
                          LKR {job.salaryRange.min.toLocaleString()} – {job.salaryRange.max?.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/careers/${job._id}`} className="btn-ghost btn-sm">View Details</Link>
                    <Link to={`/careers/${job._id}/apply`} className="btn-primary btn-sm">Apply Now <FiArrowRight size={13} /></Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
