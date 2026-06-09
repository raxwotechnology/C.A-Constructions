import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { FiVideo, FiCopy, FiUsers, FiTrash2, FiPlay, FiX, FiShare2, FiSend, FiLink, FiSearch } from 'react-icons/fi'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import SectionHeader from '../../components/ui/SectionHeader'
import SearchableSelect from '../../components/ui/SearchableSelect'
import { lookupLoaders } from '../../lib/lookupApi'
import PasswordConfirmModal from '../../components/admin/PasswordConfirmModal'

export default function Meetings() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'manager'
  const qc = useQueryClient()
  
  const [showCreate, setShowCreate] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [showAttendees, setShowAttendees] = useState(false)
  const [shareMeeting, setShareMeeting] = useState(null)
  const [selectedUsersToShare, setSelectedUsersToShare] = useState([])
  const [shareMessage, setShareMessage] = useState('')
  const [activeMeetingRoom, setActiveMeetingRoom] = useState(null) // For in-app iframe meeting
  const [deleteMeetingId, setDeleteMeetingId] = useState(null)

  const [activeTab, setActiveTab] = useState('internal') // 'internal' | 'client'

  const { data: contactsData } = useQuery({
    queryKey: ['message-contacts'],
    queryFn: () => api.get('/messages/contacts').then(r => r.data),
    enabled: isAdmin,
  })
  const contacts = contactsData?.users || []

  const { data: clientsData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => api.get('/clients').then(r => r.data),
    enabled: isAdmin,
  })
  const clients = clientsData?.clients || []

  const { data: meetingsData, isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: () => api.get('/meetings').then(r => r.data),
    refetchInterval: 30000,
  })
  const allMeetings = meetingsData?.meetings || []
  
  // Filter meetings by tab
  const meetings = allMeetings.filter(m => (m.meetingType || 'internal') === activeTab)

  const { data: attendeesData, isLoading: isLoadingAttendees } = useQuery({
    queryKey: ['meeting-attendees', selectedMeeting],
    queryFn: () => api.get(`/meetings/${selectedMeeting}/attendees`).then(r => r.data),
    enabled: Boolean(selectedMeeting && showAttendees),
  })
  const attendees = attendeesData?.participants || []

  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: { duration: 60, meetingType: 'internal', client: '' }
  })
  const watchMeetingType = watch('meetingType')

  const createMut = useMutation({
    mutationFn: d => api.post('/meetings/create', d).then(r => r.data),
    onSuccess: () => {
      toast.success('Meeting created successfully!')
      reset()
      setShowCreate(false)
      qc.invalidateQueries({ queryKey: ['meetings'] })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to create meeting')
  })

  const deleteMut = useMutation({
    mutationFn: ({ id, password }) => api.delete(`/meetings/${id}`, { data: { password } }).then(r => r.data),
    onSuccess: () => {
      toast.success('Meeting deleted')
      setDeleteMeetingId(null)
      qc.invalidateQueries({ queryKey: ['meetings'] })
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed to delete'),
  })

  const shareMut = useMutation({
    mutationFn: async () => {
      const promises = selectedUsersToShare.map(userId => 
        api.post('/messages', { recipientId: userId, content: shareMessage })
      )
      if (!shareMeeting.isCustom && shareMeeting._id) {
        promises.push(api.post(`/meetings/${shareMeeting._id}/share`, { userIds: selectedUsersToShare }))
      }
      await Promise.all(promises)
    },
    onSuccess: () => {
      toast.success('Meeting link shared via message successfully!')
      setShareMeeting(null)
      setSelectedUsersToShare([])
      qc.invalidateQueries(['meetings'])
    },
    onError: () => toast.error('Failed to share meeting')
  })

  const shareEmailMut = useMutation({
    mutationFn: async (emails) => {
      await api.post('/meetings/share-email', {
        emails,
        subject: `Meeting Invitation: ${shareMeeting?.topic || 'Raxwo ERP Meeting'}`,
        content: shareMessage
      })
      if (!shareMeeting.isCustom && shareMeeting._id) {
        await api.post(`/meetings/${shareMeeting._id}/share`, { userIds: selectedUsersToShare })
      }
    },
    onSuccess: () => {
      toast.success('Meeting invitations sent via email successfully!')
      setShareMeeting(null)
      setSelectedUsersToShare([])
      qc.invalidateQueries(['meetings'])
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to send emails')
  })

  const copyLink = (link) => {
    navigator.clipboard.writeText(link)
    toast.success('Join link copied!')
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="badge bg-green-100 text-green-700 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>Active</span>
      case 'upcoming':
        return <span className="badge badge-blue">Upcoming</span>
      case 'ended':
      case 'inactive':
        return <span className="badge bg-slate-100 text-slate-500">Ended</span>
      default:
        return null
    }
  }

  /* ── Modal wrapper (Portal) ─────────────────────── */
  const Modal = ({ children, onClose }) => createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4" style={{ zIndex: 99999 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      {children}
    </div>,
    document.body
  )

  return (
    <div className="space-y-6 animate-fade-in w-full overflow-hidden">
      <SectionHeader 
        title="Virtual Meetings" 
        subtitle="Manage internal and client meetings" 
        action={isAdmin && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
            <button 
              onClick={() => {
                setShareMeeting({ isCustom: true, joinUrl: '' });
                setShareMessage('🎥 Join my Meeting!\n\n📌 Topic: \n📅 Date: \n🕐 Time: \n\n🔗 Join Link: ');
                setSelectedUsersToShare([]);
              }} 
              className="px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 border-2 border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-500 hover:text-blue-600 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <FiShare2 size={18} /> Share External Link
            </button>
            <button onClick={() => { reset(); setShowCreate(true); }} className="btn-primary shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200 justify-center">
              <FiVideo size={18} /> Create Meeting
            </button>
          </div>
        )}
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('internal')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'internal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Internal Meetings
        </button>
        <button 
          onClick={() => setActiveTab('client')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'client' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Client Meetings
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-10 text-center"><span className="spinner" /></div>
        ) : meetings.length === 0 ? (
          <div className="col-span-full text-center py-10 bg-white rounded-2xl border border-slate-100">
            <FiVideo size={48} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-700">No {activeTab === 'client' ? 'Client ' : 'Internal '}Meetings</h3>
            <p className="text-slate-500">There are no upcoming or active meetings at the moment.</p>
          </div>
        ) : (
          meetings.map(m => (
            <div key={m._id} className="card p-5 border-slate-100 flex flex-col h-full relative">
              <div className="absolute top-4 right-4">{getStatusBadge(m.status)}</div>
              <h3 className="font-bold text-lg text-primary pr-24">{m.topic}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {new Date(m.startTime).toLocaleString()} • {m.duration} mins
              </p>
              
              {m.meetingType === 'client' && m.client && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-100 w-fit">
                  <FiUsers size={12} /> Client: {m.client.name || 'Unknown'}
                </div>
              )}
              
              {m.agenda && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 line-clamp-2">
                  {m.agenda}
                </div>
              )}

              <div className="mt-auto pt-6 space-y-2">
                {/* Row 1: Start/Join + Copy */}
                <div className="flex items-center gap-2">
                  {m.status !== 'ended' && m.status !== 'inactive' && (
                    <button 
                      onClick={() => setActiveMeetingRoom({ url: isAdmin ? m.startUrl : m.joinUrl, topic: m.topic })}
                      className={`btn-primary flex-1 justify-center ${m.status === 'active' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                    >
                      <FiPlay /> {isAdmin ? 'Start' : 'Join'}
                    </button>
                  )}
                  <button onClick={() => copyLink(m.joinUrl)} className="btn-secondary px-3" title="Copy Join Link">
                    <FiCopy />
                  </button>
                </div>

                {/* Row 2: Share Link (prominent, full width for admin) */}
                {isAdmin && (
                  <button 
                    onClick={() => {
                      setShareMeeting(m)
                      setSelectedUsersToShare(m.sharedWith || [])
                      setShareMessage(`🎥 Join my Meeting!\n\n📌 Topic: ${m.topic}\n📅 Date: ${new Date(m.startTime).toLocaleDateString()}\n🕐 Time: ${new Date(m.startTime).toLocaleTimeString()}\n⏱ Duration: ${m.duration} mins\n\n🔗 Join Link: ${m.joinUrl}`)
                    }} 
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-blue-200 bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 hover:border-blue-300 transition-all"
                  >
                    <FiShare2 size={16} /> Share Meeting Link
                  </button>
                )}

                {/* Row 3: Admin actions */}
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setSelectedMeeting(m._id); setShowAttendees(true); }} className="btn-secondary flex-1 justify-center text-sm py-2">
                      <FiUsers size={14} /> Attendees
                    </button>
                    <button onClick={() => setDeleteMeetingId(m._id)} className="btn-secondary px-3 text-red-500 hover:bg-red-50 hover:border-red-200" title="Delete Meeting">
                      <FiTrash2 />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal — rendered via Portal */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-fade-in shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold font-heading">Schedule Meeting</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-red-500">
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="space-y-4">
              <div>
                <label className="form-label">Meeting Type</label>
                <select {...register('meetingType')} className="form-select">
                  <option value="internal">Internal Meeting</option>
                  <option value="client">Client Meeting</option>
                </select>
              </div>

              {watchMeetingType === 'client' && (
                <div className="animate-fade-in">
                  <label className="form-label">Select Client <span className="text-xs text-slate-400 font-normal">(Optional)</span></label>
                  <SearchableSelect
                    value={watch('client')}
                    onChange={(v) => setValue('client', v)}
                    loadOptions={lookupLoaders.clients()}
                    placeholder="Search for a client..."
                    isClearable={true}
                  />
                </div>
              )}

              <div>
                <label className="form-label">Topic</label>
                <input required {...register('topic')} className="form-input" placeholder="e.g. Monthly Review" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Date & Time</label>
                  <input required type="datetime-local" {...register('startTime')} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Duration</label>
                  <select {...register('duration', { valueAsNumber: true })} className="form-select">
                    <option value={30}>30 mins</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Agenda (Optional)</label>
                <textarea {...register('agenda')} className="form-textarea" rows="3" placeholder="Brief description..." />
              </div>
              
              <button type="submit" className="btn-primary w-full justify-center" disabled={isSubmitting || createMut.isPending}>
                {isSubmitting || createMut.isPending ? <span className="spinner"/> : 'Create Meeting'}
              </button>
            </form>
          </div>
        </Modal>
      )}

      {/* Attendees Modal — via Portal */}
      {showAttendees && (
        <Modal onClose={() => { setShowAttendees(false); setSelectedMeeting(null); }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 animate-fade-in shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold font-heading">Meeting Attendees</h3>
                <p className="text-sm text-slate-500 mt-1">Total count: {attendees?.length || 0}</p>
              </div>
              <button onClick={() => { setShowAttendees(false); setSelectedMeeting(null); }} className="text-gray-400 hover:text-red-500">
                <FiX size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-[300px]">
              {isLoadingAttendees ? (
                <div className="flex justify-center py-10"><span className="spinner"/></div>
              ) : attendees.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <FiUsers size={48} className="mx-auto mb-3 opacity-30" />
                  <p>No attendees recorded yet.</p>
                  <p className="text-xs mt-1">Participants only appear here after they join.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {attendees.map((a, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="font-semibold text-slate-800">{a.name}</p>
                        <p className="text-xs text-slate-500">{a.user_email || 'No email provided'}</p>
                      </div>
                      <div className="text-right mt-2 sm:mt-0">
                        <p className="text-sm text-slate-600">
                          Joined: {new Date(a.join_time).toLocaleTimeString()}
                        </p>
                        <p className="text-xs font-medium text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded-full mt-1">
                          Duration: {Math.round(a.duration / 60)} mins
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Share Modal — via Portal */}
      {shareMeeting && (
        <Modal onClose={() => setShareMeeting(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 animate-fade-in shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FiShare2 className="text-blue-600" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-heading">Share Meeting Link</h3>
                  <p className="text-xs text-slate-500">Send meeting invite to selected users</p>
                </div>
              </div>
              <button onClick={() => setShareMeeting(null)} className="text-gray-400 hover:text-red-500">
                <FiX size={24} />
              </button>
            </div>

            {/* Quick copy link (only for existing meetings) */}
            {!shareMeeting.isCustom && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-slate-50 rounded-xl border border-slate-200">
                <FiLink className="text-slate-400 shrink-0" />
                <span className="text-xs text-slate-600 truncate flex-1 font-mono">{shareMeeting.joinUrl}</span>
                <button onClick={() => copyLink(shareMeeting.joinUrl)} className="text-blue-600 text-xs font-semibold hover:underline shrink-0">Copy</button>
              </div>
            )}
            
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {shareMeeting.isCustom && (
                <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 rounded-2xl shadow-sm space-y-4 mb-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-100 rounded-md text-blue-600"><FiVideo size={14} /></div>
                    <p className="text-sm font-bold text-slate-800">External Meeting Details</p>
                  </div>
                  
                  <div>
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1 block">Topic / Title</label>
                    <input type="text" placeholder="e.g. Weekly Sync" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" onChange={e => {
                      setShareMeeting(prev => ({ ...prev, topic: e.target.value }))
                    }} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1 block">Date</label>
                      <input type="date" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" onChange={e => {
                        setShareMeeting(prev => ({ ...prev, date: e.target.value }))
                      }} />
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1 block">Time</label>
                      <input type="time" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" onChange={e => {
                        setShareMeeting(prev => ({ ...prev, time: e.target.value }))
                      }} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1 block">Meeting Link</label>
                    <input type="url" placeholder="https://meet.google.com/..." className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" onChange={e => {
                      setShareMeeting(prev => ({ ...prev, joinUrl: e.target.value }))
                    }} />
                  </div>

                  <button type="button" className="w-full py-2.5 mt-2 bg-slate-800 text-white font-semibold text-sm rounded-xl hover:bg-slate-700 shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2" onClick={() => {
                    setShareMessage(`🎥 Join my Meeting!\n\n📌 Topic: ${shareMeeting.topic || 'Quick Sync'}\n📅 Date: ${shareMeeting.date || 'TBD'}\n🕐 Time: ${shareMeeting.time || 'TBD'}\n\n🔗 Join Link: ${shareMeeting.joinUrl || 'Link will be provided'}`)
                  }}>
                    <FiShare2 size={14} /> Auto-Generate Message
                  </button>
                </div>
              )}
              <div>
                <label className="form-label">Message Preview</label>
                <textarea 
                  value={shareMessage} 
                  onChange={e => setShareMessage(e.target.value)} 
                  className="form-textarea text-sm h-32" 
                />
              </div>

              <div>
                <label className="form-label flex justify-between items-end mb-2">
                  <span className="flex items-center gap-2">
                    Select {shareMeeting.isCustom ? 'Users/Clients' : (shareMeeting.meetingType === 'client' ? 'Clients' : 'Employees')} to Share With
                  </span>
                  <button 
                    type="button" 
                    className="text-xs text-blue-600 font-semibold"
                    onClick={() => {
                      const list = shareMeeting.isCustom 
                        ? [...contacts, ...clients] 
                        : (shareMeeting.meetingType === 'client' ? clients : contacts)
                      if (selectedUsersToShare.length === list.length) setSelectedUsersToShare([])
                      else setSelectedUsersToShare(list.map(c => c._id))
                    }}
                  >
                    Select All
                  </button>
                </label>
                
                <div className="relative mb-2">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search name or email..." 
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    onChange={(e) => {
                      const search = e.target.value.toLowerCase();
                      const nodes = document.querySelectorAll('.share-user-item');
                      nodes.forEach(node => {
                        const text = node.textContent.toLowerCase();
                        if (text.includes(search)) node.style.display = 'flex';
                        else node.style.display = 'none';
                      });
                    }}
                  />
                </div>

                <div className="border rounded-xl border-slate-200 divide-y divide-slate-100 max-h-60 overflow-y-auto bg-slate-50">
                  {(() => {
                    const list = shareMeeting.isCustom 
                      ? [...contacts, ...clients] 
                      : (shareMeeting.meetingType === 'client' ? clients : contacts)
                    
                    if (list.length === 0) return <div className="p-4 text-center text-slate-500 text-sm">No users found.</div>
                    
                    return list.map(c => (
                      <label key={c._id} className="share-user-item flex items-center gap-3 p-3 hover:bg-white cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          className="rounded text-blue-600 focus:ring-blue-600"
                          checked={selectedUsersToShare.includes(c._id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedUsersToShare(prev => [...prev, c._id])
                            else setSelectedUsersToShare(prev => prev.filter(id => id !== c._id))
                          }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{c.name || c.companyName || c.contactPerson}</p>
                          <p className="text-xs text-slate-500 capitalize">{c.email || c.role}</p>
                        </div>
                      </label>
                    ))
                  })()}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-4 text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="shareMethod" value="message" defaultChecked className="text-blue-600 focus:ring-blue-500" id="shareMethodMessage" />
                  Internal Message
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="shareMethod" value="email" className="text-blue-600 focus:ring-blue-500" id="shareMethodEmail" />
                  Email
                </label>
              </div>
              <button 
                onClick={() => {
                  const method = document.getElementById('shareMethodEmail').checked ? 'email' : 'message';
                  if (method === 'message') {
                    shareMut.mutate();
                  } else {
                    const list = shareMeeting.isCustom 
                      ? [...contacts, ...clients] 
                      : (shareMeeting.meetingType === 'client' ? clients : contacts);
                    
                    const selectedEmails = list.filter(c => selectedUsersToShare.includes(c._id) && c.email).map(c => c.email);
                    if (selectedEmails.length === 0) {
                      toast.error('No valid emails found for selected users');
                      return;
                    }
                    shareEmailMut.mutate(selectedEmails);
                  }
                }} 
                disabled={shareMut.isPending || shareEmailMut?.isPending || selectedUsersToShare.length === 0 || !shareMessage.trim()} 
                className="btn-primary w-full justify-center"
              >
                {shareMut.isPending || shareEmailMut?.isPending ? <span className="spinner"/> : <><FiSend /> Send Invite to {selectedUsersToShare.length} user{selectedUsersToShare.length !== 1 ? 's' : ''}</>}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Embedded Meeting Room iframe */}
      {activeMeetingRoom && createPortal(
        <div className="fixed inset-0 z-[100000] bg-slate-900 flex flex-col">
          <div className="bg-slate-800 text-white p-3 flex items-center justify-between shadow-md z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                <FiVideo size={16} />
              </div>
              <h2 className="font-semibold">{activeMeetingRoom.topic}</h2>
            </div>
            <div className="flex items-center gap-4">
              <a 
                href={activeMeetingRoom.url} 
                target="_blank" 
                rel="noreferrer"
                title="Open in new tab"
                className="text-xs text-blue-400 font-mono hidden sm:block bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-950 hover:text-blue-300 transition-colors"
              >
                {activeMeetingRoom.url}
              </a>
              <button 
                onClick={() => {
                  if (confirm('Are you sure you want to leave the meeting?')) {
                    setActiveMeetingRoom(null);
                  }
                }} 
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
              >
                <FiX size={18} /> Leave Meeting
              </button>
            </div>
          </div>
          <div className="flex-1 w-full bg-black relative">
            {/* Loading state under iframe */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
              <span className="spinner mb-4 scale-150"></span>
              <p>Connecting to secure meeting room...</p>
            </div>
            <iframe 
              src={activeMeetingRoom.url}
              className="absolute inset-0 w-full h-full border-none z-10"
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              title="Meeting Room"
            />
          </div>
        </div>,
        document.body
      )}

      <PasswordConfirmModal
        open={Boolean(deleteMeetingId)}
        onClose={() => setDeleteMeetingId(null)}
        title="Delete meeting?"
        message="This permanently removes the meeting record. Enter your admin password to confirm."
        confirmLabel="Delete meeting"
        isSubmitting={deleteMut.isPending}
        onConfirm={async (password) => {
          if (!deleteMeetingId) return
          await deleteMut.mutateAsync({ id: deleteMeetingId, password })
        }}
      />
    </div>
  )
}
