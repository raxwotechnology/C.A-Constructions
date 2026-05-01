import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectAPI } from '../../api';
import { Modal, ConfirmModal, StatusBadge, SearchInput, Pagination, TableSkeleton, EmptyState } from '../../components/ui';
import { Plus, Edit2, Trash2, FolderKanban, ChevronRight, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const PROJECT_TYPES = ['web_development', 'mobile_app', 'api_development', 'design', 'testing', 'maintenance', 'other'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUSES = ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'];

function ProjectForm({ defaultValues, onSubmit, loading }) {
  const [form, setForm] = useState(defaultValues || {
    title: '', description: '', projectType: 'web_development', status: 'planning',
    priority: 'medium', clientName: '', budget: '', startDate: '', expectedEndDate: '', progressPercentage: 0
  });
  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(form); };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="form-group">
        <label className="form-label">Project Title *</label>
        <input name="title" value={form.title} onChange={handleChange} className="form-input" required placeholder="Project name" />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea name="description" value={form.description} onChange={handleChange} className="form-textarea" placeholder="Project description" rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group">
          <label className="form-label">Project Type</label>
          <select name="projectType" value={form.projectType} onChange={handleChange} className="form-select">
            {PROJECT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select name="priority" value={form.priority} onChange={handleChange} className="form-select">
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select name="status" value={form.status} onChange={handleChange} className="form-select">
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Client Name</label>
          <input name="clientName" value={form.clientName} onChange={handleChange} className="form-input" placeholder="Client" />
        </div>
        <div className="form-group">
          <label className="form-label">Budget (₨)</label>
          <input name="budget" type="number" value={form.budget} onChange={handleChange} className="form-input" placeholder="0" />
        </div>
        <div className="form-group">
          <label className="form-label">Progress %</label>
          <input name="progressPercentage" type="number" min="0" max="100" value={form.progressPercentage} onChange={handleChange} className="form-input" />
        </div>
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input name="startDate" type="date" value={form.startDate} onChange={handleChange} className="form-input" />
        </div>
        <div className="form-group">
          <label className="form-label">Expected End Date</label>
          <input name="expectedEndDate" type="date" value={form.expectedEndDate} onChange={handleChange} className="form-input" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : (defaultValues ? 'Update Project' : 'Create Project')}
        </button>
      </div>
    </form>
  );
}

function ProgressBar({ value }) {
  const color = value >= 75 ? '#22c55e' : value >= 40 ? '#534AB7' : '#f59e0b';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div style={{ width: `${value}%`, backgroundColor: color }} className="h-full rounded-full transition-all" />
      </div>
      <span className="text-xs text-gray-600 w-8 text-right">{value}%</span>
    </div>
  );
}

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', search, statusFilter, page],
    queryFn: () => projectAPI.getAll({ search, status: statusFilter, page, limit: 15 }).then(r => r.data),
    keepPreviousData: true,
  });

  const projects = data?.data || [];
  const pagination = data?.pagination || {};

  const createMutation = useMutation({
    mutationFn: (d) => projectAPI.create(d),
    onSuccess: () => { qc.invalidateQueries(['projects']); toast.success('Project created'); setModalOpen(false); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, d }) => projectAPI.update(id, d),
    onSuccess: () => { qc.invalidateQueries(['projects']); toast.success('Project updated'); setEditProject(null); }
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => projectAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries(['projects']); toast.success('Project deleted'); setDeleteId(null); }
  });

  const priorityColors = { urgent: 'text-red-600 bg-red-50', high: 'text-orange-600 bg-orange-50', medium: 'text-blue-600 bg-blue-50', low: 'text-gray-600 bg-gray-100' };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Track all company projects and milestones</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus size={15} /> New Project</button>
      </div>

      <div className="card">
        <div className="card-header flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{pagination.total || 0} projects</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select w-36 h-8 text-xs">
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search projects..." />
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Progress</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            {isLoading ? <TableSkeleton rows={8} cols={8} /> : (
              <tbody>
                {projects.length === 0 ? (
                  <tr><td colSpan={8}><EmptyState icon={FolderKanban} title="No projects found" description="Create your first project to get started." /></td></tr>
                ) : projects.map((p, i) => (
                  <motion.tr key={p._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900">{p.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.assignedTo?.length || 0} members</p>
                      </div>
                    </td>
                    <td className="text-sm">{p.clientName || '—'}</td>
                    <td className="text-xs text-gray-600">{p.projectType?.replace(/_/g, ' ')}</td>
                    <td>
                      <span className={`badge text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[p.priority] || ''}`}>
                        {p.priority}
                      </span>
                    </td>
                    <td className="w-32"><ProgressBar value={p.progressPercentage || 0} /></td>
                    <td className="text-sm text-gray-500">
                      {p.expectedEndDate ? format(new Date(p.expectedEndDate), 'dd MMM yyyy') : '—'}
                    </td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditProject(p)} className="btn-ghost btn-icon"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteId(p._id)} className="btn-ghost btn-icon text-red-400"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        <Pagination page={page} pages={pagination.pages || 1} onPageChange={setPage} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create New Project">
        <ProjectForm loading={createMutation.isPending} onSubmit={(d) => createMutation.mutate(d)} />
      </Modal>
      <Modal open={!!editProject} onClose={() => setEditProject(null)} title="Edit Project">
        {editProject && (
          <ProjectForm
            defaultValues={{
              ...editProject,
              startDate: editProject.startDate ? format(new Date(editProject.startDate), 'yyyy-MM-dd') : '',
              expectedEndDate: editProject.expectedEndDate ? format(new Date(editProject.expectedEndDate), 'yyyy-MM-dd') : '',
            }}
            loading={updateMutation.isPending}
            onSubmit={(d) => updateMutation.mutate({ id: editProject._id, d })}
          />
        )}
      </Modal>
      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} title="Delete Project" message="This will permanently delete the project and all its data." />
    </div>
  );
}
