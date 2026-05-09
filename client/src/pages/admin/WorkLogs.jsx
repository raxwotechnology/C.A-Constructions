import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiCheck, FiMessageSquare, FiFlag } from 'react-icons/fi'
import useAuthStore from '../../store/authStore'

export default function WorkLogs() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showSubmit, setShowSubmit] = useState(false)
  const [tasks, setTasks] = useState([{ taskName: '', hours: '', project: '' }])
  const [blockers, setBlockers] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [branchFilter, setBranchFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [commentTarget, setCommentTarget] = useState(null)
  const [commentText, setCommentText] = useState('')

  const isAdmin = ['admin', 'manager'].includes(user?.role)

  const { data: projData } = useQuery({ queryKey: ['projects-list'], queryFn: () => api.get('/projects').then(r => r.data) })
  const projects = projData?.projects || []

  const { data: branchData } = useQuery({ queryKey: ['branches-list'], queryFn: () => api.get('/branches').then(r => r.data), enabled: isAdmin })
  const branches = branchData?.branches || []

  const endpoint = isAdmin ? '/work-logs' : '/work-logs/my'
  const { data, isLoading } = useQuery({
    queryKey: ['work-logs', isAdmin, branchFilter, dateFilter],
    queryFn: () => api.get(`${endpoint}?${branchFilter?`branch=${branchFilter}&`:''}${dateFilter?`date=${dateFilter}`:''}`).then(r => r.data)
  })
  
  const logs = data?.logs || []
  const submissionRate = data?.submissionRate || 0

  const submitMut = useMutation({
    mutationFn: (payload) => api.post('/work-logs/my', payload).then(r => r.data),
    onSuccess: () => {
      toast.success('Work log submitted')
      setShowSubmit(false)
      setTasks([{ taskName: '', hours: '', project: '' }])
      setBlockers('')
      qc.invalidateQueries({ queryKey: ['work-logs'] })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to submit')
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => api.put(`/work-logs/${id}/status`, { status }),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['work-logs'] }) }
  })

  const commentMut = useMutation({
    mutationFn: ({ id, comment }) => api.post(`/work-logs/${id}/comments`, { comment }),
    onSuccess: () => { 
      toast.success('Comment added'); 
      setCommentText(''); 
      setCommentTarget(null);
      qc.invalidateQueries({ queryKey: ['work-logs'] }) 
    }
  })

  const addTask = () => setTasks([...tasks, { taskName: '', hours: '', project: '' }])
  const removeTask = (idx) => setTasks(tasks.filter((_, i) => i !== idx))
  const updateTask = (idx, field, value) => {
    const newTasks = [...tasks]
    newTasks[idx][field] = value
    setTasks(newTasks)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Daily Work Logs</h1>
          <p className="page-subtitle">Track daily tasks and project contributions.</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <input type="date" className="form-input text-sm" value={dateFilter} onChange={e => setDateFilter(e.target.value)}/>
              <select className="form-select text-sm" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
                <option value="">All Branches</option>
                {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </>
          )}
          {!isAdmin && <button onClick={() => setShowSubmit(true)} className="btn-primary gap-2"><FiPlus size={14}/> Submit Log</button>}
        </div>
      </div>

      {isAdmin && dateFilter && (
        <div className="card card-body bg-blue-50 border border-blue-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-blue-900">Submission Rate for {new Date(dateFilter).toLocaleDateString()}</h3>
            <p className="text-sm text-blue-700">Percentage of active employees who submitted logs.</p>
          </div>
          <div className="text-3xl font-black text-blue-700">{submissionRate}%</div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"/></div>
      ) : (
        <div className="space-y-4">
          {logs.map(log => (
            <div key={log._id} className="card p-0 overflow-hidden border border-slate-200">
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                      {log.employee?.userId?.avatar ? <img src={log.employee.userId.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">{log.employee?.userId?.name?.charAt(0)}</div>}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-primary">{isAdmin ? log.employee?.userId?.name : 'My Work Log'}</h3>
                    <p className="text-xs text-slate-500">{new Date(log.date).toLocaleDateString()} • {log.totalHours} hrs total</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${log.status==='reviewed'?'badge-green':log.status==='flagged'?'badge-red':'badge-blue'} capitalize`}>{log.status}</span>
                  {isAdmin && log.status !== 'reviewed' && <button onClick={() => statusMut.mutate({ id: log._id, status: 'reviewed' })} className="btn-outline btn-sm text-emerald-600 hover:bg-emerald-50 border-emerald-200">Mark Reviewed</button>}
                  {isAdmin && log.status !== 'flagged' && <button onClick={() => statusMut.mutate({ id: log._id, status: 'flagged' })} className="btn-outline btn-sm text-red-600 hover:bg-red-50 border-red-200"><FiFlag size={12}/> Flag</button>}
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-700">Tasks Completed:</p>
                  <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
                    {log.tasks.map((t, idx) => (
                      <li key={idx}>
                        <span className="font-medium text-slate-800">{t.taskName}</span> 
                        <span className="text-slate-400 ml-2">({t.hours} hrs)</span>
                        {t.project && <span className="ml-2 badge badge-gray text-[10px]">{t.project.title}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
                {log.blockers && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                    <p className="text-xs font-bold text-red-800 mb-1">Blockers / Issues:</p>
                    <p className="text-sm text-red-700">{log.blockers}</p>
                  </div>
                )}
                
                {log.comments && log.comments.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-2 mt-4">
                    <p className="text-xs font-bold text-slate-500 uppercase">Comments</p>
                    {log.comments.map((c, i) => (
                      <div key={i} className="bg-slate-50 p-2 rounded text-sm">
                        <span className="font-bold text-slate-700 mr-2">{c.name}:</span>
                        <span className="text-slate-600">{c.comment}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {isAdmin && (
                  <div className="pt-2">
                    {commentTarget === log._id ? (
                      <div className="flex gap-2">
                        <input className="form-input flex-1 py-1.5 text-sm" placeholder="Add a comment..." autoFocus value={commentText} onChange={e => setCommentText(e.target.value)}/>
                        <button onClick={() => commentMut.mutate({ id: log._id, comment: commentText })} disabled={!commentText} className="btn-primary btn-sm px-3">Send</button>
                        <button onClick={() => {setCommentTarget(null); setCommentText('')}} className="btn-ghost btn-sm px-2"><FiX/></button>
                      </div>
                    ) : (
                      <button onClick={() => setCommentTarget(log._id)} className="text-xs text-secondary hover:underline flex items-center gap-1 font-medium"><FiMessageSquare size={12}/> Add Comment</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
              <FiCheck size={40} className="mx-auto mb-3 opacity-20"/>
              <p>No work logs found for this period.</p>
            </div>
          )}
        </div>
      )}

      {/* Submit Modal */}
      {showSubmit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <h2 className="font-bold text-primary text-lg">Submit Daily Work Log</h2>
              <button onClick={() => setShowSubmit(false)} className="p-2 hover:bg-slate-200 rounded-lg"><FiX size={18}/></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)}/>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="form-label mb-0">Tasks Completed</label>
                  <button onClick={addTask} className="text-xs text-secondary font-bold hover:underline flex items-center gap-1"><FiPlus size={12}/> Add Task</button>
                </div>
                {tasks.map((t, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative group">
                    {tasks.length > 1 && <button onClick={() => removeTask(idx)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><FiX size={14}/></button>}
                    <div><label className="text-xs font-bold text-slate-500">Task Description</label><input className="form-input text-sm py-1.5" placeholder="What did you do?" value={t.taskName} onChange={e => updateTask(idx, 'taskName', e.target.value)}/></div>
                    <div className="flex gap-3">
                      <div className="flex-1"><label className="text-xs font-bold text-slate-500">Hours</label><input type="number" min="0" step="0.5" className="form-input text-sm py-1.5" placeholder="e.g. 2.5" value={t.hours} onChange={e => updateTask(idx, 'hours', e.target.value)}/></div>
                      <div className="flex-[2]"><label className="text-xs font-bold text-slate-500">Project (Optional)</label>
                        <select className="form-select text-sm py-1.5" value={t.project} onChange={e => updateTask(idx, 'project', e.target.value)}>
                          <option value="">None</option>
                          {projects.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="form-label">Blockers / Issues (Optional)</label>
                <textarea className="form-input" rows="2" placeholder="Any blockers preventing progress?" value={blockers} onChange={e => setBlockers(e.target.value)}></textarea>
              </div>
            </div>
            <div className="p-5 border-t bg-slate-50 rounded-b-2xl">
              <button 
                onClick={() => submitMut.mutate({ date, tasks: tasks.filter(t => t.taskName && t.hours), blockers })} 
                disabled={!tasks[0].taskName || !tasks[0].hours || submitMut.isPending} 
                className="btn-primary w-full justify-center"
              >
                {submitMut.isPending ? <span className="spinner"/> : 'Submit Work Log'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
