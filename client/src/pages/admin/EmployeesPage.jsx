import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeAPI } from '../../api';
import { Modal, ConfirmModal, StatusBadge, SearchInput, Pagination, TableSkeleton, EmptyState } from '../../components/ui';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Users, Eye, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const TYPES = { developers: 'developer', managers: 'manager', 'marketing-designers': 'marketing_designer' };
const LABELS = { developer: 'Developer', manager: 'Manager', marketing_designer: 'Marketing Designer' };

function EmployeeForm({ defaultValues, onSubmit, loading, userType }) {
  const [form, setForm] = useState(defaultValues || {
    fullName: '', email: '', phone: '', password: '', department: '', position: '',
    salary: '', skills: '', experience: '', joiningDate: '', dateOfBirth: '', userType
  });
  const [files, setFiles] = useState({ photo: null, cv: null, agreement: null });

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleFile = (e) => setFiles(prev => ({ ...prev, [e.target.name]: e.target.files[0] }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
    Object.entries(files).forEach(([k, v]) => v && fd.append(k, v));
    onSubmit(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2">
          <label className="form-label">Full Name *</label>
          <input name="fullName" value={form.fullName} onChange={handleChange} className="form-input" required placeholder="Full name" />
        </div>
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} className="form-input" required placeholder="email@company.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Phone *</label>
          <input name="phone" value={form.phone} onChange={handleChange} className="form-input" required placeholder="Phone number" />
        </div>
        {!defaultValues && (
          <div className="form-group col-span-2">
            <label className="form-label">Password (default: phone)</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} className="form-input" placeholder="Leave empty to use phone as password" />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Department</label>
          <input name="department" value={form.department} onChange={handleChange} className="form-input" placeholder="e.g. Engineering" />
        </div>
        <div className="form-group">
          <label className="form-label">Position</label>
          <input name="position" value={form.position} onChange={handleChange} className="form-input" placeholder="e.g. Senior Developer" />
        </div>
        <div className="form-group">
          <label className="form-label">Basic Salary (₨)</label>
          <input name="salary" type="number" value={form.salary} onChange={handleChange} className="form-input" placeholder="0" />
        </div>
        <div className="form-group">
          <label className="form-label">Joining Date</label>
          <input name="joiningDate" type="date" value={form.joiningDate} onChange={handleChange} className="form-input" />
        </div>
        <div className="form-group">
          <label className="form-label">Date of Birth</label>
          <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} className="form-input" />
        </div>
        <div className="form-group col-span-2">
          <label className="form-label">Skills (comma separated)</label>
          <input name="skills" value={form.skills} onChange={handleChange} className="form-input" placeholder="React, Node.js, MongoDB" />
        </div>
        <div className="form-group col-span-2">
          <label className="form-label">Experience</label>
          <textarea name="experience" value={form.experience} onChange={handleChange} className="form-textarea" placeholder="Brief experience description" rows={2} />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Documents & Photo</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="form-group">
            <label className="form-label">Profile Photo</label>
            <input name="photo" type="file" accept="image/*" onChange={handleFile} className="form-input text-xs py-1.5" />
          </div>
          <div className="form-group">
            <label className="form-label">CV / Resume</label>
            <input name="cv" type="file" accept=".pdf,.doc,.docx" onChange={handleFile} className="form-input text-xs py-1.5" />
          </div>
          <div className="form-group">
            <label className="form-label">Company Agreement</label>
            <input name="agreement" type="file" accept=".pdf,.doc,.docx" onChange={handleFile} className="form-input text-xs py-1.5" />
          </div>
        </div>
      </div>

      <input type="hidden" name="userType" value={userType} />

      <div className="flex justify-end gap-3 pt-4">
        <button type="submit" disabled={loading} className="btn-primary py-3 px-8 text-base shadow-lg hover:shadow-xl transition-all">
          {loading ? 'Saving...' : (defaultValues ? 'Update Employee' : 'Add Employee')}
        </button>
      </div>
    </form>
  );
}

export default function EmployeesPage({ type = 'developers' }) {
  const { user } = useAuth();
  const userType = TYPES[type] || 'developer';
  const label = LABELS[userType];
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', userType, search, page],
    queryFn: () => employeeAPI.getAll({ type: userType, search, page, limit: 15 }).then(r => r.data),
    keepPreviousData: true,
  });

  const employees = data?.data || [];
  const pagination = data?.pagination || {};

  const createMutation = useMutation({
    mutationFn: (fd) => employeeAPI.create(fd),
    onSuccess: () => { qc.invalidateQueries(['employees']); toast.success(`${label} added!`); setModalOpen(false); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, fd }) => employeeAPI.update(id, fd),
    onSuccess: () => { qc.invalidateQueries(['employees']); toast.success(`${label} updated!`); setEditEmployee(null); }
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => employeeAPI.toggleStatus(id),
    onSuccess: () => { qc.invalidateQueries(['employees']); toast.success('Status updated'); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => employeeAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries(['employees']); toast.success(`${label} deleted`); setDeleteId(null); }
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
          <div>
            <h1 className="page-title">{label}s</h1>
            <p className="page-subtitle">Manage your {label.toLowerCase()} team</p>
          </div>
          {user?.userType === 'admin' && (
            <button onClick={() => setModalOpen(true)} className="btn-primary shadow-md hover:shadow-xl group">
              <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center mr-1">
                <Plus size={16} className="group-hover:scale-110 transition-transform" />
              </div>
              Add {label}
            </button>
          )}
        </div>

      {/* Table card */}

      <div className="card">
        <div className="card-header">
          <span className="text-sm text-gray-500">{pagination.total || 0} total</span>
          <SearchInput value={search} onChange={setSearch} placeholder={`Search ${label.toLowerCase()}s...`} />
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>ID</th>
                <th>Department</th>
                <th>Phone</th>
                <th>Salary</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            {isLoading ? <TableSkeleton rows={8} cols={8} /> : (
              <tbody>
                {employees.length === 0 ? (
                  <tr><td colSpan={8}><EmptyState icon={Users} title={`No ${label}s found`} description={`Add your first ${label.toLowerCase()} to get started.`} /></td></tr>
                ) : employees.map((emp, i) => (
                  <motion.tr key={emp._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-sm"
                          style={{ background: `hsl(${(emp.fullName?.charCodeAt(0) || 65) * 7 % 360},55%,45%)` }}>
                          {emp.fullName?.charAt(0)?.toUpperCase() || 'E'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{emp.fullName}</p>
                          <p className="text-xs text-slate-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{emp.employeeId || '—'}</span></td>
                    <td><span className="text-sm">{emp.department || '—'}</span></td>
                    <td className="text-sm">{emp.phone}</td>
                    <td className="text-sm font-medium">₨{(emp.salary || 0).toLocaleString()}</td>
                    <td className="text-sm text-gray-500">{emp.joiningDate ? format(new Date(emp.joiningDate), 'dd MMM yyyy') : '—'}</td>
                    <td><StatusBadge status={emp.isActive ? 'active' : 'inactive'} /></td>
                    <td className="text-right">
                      {user?.userType === 'admin' && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => toggleMutation.mutate(emp._id)} className="btn-icon bg-slate-50 text-slate-500 hover:bg-slate-100" title="Toggle Status">
                            {emp.isActive ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
                          </button>
                          <button onClick={() => setEditEmployee(emp)} className="btn-icon bg-blue-50 text-blue-600 hover:bg-blue-100" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setDeleteId(emp._id)} className="btn-icon bg-rose-50 text-rose-600 hover:bg-rose-100" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        <Pagination page={page} pages={pagination.pages || 1} onPageChange={setPage} />
      </div>

      {/* Add modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Add New ${label}`}>
        <EmployeeForm
          userType={userType}
          loading={createMutation.isPending}
          onSubmit={(fd) => createMutation.mutate(fd)}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editEmployee} onClose={() => setEditEmployee(null)} title={`Edit ${label}`}>
        {editEmployee && (
          <EmployeeForm
            defaultValues={{ 
              ...editEmployee, 
              skills: editEmployee.skills?.join(', ') || '', 
              joiningDate: editEmployee.joiningDate ? format(new Date(editEmployee.joiningDate), 'yyyy-MM-dd') : '',
              dateOfBirth: editEmployee.dateOfBirth ? format(new Date(editEmployee.dateOfBirth), 'yyyy-MM-dd') : '' 
            }}
            userType={userType}
            loading={updateMutation.isPending}
            onSubmit={(fd) => updateMutation.mutate({ id: editEmployee._id, fd })}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        title={`Delete ${label}`}
        message={`Are you sure you want to delete this ${label.toLowerCase()}? This action cannot be undone.`}
      />
    </div>
  );
}
