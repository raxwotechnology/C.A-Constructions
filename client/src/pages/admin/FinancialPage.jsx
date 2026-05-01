import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialAPI } from '../../api';
import { Modal, ConfirmModal, TableSkeleton, EmptyState, StatCard } from '../../components/ui';
import { TrendingUp, TrendingDown, DollarSign, Plus, Trash2, Edit2, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

function RevenueForm({ onSubmit, loading, defaultValues }) {
  const [form, setForm] = useState(defaultValues || { title: '', amount: '', category: 'service', date: format(new Date(), 'yyyy-MM-dd'), description: '', client: '', paymentMethod: 'bank' });
  const h = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2"><label className="form-label">Title *</label><input name="title" value={form.title} onChange={h} className="form-input" required /></div>
        <div className="form-group"><label className="form-label">Amount (₨) *</label><input name="amount" type="number" value={form.amount} onChange={h} className="form-input" required /></div>
        <div className="form-group"><label className="form-label">Date *</label><input name="date" type="date" value={form.date} onChange={h} className="form-input" required /></div>
        <div className="form-group"><label className="form-label">Category</label><select name="category" value={form.category} onChange={h} className="form-select"><option value="service">Service</option><option value="product">Product</option><option value="consultation">Consultation</option><option value="subscription">Subscription</option><option value="other">Other</option></select></div>
        <div className="form-group"><label className="form-label">Payment Method</label><select name="paymentMethod" value={form.paymentMethod} onChange={h} className="form-select"><option value="bank">Bank</option><option value="cash">Cash</option><option value="online">Online</option><option value="cheque">Cheque</option></select></div>
        <div className="form-group"><label className="form-label">Client</label><input name="client" value={form.client} onChange={h} className="form-input" /></div>
        <div className="form-group col-span-2"><label className="form-label">Description</label><textarea name="description" value={form.description} onChange={h} className="form-textarea" rows={2} /></div>
      </div>
      <div className="flex justify-end"><button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button></div>
    </form>
  );
}

function ExpenseForm({ onSubmit, loading, defaultValues }) {
  const [form, setForm] = useState(defaultValues || { title: '', amount: '', category: 'other', date: format(new Date(), 'yyyy-MM-dd'), description: '', vendor: '' });
  const h = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2"><label className="form-label">Title *</label><input name="title" value={form.title} onChange={h} className="form-input" required /></div>
        <div className="form-group"><label className="form-label">Amount (₨) *</label><input name="amount" type="number" value={form.amount} onChange={h} className="form-input" required /></div>
        <div className="form-group"><label className="form-label">Date *</label><input name="date" type="date" value={form.date} onChange={h} className="form-input" required /></div>
        <div className="form-group"><label className="form-label">Category</label><select name="category" value={form.category} onChange={h} className="form-select"><option value="salary">Salary</option><option value="rent">Rent</option><option value="utilities">Utilities</option><option value="equipment">Equipment</option><option value="marketing">Marketing</option><option value="travel">Travel</option><option value="software">Software</option><option value="other">Other</option></select></div>
        <div className="form-group"><label className="form-label">Vendor</label><input name="vendor" value={form.vendor} onChange={h} className="form-input" /></div>
        <div className="form-group col-span-2"><label className="form-label">Description</label><textarea name="description" value={form.description} onChange={h} className="form-textarea" rows={2} /></div>
      </div>
      <div className="flex justify-end"><button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button></div>
    </form>
  );
}

