import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import SectionHeader from '../../components/ui/SectionHeader'

export default function AdminFeedbacks() {
  const qc = useQueryClient()
  const [responses, setResponses] = useState({})
  const { data } = useQuery({
    queryKey: ['admin-feedbacks'],
    queryFn: () => api.get('/feedback').then((r) => r.data),
  })

  const respondMutation = useMutation({
    mutationFn: ({ id, response }) => api.put(`/feedback/${id}/respond`, { response, status: 'reviewed' }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-feedbacks'] }),
  })

  const feedbacks = data?.feedbacks || []
  const avg = feedbacks.length ? (feedbacks.reduce((sum, item) => sum + Number(item.rating || 0), 0) / feedbacks.length).toFixed(1) : '0.0'
  const unresolved = feedbacks.filter((item) => item.status !== 'resolved').length

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Client Feedback" subtitle="Review and respond to client experience feedback." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kpi-card kpi-blue"><p className="text-xs text-slate-500 uppercase">Total Feedback</p><p className="text-2xl font-bold text-primary">{feedbacks.length}</p></div>
        <div className="kpi-card kpi-green"><p className="text-xs text-slate-500 uppercase">Average Rating</p><p className="text-2xl font-bold text-primary">{avg}</p></div>
        <div className="kpi-card kpi-orange"><p className="text-xs text-slate-500 uppercase">Pending Responses</p><p className="text-2xl font-bold text-primary">{unresolved}</p></div>
      </div>
      <div className="space-y-4">
        {feedbacks.map((item) => (
          <div key={item._id} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-primary">{item.client?.name}</p>
              <span className="badge badge-blue">{item.rating}/5</span>
            </div>
            <p className="text-sm text-slate-600 mt-2">{item.message}</p>
            <textarea
              className="form-input mt-3 min-h-20"
              value={responses[item._id] ?? item.response ?? ''}
              onChange={(e) => setResponses((s) => ({ ...s, [item._id]: e.target.value }))}
              placeholder="Write response"
            />
            <button className="btn-primary btn-sm mt-3" onClick={() => respondMutation.mutate({ id: item._id, response: responses[item._id] || '' })}>
              Save Response
            </button>
          </div>
        ))}
        {feedbacks.length === 0 ? <div className="card p-8 text-center text-slate-400">No feedback submitted yet.</div> : null}
      </div>
    </div>
  )
}
