import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentAPI, customerAPI } from '../../api';
import { Modal, ConfirmModal, StatusBadge, SearchInput, Pagination, TableSkeleton, EmptyState, StatCard } from '../../components/ui';
import { Plus, Edit2, Calendar, CheckCircle, Clock, XCircle, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

function AppointmentForm({ services, onSubmit, loading }) {
  const [form, setForm] = useState({ customer: '', service: '', appointmentDate: '', appointmentTime: '', notes: '' });
  const h = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="form-group"><label className="form-label">Customer ID</label><input name="customer" value={form.customer} onChange={h} className="form-input" placeholder="Customer MongoDB ID" required /></div>
      <div className="form-group"><label className="form-label">Service *</label>
        <select name="service" value={form.service} onChange={h} className="form-select" required>
          <option value="">Select service...</option>
          {services?.map(s => <option key={s._id} value={s._id}>{s.name} — ₨{s.price}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group"><label className="form-label">Date *</label><input name="appointmentDate" type="date" value={form.appointmentDate} onChange={h} className="form-input" required /></div>
        <div className="form-group"><label className="form-label">Time *</label><input name="appointmentTime" type="time" value={form.appointmentTime} onChange={h} className="form-input" required /></div>
      </div>
      <div className="form-group"><label className="form-label">Notes</label><textarea name="notes" value={form.notes} onChange={h} className="form-textarea" rows={2} /></div>
      <div className="flex justify-end"><button type="submit" disabled={loading} className="btn-primary">{loading ? 'Booking...' : 'Book Appointment'}</button></div>
    </form>
  );
}

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: statsData } = useQuery({ queryKey: ['appointment-stats'], queryFn: () => appointmentAPI.getStats().then(r => r.data.data) });
  const { data: servicesData } = useQuery({ queryKey: ['services'], queryFn: () => appointmentAPI.getServices().then(r => r.data.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['appointments', statusFilter, page],
    queryFn: () => appointmentAPI.getAll({ status: statusFilter, page, limit: 15 }).then(r => r.data),
    keepPreviousData: true,
  });

  const appointments = data?.data || [];
  const pagination = data?.pagination || {};

  const createMutation = useMutation({ mutationFn: appointmentAPI.create, onSuccess: () => { qc.invalidateQueries(['appointments']); toast.success('Appointment booked!'); setModalOpen(false); } });
  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => appointmentAPI.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries(['appointments']); qc.invalidateQueries(['appointment-stats']); toast.success('Status updated'); }
  });

  const statCards = [
    { icon: Calendar, label: 'Today', value: statsData?.today || 0, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
    { icon: Clock, label: 'Pending', value: statsData?.byStatus?.find(s => s._id === 'pending')?.count || 0, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
    { icon: CheckCircle, label: 'Completed', value: statsData?.byStatus?.find(s => s._id === 'completed')?.count || 0, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
    { icon: XCircle, label: 'Cancelled', value: statsData?.byStatus?.find(s => s._id === 'cancelled')?.count || 0, iconBg: 'bg-red-50', iconColor: 'text-red-600' },
  ];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div><h1 className="page-title">Appointments</h1><p className="page-subtitle">Manage customer bookings</p></div>
        <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus size={15} /> New Appointment</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statCards.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="card">
        <div className="card-header flex-wrap gap-3">
          <div className="flex gap-2">
            {['', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${statusFilter === s ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Customer</th><th>Service</th><th>Date & Time</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
            {isLoading ? <TableSkeleton rows={8} cols={6} /> : (
              <tbody>
                {appointments.length === 0 ? (
                  <tr><td colSpan={6}><EmptyState icon={Calendar} title="No appointments" description="No appointments match your filter." /></td></tr>
                ) : appointments.map(a => (
                  <tr key={a._id}>
                    <td>
                      <p className="font-medium text-sm">{a.customer?.fullName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{a.customer?.phone}</p>
                    </td>
                    <td className="text-sm">{a.service?.name || '—'}</td>
                    <td>
                      <p className="text-sm font-medium">{a.appointmentDate ? format(new Date(a.appointmentDate), 'dd MMM yyyy') : '—'}</p>
                      <p className="text-xs text-gray-500">{a.appointmentTime}</p>
                    </td>
                    <td>
                      <p className="text-sm font-semibold text-navy">₨{Number(a.finalAmount || 0).toLocaleString()}</p>
                      {a.discountApplied > 0 && <p className="text-xs text-green-600">-₨{Number(a.discountApplied).toLocaleString()} disc.</p>}
                    </td>
                    <td><StatusBadge status={a.status} /></td>
                    <td>
                      <select value={a.status} onChange={(e) => updateMutation.mutate({ id: a._id, status: e.target.value })}
                        className="form-select text-xs w-28 h-7">
                        {['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        <Pagination page={page} pages={pagination.pages || 1} onPageChange={setPage} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Book New Appointment">
        <AppointmentForm services={servicesData} loading={createMutation.isPending} onSubmit={createMutation.mutate} />
      </Modal>
    </div>
  );
}
