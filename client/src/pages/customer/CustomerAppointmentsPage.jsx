import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentAPI } from '../../api';
import { StatusBadge, EmptyState, TableSkeleton } from '../../components/ui';
import { Calendar, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function CustomerAppointmentsPage() {
  const qc = useQueryClient();

  const { data: apptData, isLoading } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: () => appointmentAPI.getAll().then(r => r.data.data),
  });

  const appointments = apptData || [];

  const cancelMutation = useMutation({
    mutationFn: (id) => appointmentAPI.cancel(id, { reason: 'Customer cancelled' }),
    onSuccess: () => { qc.invalidateQueries(['my-appointments']); toast.success('Appointment cancelled'); }
  });

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Appointments</h1>
          <p className="page-subtitle">View and manage your service bookings</p>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Date</th>
                <th>Time</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            {isLoading ? <TableSkeleton rows={5} cols={6} /> : (
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState icon={Calendar} title="No appointments found" description="You haven't booked any services yet." />
                    </td>
                  </tr>
                ) : appointments.map((a) => (
                  <tr key={a._id}>
                    <td>
                      <p className="font-medium text-sm text-gray-900">{a.service?.name || 'Service'}</p>
                      <p className="text-xs text-gray-500">{a.service?.category || 'Category'}</p>
                    </td>
                    <td className="text-sm font-medium">
                      {a.appointmentDate ? format(new Date(a.appointmentDate), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="text-sm text-gray-600">{a.appointmentTime}</td>
                    <td>
                      <p className="text-sm font-bold text-navy">₨{Number(a.finalAmount || 0).toLocaleString()}</p>
                      {a.discountApplied > 0 && <p className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded w-fit mt-0.5">-₨{Number(a.discountApplied).toLocaleString()} disc.</p>}
                    </td>
                    <td><StatusBadge status={a.status} /></td>
                    <td>
                      {a.status === 'pending' && (
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to cancel this appointment?')) {
                              cancelMutation.mutate(a._id);
                            }
                          }}
                          className="btn-ghost text-red-500 hover:bg-red-50 text-xs px-2 py-1"
                        >
                          <XCircle size={14} className="mr-1" /> Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
