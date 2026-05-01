import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salaryAPI, employeeAPI } from '../../api';
import { Modal, ConfirmModal, StatusBadge, TableSkeleton, EmptyState, StatCard } from '../../components/ui';
import { DollarSign, Plus, CheckCircle, Clock, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function SalaryPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('payroll');
  const [processModal, setProcessModal] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [processForm, setProcessForm] = useState({ employeeId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() });

  const { data: employeesData } = useQuery({ queryKey: ['employees-all'], queryFn: () => employeeAPI.getAll({ limit: 100 }).then(r => r.data), enabled: isAdmin });
  const { data: payrollData, isLoading } = useQuery({ queryKey: ['payroll'], queryFn: () => salaryAPI.getPayroll().then(r => r.data) });
  const { data: overtimeData } = useQuery({ queryKey: ['overtime'], queryFn: () => salaryAPI.getOvertime().then(r => r.data) });

  const employees = employeesData?.data || [];
  const payroll = payrollData?.data || [];
  const overtime = overtimeData?.data || [];

  const processMutation = useMutation({
    mutationFn: salaryAPI.processPayroll,
    onSuccess: () => { qc.invalidateQueries(['payroll']); toast.success('Payroll processed!'); setProcessModal(false); }
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id, method }) => salaryAPI.markPaid(id, { paymentMethod: method }),
    onSuccess: () => { qc.invalidateQueries(['payroll']); toast.success('Marked as paid!'); setPayModal(null); }
  });

  const approveOvertimeMutation = useMutation({
    mutationFn: ({ id, status }) => salaryAPI.approveOvertime(id, { status }),
    onSuccess: () => { qc.invalidateQueries(['overtime']); toast.success('Overtime updated'); }
  });

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const totalPaid = payroll.filter(p => p.status === 'paid').reduce((s, p) => s + p.netSalary, 0);
  const totalPending = payroll.filter(p => p.status !== 'paid').reduce((s, p) => s + p.netSalary, 0);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div><h1 className="page-title">Salary & Payroll</h1><p className="page-subtitle">Manage employee salaries and payments</p></div>
        {isAdmin && (
          <button onClick={() => setProcessModal(true)} className="btn-primary"><Plus size={15} /> Process Payroll</button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={DollarSign} label="Total Paid" value={`₨${totalPaid.toLocaleString()}`} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard icon={Clock} label="Pending Payments" value={`₨${totalPending.toLocaleString()}`} iconBg="bg-amber-50" iconColor="text-amber-600" />
        <StatCard icon={CreditCard} label="Total Records" value={payroll.length} iconBg="bg-navy/10" iconColor="text-navy" />
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {['payroll', 'overtime'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === t ? 'bg-white text-navy shadow-sm' : 'text-gray-600'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'payroll' && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Payroll Records</h3></div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Employee</th><th>Period</th><th>Basic</th><th>Allowances</th><th>Deductions</th><th>Net Salary</th><th>Status</th>{isAdmin && <th>Actions</th>}</tr></thead>
              {isLoading ? <TableSkeleton rows={6} cols={isAdmin ? 8 : 7} /> : (
                <tbody>
                  {payroll.length === 0 ? (
                    <tr><td colSpan={isAdmin ? 8 : 7}><EmptyState icon={DollarSign} title="No payroll records" description="Process payroll to see records here." /></td></tr>
                  ) : payroll.map(p => (
                    <tr key={p._id}>
                      <td>
                        <p className="font-medium text-sm">{p.employee?.fullName}</p>
                        <p className="text-xs text-gray-400">{p.employee?.employeeId}</p>
                      </td>
                      <td className="text-sm">{months[p.month - 1]} {p.year}</td>
                      <td className="text-sm">₨{Number(p.basicSalary).toLocaleString()}</td>
                      <td className="text-sm text-green-600">+₨{Number(p.allowances).toLocaleString()}</td>
                      <td className="text-sm text-red-500">-₨{Number(p.deductions).toLocaleString()}</td>
                      <td className="text-sm font-bold text-navy">₨{Number(p.netSalary).toLocaleString()}</td>
                      <td><StatusBadge status={p.status} /></td>
                      {isAdmin && (
                        <td>
                          {p.status !== 'paid' && (
                            <button onClick={() => setPayModal(p)} className="btn-primary btn-sm text-xs">Mark Paid</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </div>
      )}

      {activeTab === 'overtime' && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Overtime Records</h3></div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Employee</th><th>Date</th><th>Hours</th><th>Rate</th><th>Amount</th><th>Reason</th><th>Status</th>{isAdmin && <th>Actions</th>}</tr></thead>
              <tbody>
                {overtime.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 8 : 7}><EmptyState icon={Clock} title="No overtime records" description="Overtime records will appear here." /></td></tr>
                ) : overtime.map(o => (
                  <tr key={o._id}>
                    <td>
                      <p className="font-medium text-sm">{o.employee?.fullName}</p>
                      <p className="text-xs text-gray-400">{o.employee?.employeeId}</p>
                    </td>
                    <td className="text-sm">{o.date ? new Date(o.date).toLocaleDateString() : '—'}</td>
                    <td className="text-sm font-semibold">{o.hours}h</td>
                    <td className="text-sm">₨{Number(o.hourlyRate).toLocaleString()}/h</td>
                    <td className="text-sm font-bold text-navy">₨{Number(o.totalAmount).toLocaleString()}</td>
                    <td className="text-sm text-gray-600 max-w-[150px] truncate">{o.reason || '—'}</td>
                    <td><StatusBadge status={o.status} /></td>
                    {isAdmin && o.status === 'pending' && (
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => approveOvertimeMutation.mutate({ id: o._id, status: 'approved' })} className="btn-primary btn-sm text-xs">Approve</button>
                          <button onClick={() => approveOvertimeMutation.mutate({ id: o._id, status: 'rejected' })} className="btn-danger btn-sm text-xs">Reject</button>
                        </div>
                      </td>
                    )}
                    {isAdmin && o.status !== 'pending' && <td />}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Process payroll modal */}
      <Modal open={processModal} onClose={() => setProcessModal(false)} title="Process Payroll">
        <form onSubmit={(e) => { e.preventDefault(); processMutation.mutate(processForm); }} className="space-y-4">
          <div className="form-group">
            <label className="form-label">Employee *</label>
            <select value={processForm.employeeId} onChange={(e) => setProcessForm(p => ({ ...p, employeeId: e.target.value }))} className="form-select" required>
              <option value="">Select employee...</option>
              {employees.map(e => <option key={e._id} value={e._id}>{e.fullName} — {e.employeeId}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Month</label>
              <select value={processForm.month} onChange={(e) => setProcessForm(p => ({ ...p, month: parseInt(e.target.value) }))} className="form-select">
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <input type="number" value={processForm.year} onChange={(e) => setProcessForm(p => ({ ...p, year: parseInt(e.target.value) }))} className="form-input" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setProcessModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={processMutation.isPending} className="btn-primary">{processMutation.isPending ? 'Processing...' : 'Process Payroll'}</button>
          </div>
        </form>
      </Modal>

      {/* Mark paid modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Mark as Paid">
        {payModal && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium">{payModal.employee?.fullName}</p>
              <p className="text-lg font-bold text-navy mt-1">Net: ₨{Number(payModal.netSalary).toLocaleString()}</p>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select id="payMethod" className="form-select">
                <option value="bank">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setPayModal(null)} className="btn-ghost">Cancel</button>
              <button onClick={() => markPaidMutation.mutate({ id: payModal._id, method: document.getElementById('payMethod').value })} disabled={markPaidMutation.isPending} className="btn-primary">
                {markPaidMutation.isPending ? 'Processing...' : 'Mark as Paid'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