export default function FinancialPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [revModal, setRevModal] = useState(false);
  const [expModal, setExpModal] = useState(false);
  const [editRev, setEditRev] = useState(null);
  const [editExp, setEditExp] = useState(null);
  const [deleteRev, setDeleteRev] = useState(null);
  const [deleteExp, setDeleteExp] = useState(null);
  const [year] = useState(new Date().getFullYear());

  const { data: summary } = useQuery({ queryKey: ['financial-summary', year], queryFn: () => financialAPI.getSummary({ year }).then(r => r.data.data) });
  const { data: revData, isLoading: revLoading } = useQuery({ queryKey: ['revenue'], queryFn: () => financialAPI.getRevenue().then(r => r.data) });
  const { data: expData, isLoading: expLoading } = useQuery({ queryKey: ['expenses'], queryFn: () => financialAPI.getExpenses().then(r => r.data) });

  const revenue = revData?.data || [];
  const expenses = expData?.data || [];

  const addRevMutation = useMutation({ mutationFn: financialAPI.addRevenue, onSuccess: () => { qc.invalidateQueries(['revenue']); qc.invalidateQueries(['financial-summary']); toast.success('Revenue added'); setRevModal(false); } });
  const addExpMutation = useMutation({ mutationFn: financialAPI.addExpense, onSuccess: () => { qc.invalidateQueries(['expenses']); qc.invalidateQueries(['financial-summary']); toast.success('Expense added'); setExpModal(false); } });
  const delRevMutation = useMutation({ mutationFn: financialAPI.deleteRevenue, onSuccess: () => { qc.invalidateQueries(['revenue']); toast.success('Deleted'); setDeleteRev(null); } });
  const delExpMutation = useMutation({ mutationFn: financialAPI.deleteExpense, onSuccess: () => { qc.invalidateQueries(['expenses']); toast.success('Deleted'); setDeleteExp(null); } });

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const rev = summary?.revenueByMonth?.find(r => r._id?.month === month)?.total || 0;
    const exp = summary?.expenseByMonth?.find(e => e._id?.month === month)?.total || 0;
    return { month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i], revenue: rev, expenses: exp, profit: rev - exp };
  });

  const tabs = ['overview', 'revenue', 'expenses'];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div><h1 className="page-title">Financial Reports</h1><p className="page-subtitle">Revenue, expenses, and profit analytics</p></div>
        <div className="flex gap-2">
          <button onClick={() => setRevModal(true)} className="btn-outline btn-sm"><Plus size={13} /> Revenue</button>
          <button onClick={() => setExpModal(true)} className="btn-danger btn-sm"><Plus size={13} /> Expense</button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={TrendingUp} label="Total Revenue" value={`₨${(summary?.totalRevenue || 0).toLocaleString()}`} iconBg="bg-green-50" iconColor="text-green-600" />
        <StatCard icon={TrendingDown} label="Total Expenses" value={`₨${(summary?.totalExpense || 0).toLocaleString()}`} iconBg="bg-red-50" iconColor="text-red-600" />
        <StatCard icon={DollarSign} label="Net Profit" value={`₨${(summary?.profit || 0).toLocaleString()}`} iconBg="bg-navy/10" iconColor="text-navy" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === t ? 'bg-white text-navy shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Revenue vs Expenses ({year})</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₨${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v, n) => [`₨${v.toLocaleString()}`, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" fill="#080344" name="Revenue" radius={[3,3,0,0]} />
                <Bar dataKey="expenses" fill="#534AB7" name="Expenses" radius={[3,3,0,0]} />
                <Bar dataKey="profit" fill="#22c55e" name="Profit" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Revenue Records</h3><span className="text-sm text-gray-500">Total: ₨{(revData?.totalAmount || 0).toLocaleString()}</span></div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Title</th><th>Category</th><th>Client</th><th>Date</th><th>Payment</th><th>Amount</th><th></th></tr></thead>
              {revLoading ? <TableSkeleton rows={5} cols={7} /> : (
                <tbody>
                  {revenue.length === 0 ? <tr><td colSpan={7}><EmptyState icon={TrendingUp} title="No revenue records" description="Add revenue entries to track income." /></td></tr> :
                    revenue.map(r => (
                      <tr key={r._id}>
                        <td className="font-medium text-sm">{r.title}</td>
                        <td className="text-sm text-gray-600">{r.category}</td>
                        <td className="text-sm">{r.client || '—'}</td>
                        <td className="text-sm">{format(new Date(r.date), 'dd MMM yyyy')}</td>
                        <td><span className="badge-blue">{r.paymentMethod}</span></td>
                        <td className="text-sm font-bold text-green-600">₨{Number(r.amount).toLocaleString()}</td>
                        <td><button onClick={() => setDeleteRev(r._id)} className="btn-ghost btn-icon text-red-400"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                </tbody>
              )}
            </table>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="card">
          <div className="card-header"><h3 className="card-title">Expense Records</h3><span className="text-sm text-gray-500">Total: ₨{(expData?.totalAmount || 0).toLocaleString()}</span></div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Title</th><th>Category</th><th>Vendor</th><th>Date</th><th>Amount</th><th></th></tr></thead>
              {expLoading ? <TableSkeleton rows={5} cols={6} /> : (
                <tbody>
                  {expenses.length === 0 ? <tr><td colSpan={6}><EmptyState icon={TrendingDown} title="No expense records" description="Add expenses to track spending." /></td></tr> :
                    expenses.map(e => (
                      <tr key={e._id}>
                        <td className="font-medium text-sm">{e.title}</td>
                        <td className="text-sm text-gray-600">{e.category}</td>
                        <td className="text-sm">{e.vendor || '—'}</td>
                        <td className="text-sm">{format(new Date(e.date), 'dd MMM yyyy')}</td>
                        <td className="text-sm font-bold text-red-500">₨{Number(e.amount).toLocaleString()}</td>
                        <td><button onClick={() => setDeleteExp(e._id)} className="btn-ghost btn-icon text-red-400"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                </tbody>
              )}
            </table>
          </div>
        </div>
      )}

      <Modal open={revModal} onClose={() => setRevModal(false)} title="Add Revenue"><RevenueForm loading={addRevMutation.isPending} onSubmit={addRevMutation.mutate} /></Modal>
      <Modal open={expModal} onClose={() => setExpModal(false)} title="Add Expense"><ExpenseForm loading={addExpMutation.isPending} onSubmit={addExpMutation.mutate} /></Modal>
      <ConfirmModal open={!!deleteRev} onClose={() => setDeleteRev(null)} onConfirm={() => delRevMutation.mutate(deleteRev)} loading={delRevMutation.isPending} title="Delete Revenue" message="Delete this revenue record?" />
      <ConfirmModal open={!!deleteExp} onClose={() => setDeleteExp(null)} onConfirm={() => delExpMutation.mutate(deleteExp)} loading={delExpMutation.isPending} title="Delete Expense" message="Delete this expense record?" />
    </div>
  );
}
