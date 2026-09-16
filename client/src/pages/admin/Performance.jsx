import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import { assignableEmployeesUrl } from '../../lib/employeeApi'
import toast from 'react-hot-toast'
import { FiPlus, FiX, FiTarget, FiAward, FiTrendingUp, FiEdit2, FiTrash2, FiCheck } from 'react-icons/fi'
import { useDeleteWithPassword } from '../../components/admin/DeletePasswordGate'

const now = new Date()
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const STATUS_COLOR = { active:'badge-blue', achieved:'badge-green', partial:'badge-yellow', missed:'badge-red', cancelled:'badge-gray' }
const TYPE_COLOR   = { monthly:'bg-blue-100 text-blue-700', quarterly:'bg-purple-100 text-purple-700', annual:'bg-orange-100 text-orange-700' }

const EMPTY_TARGET = {
  employee:'', title:'', description:'', type:'monthly',
  month: now.getMonth()+1, quarter:1, year: now.getFullYear(),
  targetValue:'', achievedValue:'', unit:'tasks',
  bonusEnabled:false, bonusAmount:'', bonusPercentage:'', notes:'',
}

export default function AdminPerformance() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('targets') // 'targets' | 'reviews' | 'overview'
  const [showTarget, setShowTarget] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [targetForm, setTargetForm] = useState(EMPTY_TARGET)
  const [filterEmp, setFilterEmp] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showReview, setShowReview] = useState(false)
  const [editReview, setEditReview] = useState(null)
  const [reviewForm, setReviewForm] = useState({ developer:'', month: now.getMonth()+1, year: now.getFullYear(), tasksCompleted:0, commits:0, codeQuality:0, collaboration:0, notes:'' })

  // ── Data ──────────────────────────────────────────────────────────────────────
  const { data: empData } = useQuery({ queryKey:['employees-list-mini'], queryFn:()=>api.get(assignableEmployeesUrl()).then(r=>r.data) })
  const employees = empData?.employees || []

  const { data: targetData, isLoading:tLoading } = useQuery({
    queryKey:['targets', filterEmp, filterStatus],
    queryFn:()=> {
      const p = new URLSearchParams()
      if(filterEmp) p.set('employee',filterEmp)
      if(filterStatus) p.set('status',filterStatus)
      return api.get(`/targets?${p}`).then(r=>r.data)
    }
  })
  const targets = targetData?.targets || []

  const { data: perfData } = useQuery({ queryKey:['performance-records'], queryFn:()=>api.get('/performance').then(r=>r.data) })
  const reviews = perfData?.records || []

  const { data: statsData } = useQuery({ queryKey:['target-stats'], queryFn:()=>api.get('/targets/stats').then(r=>r.data) })
  const stats = statsData?.stats || {}

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const inv = () => { qc.invalidateQueries(['targets']); qc.invalidateQueries(['target-stats']) }

  const createMut = useMutation({
    mutationFn: d => api.post('/targets', d),
    onSuccess: () => { inv(); toast.success('Target created'); setShowTarget(false); setTargetForm(EMPTY_TARGET) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const updateMut = useMutation({
    mutationFn: ({id,...d}) => api.put(`/targets/${id}`, d),
    onSuccess: () => { inv(); toast.success('Target updated'); setEditTarget(null) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/targets/${id}`),
    onSuccess: () => { inv(); toast.success('Deleted') },
  })
  const { requestDelete: requestDeleteTarget, DeletePasswordModal: targetDeleteModal } = useDeleteWithPassword(deleteMut, {
    title: 'Delete performance target',
    message: 'Enter your admin password to delete this target.',
  })
  const reviewMut = useMutation({
    mutationFn: d => api.post('/performance', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['performance-records'] }); toast.success('Review saved'); setShowReview(false) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const updateReviewMut = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/performance/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['performance-records'] }); toast.success('Review updated'); setEditReview(null) },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const deleteReviewMut = useMutation({
    mutationFn: id => api.delete(`/performance/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['performance-records'] }); toast.success('Review deleted') },
  })
  const { requestDelete: requestDeleteReview, DeletePasswordModal: reviewDeleteModal } = useDeleteWithPassword(deleteReviewMut, {
    title: 'Delete performance review',
    message: 'Enter your admin password to delete this review record.',
  })

  const tf = targetForm
  const pct = t => t.targetValue > 0 ? Math.min(100, Math.round((t.achievedValue/t.targetValue)*100)) : 0

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Performance & Targets</h1>
          <p className="page-subtitle">{stats.total||0} targets · {stats.achieved||0} achieved</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setShowReview(true)} className="btn-ghost text-sm border border-slate-200">
            <FiEdit2 size={14}/> Add Review
          </button>
          <button onClick={()=>{ setShowTarget(true); setTargetForm(EMPTY_TARGET); setEditTarget(null) }} className="btn-primary">
            <FiPlus size={14}/> New Target
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Total Targets', value:stats.total||0, color:'kpi-blue', icon:<FiTarget size={18}/> },
          { label:'Achieved',      value:stats.achieved||0, color:'kpi-green', icon:<FiCheck size={18}/> },
          { label:'In Progress',   value:(stats.active||0)+(stats.partial||0), color:'kpi-yellow', icon:<FiTrendingUp size={18}/> },
          { label:'Reviews',       value:reviews.length, color:'kpi-purple', icon:<FiAward size={18}/> },
        ].map(k=>(
          <div key={k.label} className={`kpi-card ${k.color} flex items-center gap-3`}>
            <div className="text-secondary opacity-70">{k.icon}</div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-medium">{k.label}</p>
              <p className="text-2xl font-bold text-primary">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[['targets','🎯 Targets'],['reviews','📋 Reviews']].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab===key?'bg-white shadow text-primary':'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Targets Tab */}
      {tab==='targets' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <select className="form-select py-2 text-sm w-48" value={filterEmp} onChange={e=>setFilterEmp(e.target.value)}>
              <option value="">All Employees</option>
              {employees.map(e=><option key={e._id} value={e._id}>{e.userId?.name}</option>)}
            </select>
            <select className="form-select py-2 text-sm w-36" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              {['active','achieved','partial','missed','cancelled'].map(s=><option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
            {(filterEmp||filterStatus) && <button onClick={()=>{setFilterEmp('');setFilterStatus('')}} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>}
          </div>

          {tLoading ? (
            <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"/></div>
          ) : targets.length===0 ? (
            <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200">
              <FiTarget size={40} className="mx-auto mb-3 opacity-30"/>
              <p>No targets yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {targets.map(t=>(
                <motion.div key={t._id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="card card-body">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[t.type]}`}>{t.type}</span>
                        <span className={`badge ${STATUS_COLOR[t.status]||'badge-gray'} capitalize`}>{t.status}</span>
                      </div>
                      <h3 className="font-bold text-slate-800 truncate">{t.title}</h3>
                      <p className="text-xs text-slate-500">{t.employee?.userId?.name}</p>
                    </div>
                    <div className="flex gap-1 ml-2 flex-shrink-0">
                      <button onClick={()=>{setEditTarget(t);setTargetForm({...t,employee:t.employee?._id||t.employee,bonusAmount:t.bonusAmount||'',bonusPercentage:t.bonusPercentage||''});setShowTarget(true)}}
                        className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg"><FiEdit2 size={13}/></button>
                      <button type="button" onClick={()=>requestDeleteTarget(t._id)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg"><FiTrash2 size={13}/></button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{t.achievedValue} / {t.targetValue} {t.unit}</span>
                      <span className="font-bold text-slate-700">{pct(t)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${pct(t)>=100?'bg-green-500':pct(t)>=50?'bg-blue-500':'bg-amber-400'}`}
                        style={{width:`${pct(t)}%`}}/>
                    </div>
                  </div>

                  {/* Period */}
                  <div className="text-xs text-slate-400">
                    {t.type==='monthly' && t.month && <span>{MONTHS[t.month-1]} {t.year}</span>}
                    {t.type==='quarterly' && t.quarter && <span>Q{t.quarter} {t.year}</span>}
                    {t.type==='annual' && <span>Year {t.year}</span>}
                  </div>
                  {t.bonusEnabled && <div className="mt-2 text-xs text-emerald-600 font-medium">💰 Bonus: LKR {(t.bonusAmount||0).toLocaleString()}{t.bonusPercentage?` + ${t.bonusPercentage}% salary`:''}</div>}
                  {t.bonusAdded && <div className="mt-1 text-xs text-green-600">✅ Bonus added to payroll</div>}

                  {/* Quick update achieved */}
                  {t.status==='active'||t.status==='partial' ? (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                      <input type="number" placeholder="Update achieved" min={0} max={t.targetValue}
                        className="form-input py-1 text-xs flex-1"
                        defaultValue={t.achievedValue}
                        id={`ach-${t._id}`}/>
                      <button onClick={()=>{
                        const v = document.getElementById(`ach-${t._id}`)?.value
                        if(v!==undefined) updateMut.mutate({id:t._id, achievedValue:Number(v)})
                      }} className="btn-primary py-1 px-3 text-xs">Update</button>
                    </div>
                  ):null}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reviews Tab */}
      {tab==='reviews' && (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Employee</th><th>Period</th><th>Tasks</th><th>Commits</th><th>Code Q.</th><th>Collaboration</th><th>Score</th><th>Actions</th></tr></thead>
            <tbody>
              {reviews.length===0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">No performance reviews yet.</td></tr>
              ) : reviews.map(r=>(
                <tr key={r._id}>
                  <td className="font-medium">{r.developer?.name||'—'}</td>
                  <td className="text-slate-500">{MONTHS[(r.month||1)-1]} {r.year}</td>
                  <td>{r.tasksCompleted||0}</td>
                  <td>{r.commits||0}</td>
                  <td>{r.codeQuality||0}</td>
                  <td>{r.collaboration||0}</td>
                  <td><span className="badge badge-green">{r.score||0}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setEditReview(r)} className="p-1.5 hover:bg-amber-50 text-slate-300 hover:text-amber-600 rounded-lg" title="Edit"><FiEdit2 size={13}/></button>
                      <button type="button" onClick={() => requestDeleteReview(r._id)} className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg" title="Delete"><FiTrash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Target Modal */}
      {showTarget && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]">
          <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b shrink-0">
              <h3 className="font-bold text-primary">{editTarget?'Edit Target':'New Target'}</h3>
              <button onClick={()=>{setShowTarget(false);setEditTarget(null)}} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              <div>
                <label className="form-label">Employee *</label>
                <select className="form-select" value={tf.employee} onChange={e=>setTargetForm(s=>({...s,employee:e.target.value}))}>
                  <option value="">Select employee</option>
                  {employees.map(e=><option key={e._id} value={e._id}>{e.userId?.name} ({e.employeeNo})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="form-label">Title *</label>
                  <input className="form-input" value={tf.title} onChange={e=>setTargetForm(s=>({...s,title:e.target.value}))} placeholder="e.g. Complete 5 projects"/>
                </div>
                <div>
                  <label className="form-label">Type</label>
                  <select className="form-select" value={tf.type} onChange={e=>setTargetForm(s=>({...s,type:e.target.value}))}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Year</label>
                  <input type="number" className="form-input" value={tf.year} onChange={e=>setTargetForm(s=>({...s,year:Number(e.target.value)}))}/>
                </div>
                {tf.type==='monthly' && <div>
                  <label className="form-label">Month</label>
                  <select className="form-select" value={tf.month} onChange={e=>setTargetForm(s=>({...s,month:Number(e.target.value)}))}>
                    {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>}
                {tf.type==='quarterly' && <div>
                  <label className="form-label">Quarter</label>
                  <select className="form-select" value={tf.quarter} onChange={e=>setTargetForm(s=>({...s,quarter:Number(e.target.value)}))}>
                    {[1,2,3,4].map(q=><option key={q} value={q}>Q{q}</option>)}
                  </select>
                </div>}
                <div>
                  <label className="form-label">Target Value *</label>
                  <input type="number" className="form-input" value={tf.targetValue} onChange={e=>setTargetForm(s=>({...s,targetValue:e.target.value}))} placeholder="e.g. 10"/>
                </div>
                <div>
                  <label className="form-label">Unit</label>
                  <input className="form-input" value={tf.unit} onChange={e=>setTargetForm(s=>({...s,unit:e.target.value}))} placeholder="tasks / projects / LKR"/>
                </div>
                <div>
                  <label className="form-label">Achieved So Far</label>
                  <input type="number" className="form-input" value={tf.achievedValue} onChange={e=>setTargetForm(s=>({...s,achievedValue:e.target.value}))} placeholder="0"/>
                </div>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="bonusEnabled" checked={!!tf.bonusEnabled} onChange={e=>setTargetForm(s=>({...s,bonusEnabled:e.target.checked}))} className="w-4 h-4 accent-emerald-600"/>
                  <label htmlFor="bonusEnabled" className="text-sm font-bold text-emerald-800">Enable Auto-Bonus on Achievement</label>
                </div>
                {tf.bonusEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label text-xs">Fixed Bonus (LKR)</label>
                      <input type="number" className="form-input" value={tf.bonusAmount} onChange={e=>setTargetForm(s=>({...s,bonusAmount:e.target.value}))} placeholder="0"/>
                    </div>
                    <div>
                      <label className="form-label text-xs">% of Basic Salary</label>
                      <input type="number" className="form-input" value={tf.bonusPercentage} onChange={e=>setTargetForm(s=>({...s,bonusPercentage:e.target.value}))} placeholder="0"/>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="form-label">Notes</label>
                <textarea rows={2} className="form-input resize-none" value={tf.notes} onChange={e=>setTargetForm(s=>({...s,notes:e.target.value}))} placeholder="Optional notes"/>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t shrink-0">
              <button onClick={()=>{setShowTarget(false);setEditTarget(null)}} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button disabled={createMut.isPending||updateMut.isPending} className="btn-primary flex-1 justify-center"
                onClick={()=>{
                  const payload = {...tf, targetValue:Number(tf.targetValue), achievedValue:Number(tf.achievedValue||0), bonusAmount:Number(tf.bonusAmount||0), bonusPercentage:Number(tf.bonusPercentage||0)}
                  editTarget ? updateMut.mutate({id:editTarget._id,...payload}) : createMut.mutate(payload)
                }}>
                {createMut.isPending||updateMut.isPending?<span className="spinner"/>:editTarget?'Save':'Create Target'}
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}

      {/* Add Review Modal */}
      {showReview && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]">
          <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-primary">Manual Performance Review</h3>
              <button onClick={()=>setShowReview(false)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="form-label">Employee</label>
                <select className="form-select" value={reviewForm.developer} onChange={e=>setReviewForm(s=>({...s,developer:e.target.value}))}>
                  <option value="">Select employee</option>
                  {employees.map(e=><option key={e.userId?._id} value={e.userId?._id}>{e.userId?.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Month</label>
                  <select className="form-select" value={reviewForm.month} onChange={e=>setReviewForm(s=>({...s,month:Number(e.target.value)}))}>
                    {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Year</label>
                  <input type="number" className="form-input" value={reviewForm.year} onChange={e=>setReviewForm(s=>({...s,year:Number(e.target.value)}))}/>
                </div>
                {[['tasksCompleted','Tasks Completed'],['commits','Commits'],['codeQuality','Code Quality (0-100)'],['collaboration','Collaboration (0-100)']].map(([key,label])=>(
                  <div key={key}>
                    <label className="form-label">{label}</label>
                    <input type="number" min={0} max={100} className="form-input" value={reviewForm[key]} onChange={e=>setReviewForm(s=>({...s,[key]:Number(e.target.value)}))}/>
                  </div>
                ))}
              </div>
              <div>
                <label className="form-label">Notes</label>
                <textarea rows={2} className="form-input resize-none" value={reviewForm.notes} onChange={e=>setReviewForm(s=>({...s,notes:e.target.value}))}/>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={()=>setShowReview(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button disabled={reviewMut.isPending||!reviewForm.developer} onClick={()=>reviewMut.mutate(reviewForm)} className="btn-primary flex-1 justify-center">
                {reviewMut.isPending?<span className="spinner"/>:'Save Review'}
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}

      {editReview && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]">
          <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-primary">Edit Review — {editReview.developer?.name}</h3>
              <button onClick={()=>setEditReview(null)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-500">{MONTHS[(editReview.month||1)-1]} {editReview.year}</p>
              {[['tasksCompleted','Tasks Completed'],['commits','Commits'],['codeQuality','Code Quality (0-100)'],['collaboration','Collaboration (0-100)']].map(([key,label])=>(
                <div key={key}>
                  <label className="form-label">{label}</label>
                  <input type="number" min={0} max={100} className="form-input" defaultValue={editReview[key]||0}
                    id={`edit-review-${key}`}/>
                </div>
              ))}
              <div>
                <label className="form-label">Notes</label>
                <textarea rows={2} className="form-input resize-none" defaultValue={editReview.notes||''} id="edit-review-notes"/>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={()=>setEditReview(null)} className="btn-ghost flex-1 justify-center">Cancel</button>
              <button disabled={updateReviewMut.isPending} onClick={()=>{
                updateReviewMut.mutate({
                  id: editReview._id,
                  tasksCompleted: Number(document.getElementById('edit-review-tasksCompleted')?.value||0),
                  commits: Number(document.getElementById('edit-review-commits')?.value||0),
                  codeQuality: Number(document.getElementById('edit-review-codeQuality')?.value||0),
                  collaboration: Number(document.getElementById('edit-review-collaboration')?.value||0),
                  notes: document.getElementById('edit-review-notes')?.value||'',
                })
              }} className="btn-primary flex-1 justify-center">
                {updateReviewMut.isPending?<span className="spinner"/>:'Save Changes'}
              </button>
            </div>
          </motion.div>
        </div>, document.body
      )}

      {reviewDeleteModal}
      {targetDeleteModal}
    </div>
  )
}
