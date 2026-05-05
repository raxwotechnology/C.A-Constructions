import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiMail, FiPhone, FiLinkedin, FiCalendar, FiStar, FiDownload } from 'react-icons/fi'

const STATUS_PIPELINE = ['new','reviewing','shortlisted','interview','offered','hired','rejected']

export default function CandidateProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => api.get(`/recruitment/applications/${id}`).then(r => r.data),
  })
  const app = data?.application

  const updateMut = useMutation({
    mutationFn: ({ status, interviewDate, notes }) => api.put(`/recruitment/applications/${id}/status`, { status, interviewDate, notes }),
    onSuccess: () => { qc.invalidateQueries(['application', id]); toast.success('Updated') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"/></div>
  if (!app) return <div className="text-center py-20 text-gray-400">Application not found</div>

  const scoreColor = app.matchScore >= 70 ? 'text-green-600' : app.matchScore >= 40 ? 'text-yellow-600' : 'text-red-600'
  const scoreBg = app.matchScore >= 70 ? 'bg-green-50' : app.matchScore >= 40 ? 'bg-yellow-50' : 'bg-red-50'

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-ghost btn-sm"><FiArrowLeft size={15}/> Back</button>
        <div>
          <h1 className="page-title">{app.name}</h1>
          <p className="page-subtitle">Applied for: <span className="font-medium text-secondary">{app.job?.title}</span></p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left panel */}
        <div className="space-y-4">
          {/* ATS Score */}
          <div className={`card card-body text-center ${scoreBg} border-0`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">ATS Match Score</p>
            <p className={`text-6xl font-bold font-heading ${scoreColor}`}>{app.matchScore}%</p>
            <div className="mt-3 progress-bar mx-auto" style={{maxWidth:160}}>
              <div className="progress-fill" style={{width:`${app.matchScore}%`, backgroundColor: app.matchScore>=70?'#22C55E':app.matchScore>=40?'#F59E0B':'#EF4444'}}/>
            </div>
            <p className="text-xs text-gray-500 mt-2">{app.matchScore>=70?'Strong Match':app.matchScore>=40?'Moderate Match':'Low Match'}</p>
          </div>

          {/* Contact info */}
          <div className="card card-body space-y-3">
            <h3 className="font-bold text-primary font-heading">Contact Info</h3>
            {[
              {icon:FiMail, val:app.email, label:'Email'},
              {icon:FiPhone, val:app.phone||'—', label:'Phone'},
              {icon:FiLinkedin, val:app.linkedin||'—', label:'LinkedIn'},
            ].map(c=>(
              <div key={c.label} className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <c.icon size={14} className="text-gray-500"/>
                </div>
                <div>
                  <p className="text-xs text-gray-400">{c.label}</p>
                  <p className="text-gray-700 break-all">{c.val}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                <FiStar size={14} className="text-gray-500"/>
              </div>
              <div>
                <p className="text-xs text-gray-400">Experience</p>
                <p className="text-gray-700">{app.experienceYears} years</p>
              </div>
            </div>
          </div>

          {/* Skills */}
          {app.skills?.length > 0 && (
            <div className="card card-body">
              <h3 className="font-bold text-primary font-heading mb-3">Extracted Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {app.skills.map(s => (
                  <span key={s} className={`badge ${app.job?.skills?.includes(s) ? 'badge-green' : 'badge-gray'} capitalize`}>{s}</span>
                ))}
              </div>
              {app.job?.skills?.length > 0 && <p className="text-xs text-gray-400 mt-2">Green = matches job requirements</p>}
            </div>
          )}

          {/* CV download */}
          {app.cvUrl && (
            <a href={app.cvUrl} target="_blank" rel="noreferrer" className="btn-outline w-full justify-center">
              <FiDownload size={15}/> Download CV
            </a>
          )}
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Pipeline */}
          <div className="card card-body">
            <h3 className="font-bold text-primary font-heading mb-4">Application Pipeline</h3>
            <div className="flex flex-wrap gap-2">
              {STATUS_PIPELINE.map(s => (
                <button key={s} onClick={() => updateMut.mutate({ status: s })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border
                    ${app.status === s ? 'bg-secondary text-white border-secondary' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-secondary hover:text-secondary'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Interview scheduling */}
          <div className="card card-body">
            <h3 className="font-bold text-primary font-heading mb-4">Interview Scheduling</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Interview Date & Time</label>
                <input type="datetime-local" defaultValue={app.interviewDate ? new Date(app.interviewDate).toISOString().slice(0,16) : ''}
                  onChange={e => updateMut.mutate({ status: app.status, interviewDate: e.target.value })}
                  className="form-input"/>
              </div>
              <div>
                <label className="form-label">Notes</label>
                <input defaultValue={app.notes||''}
                  onBlur={e => updateMut.mutate({ status: app.status, notes: e.target.value })}
                  placeholder="Internal notes..." className="form-input"/>
              </div>
            </div>
          </div>

          {/* Cover letter */}
          {app.coverLetter && (
            <div className="card card-body">
              <h3 className="font-bold text-primary font-heading mb-3">Cover Letter</h3>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{app.coverLetter}</p>
            </div>
          )}

          {/* Extracted summary */}
          {app.extractedData?.summary && (
            <div className="card card-body">
              <h3 className="font-bold text-primary font-heading mb-3">CV Summary (Auto-extracted)</h3>
              <p className="text-gray-600 text-sm leading-relaxed line-clamp-6">{app.extractedData.summary}</p>
            </div>
          )}

          {/* Applied date */}
          <div className="card card-body">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FiCalendar size={14}/>
              Applied on {new Date(app.createdAt).toLocaleDateString('en-LK', { day:'numeric', month:'long', year:'numeric' })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
