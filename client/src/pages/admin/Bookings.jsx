import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import SectionHeader from '../../components/ui/SectionHeader'

export default function AdminBookings() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => api.get('/bookings').then((r) => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/bookings/${id}`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bookings'] }),
  })

  const bookings = data?.bookings || []
  const pending = bookings.filter((b) => b.status === 'pending').length
  const confirmed = bookings.filter((b) => b.status === 'confirmed').length
  const inProgress = bookings.filter((b) => b.status === 'in_progress').length

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader title="Booking Management" subtitle="Approve and convert client booking requests into active projects." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kpi-card kpi-blue"><p className="text-xs text-slate-500 uppercase">Pending</p><p className="text-2xl font-bold text-primary">{pending}</p></div>
        <div className="kpi-card kpi-green"><p className="text-xs text-slate-500 uppercase">Confirmed</p><p className="text-2xl font-bold text-primary">{confirmed}</p></div>
        <div className="kpi-card kpi-purple"><p className="text-xs text-slate-500 uppercase">In Progress</p><p className="text-2xl font-bold text-primary">{inProgress}</p></div>
      </div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Client</th><th>Service</th><th>Budget</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {bookings.map((item) => (
              <tr key={item._id}>
                <td>{item.client?.name}</td>
                <td>{item.service}</td>
                <td>LKR {(item.budget || item.amount || 0).toLocaleString()}</td>
                <td><span className="badge badge-blue capitalize">{item.status}</span></td>
                <td className="space-x-2">
                  {item.status === 'pending' ? (
                    <>
                      <button className="btn-outline btn-sm" onClick={() => updateMutation.mutate({ id: item._id, payload: { status: 'confirmed' } })}>Confirm</button>
                      <button className="btn-ghost btn-sm text-red-600" onClick={() => updateMutation.mutate({ id: item._id, payload: { status: 'cancelled' } })}>Reject</button>
                    </>
                  ) : null}
                  {item.status === 'confirmed' ? (
                    <button className="btn-ghost btn-sm" onClick={() => updateMutation.mutate({ id: item._id, payload: { status: 'in_progress' } })}>In Progress</button>
                  ) : null}
                </td>
              </tr>
            ))}
            {bookings.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-slate-400">No bookings found</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
