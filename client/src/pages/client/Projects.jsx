import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import { FiFolder, FiCalendar, FiTrendingUp } from 'react-icons/fi'

export default function ClientProjects() {
  const { data, isLoading } = useQuery({
    queryKey: ['client-projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })
  const projects = data?.projects || []
  const statusColor = { planning:'badge-gray', active:'badge-green', on_hold:'badge-yellow', completed:'badge-blue', cancelled:'badge-red' }

  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-hero pt-32 pb-10">
        <div className="container-max">
          <p className="text-white/70 text-sm">Client Portal</p>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-white mt-2">My Projects</h1>
          <p className="text-white/75 mt-2">{projects.length} total projects</p>
        </div>
      </section>

      <section className="section-padding bg-slate-50">
        <div className="container-max space-y-6">

      {isLoading ? (
        <div className="text-center py-16"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin mx-auto"/></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FiFolder size={48} className="mx-auto mb-3 opacity-30"/>
          <p className="font-medium">No projects assigned yet</p>
          <p className="text-sm mt-1">Contact Raxwo to start a project</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((p, i) => (
            <motion.div key={p._id} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}
              className="card card-body">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <FiFolder className="text-secondary" size={20}/>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-bold text-primary font-heading text-lg">{p.title}</h3>
                    <span className={`badge ${statusColor[p.status]||'badge-gray'} capitalize`}>{p.status}</span>
                    <span className={`badge capitalize ${p.priority==='high'||p.priority==='critical'?'badge-red':'badge-yellow'}`}>{p.priority}</span>
                  </div>
                  <p className="text-gray-500 text-sm mb-4">{p.description}</p>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span className="font-medium">Overall Progress</span>
                      <span className="font-bold text-secondary">{p.progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill bg-secondary" style={{width:`${p.progress}%`}}/>
                    </div>
                  </div>

                  {/* Milestones */}
                  {p.milestones?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Milestones</p>
                      <div className="flex flex-wrap gap-2">
                        {p.milestones.map((m, mi) => (
                          <div key={mi} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                            ${m.completed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${m.completed ? 'bg-green-500' : 'bg-gray-300'}`}/>
                            {m.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meta */}
                  <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
                    {p.budget > 0 && <span className="flex items-center gap-1"><FiTrendingUp size={11}/> Budget: LKR {p.budget?.toLocaleString()}</span>}
                    {p.startDate && <span className="flex items-center gap-1"><FiCalendar size={11}/> Started: {new Date(p.startDate).toLocaleDateString('en-LK')}</span>}
                    {p.deadline && <span className="flex items-center gap-1"><FiCalendar size={11}/> Deadline: {new Date(p.deadline).toLocaleDateString('en-LK')}</span>}
                    {p.technologies?.length > 0 && <span>Tech: {p.technologies.join(', ')}</span>}
                  </div>
                  
                  {p.budget > 0 && p.paymentStatus !== 'paid' && p.paymentStatus !== 'none' && (
                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                      <button 
                        className="btn-primary btn-sm text-xs" 
                        onClick={async () => {
                          try {
                            const { data } = await api.post('/payments/payhere/init', { itemId: p._id, itemType: 'project' });
                            const pd = data.paymentData;
                            const form = document.createElement('form');
                            form.method = 'POST';
                            form.action = pd.sandbox ? 'https://sandbox.payhere.lk/pay/checkout' : 'https://www.payhere.lk/pay/checkout';
                            Object.entries(pd).filter(([k]) => k !== 'sandbox' && k !== 'paymentId').forEach(([k, v]) => {
                              const input = document.createElement('input');
                              input.type = 'hidden'; input.name = k; input.value = v;
                              form.appendChild(input);
                            });
                            document.body.appendChild(form);
                            form.submit();
                          } catch (err) {
                            alert(err.response?.data?.message || 'Payment initiation failed');
                          }
                        }}
                      >
                        Pay LKR {p.budget?.toLocaleString()}
                      </button>
                    </div>
                  )}
                </div>
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
