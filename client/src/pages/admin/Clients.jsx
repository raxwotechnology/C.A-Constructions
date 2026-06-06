import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiUsers, FiMail, FiPhone, FiFolder, FiPlus, FiEdit2, FiX, FiTrash2, FiSearch } from 'react-icons/fi'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import ExportBar from '../../components/ui/ExportBar'
import { useDeleteWithPassword } from '../../components/admin/DeletePasswordGate'

export default function AdminClients() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', referralCode: '', branch: '' })
  const [editingClient, setEditingClient] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', isActive: true, branch: '', referralCode: '', newPassword: '' })
  const [branchFilter, setBranchFilter] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: branchData } = useQuery({ queryKey: ['branches-list'], queryFn: () => api.get('/branches').then(r => r.data) })
  const branches = branchData?.branches || []
  
  const { data, isLoading } = useQuery({
    queryKey: ['admin-clients', branchFilter],
    queryFn: () => api.get(`/clients${branchFilter ? `?branch=${branchFilter}` : ''}`).then(r => r.data),
  })
  
  const { data: projData } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })

  const addClientMut = useMutation({
    mutationFn: (payload) => api.post('/auth/clients', payload).then((r) => r.data),
    onSuccess: () => {
      toast.success('Client added')
      setForm({ name: '', email: '', phone: '', password: '', referralCode: '', branch: '' })
      qc.invalidateQueries({ queryKey: ['admin-clients'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to add client'),
  })

  const updateClientMut = useMutation({
    mutationFn: async ({ id, payload, newPassword }) => {
      if (newPassword?.trim()) {
        await api.put(`/auth/users/${id}/password`, { newPassword: newPassword.trim() })
      }
      return api.put(`/auth/users/${id}`, payload).then((r) => r.data)
    },
    onSuccess: () => {
      toast.success('Client updated')
      setEditingClient(null)
      qc.invalidateQueries({ queryKey: ['admin-clients'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update client'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/auth/users/${id}`).then(r => r.data),
    onSuccess: () => {
      toast.success('Client deleted')
      qc.invalidateQueries({ queryKey: ['admin-clients'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to delete client'),
  })
  const { requestDelete: requestDeleteClient, DeletePasswordModal: clientDeleteModal } = useDeleteWithPassword(deleteMut, {
    title: 'Delete client',
    message: 'Enter your admin password to permanently delete this client and their portal access.',
  })

  const clients = data?.clients || []

  const filteredClients = clients.filter((c) => {
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || [
      c.name,
      c.email,
      c.phone,
      c.profile?.companyName,
      c.referralCode,
      c.branch?.name,
    ].some((f) => String(f || '').toLowerCase().includes(q))
    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'active' ? c.isActive !== false : c.isActive === false)
    return matchesSearch && matchesStatus
  })

  const getClientProjects = (clientId) =>
    (projData?.projects || []).filter(p => p.client?._id === clientId || p.client === clientId)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">
            {filteredClients.length === clients.length
              ? `${clients.length} registered clients`
              : `${filteredClients.length} of ${clients.length} clients`}
          </p>
        </div>
        <ExportBar
          data={filteredClients}
          columns={[
            { header: 'Company Name', accessor: (c) => c.profile?.companyName || c.name },
            { header: 'Contact Person', accessor: 'name' },
            { header: 'Email', accessor: 'email' },
            { header: 'Phone', accessor: 'phone' },
            { header: 'Status', accessor: (c) => c.isActive ? 'Active' : 'Inactive' },
            { header: 'Joined Date', accessor: (c) => new Date(c.createdAt).toLocaleDateString() },
          ]}
          title="Clients Directory"
          filters={{ Status: statusFilter, Branch: branches.find(b => b._id === branchFilter)?.name }}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, company…"
            className="form-input pl-9"
          />
        </div>
        <select className="form-select w-full sm:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select className="form-select w-full sm:w-48" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
      </div>
      
      <div className="card card-body">
        <h3 className="font-bold text-primary font-heading mb-3">Add Client Manually</h3>
        <div className="grid md:grid-cols-6 gap-3">
          <input className="form-input" placeholder="Client name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          <input className="form-input" placeholder="Client email" type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          <input className="form-input" placeholder="Phone" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
          <input className="form-input" placeholder="Password (optional)" type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
          <input className="form-input" placeholder="Referral code (optional)" value={form.referralCode} onChange={(e) => setForm((s) => ({ ...s, referralCode: e.target.value.toUpperCase() }))} />
          <select className="form-select" value={form.branch} onChange={e => setForm(s => ({ ...s, branch: e.target.value }))}>
            <option value="">No branch</option>
            {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
          <button className="btn-primary justify-center" onClick={() => addClientMut.mutate(form)} disabled={!form.name || !form.email || addClientMut.isPending}>
            <FiPlus size={14} /> Add Client
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"/></div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredClients.map(client => {
            const projects = getClientProjects(client._id)
            return (
              <div key={client._id} className="card card-body card-hover">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary font-bold text-lg cursor-pointer hover:bg-secondary/20" onClick={() => navigate(`/admin/clients/${client._id}`)}>
                    {(client.profile?.companyName || client.name)?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-primary font-heading cursor-pointer hover:text-secondary" onClick={() => navigate(`/admin/clients/${client._id}`)}>
                      {client.profile?.companyName || client.name}
                    </h3>
                    <span className={`badge ${client.isActive ? 'badge-green' : 'badge-gray'} text-xs`}>
                      {client.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiMail size={13} className="text-gray-400"/>{client.email}
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <FiPhone size={13} className="text-gray-400"/>{client.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <FiFolder size={13} className="text-gray-400"/>
                    {projects.length} project{projects.length !== 1 ? 's' : ''}
                  </div>
                </div>
                {projects.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">Projects</p>
                    <div className="flex flex-wrap gap-1">
                      {projects.slice(0,3).map(p => (
                        <span key={p._id} className={`badge text-xs ${p.status==='active'?'badge-green':p.status==='completed'?'badge-blue':'badge-gray'}`}>
                          {p.title.slice(0,15)}{p.title.length>15?'...':''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-3">
                  Joined {new Date(client.createdAt).toLocaleDateString('en-LK')}
                </p>
                <div className="mt-3 flex items-center gap-2 flex-nowrap">
                  <button className="btn-primary btn-sm justify-center whitespace-nowrap" onClick={() => navigate(`/admin/clients/${client._id}`)}>
                    View CRM Profile
                  </button>
                  <button className="btn-ghost btn-sm whitespace-nowrap shrink-0" onClick={() => {
                      setEditingClient(client)
                      setEditForm({
                        name: client.name || '',
                        email: client.email || '',
                        phone: client.phone || '',
                        isActive: Boolean(client.isActive),
                        branch: client.branch?._id || client.branch || '',
                        referralCode: client.referralCode || '',
                        newPassword: '',
                      })
                    }}>
                    <FiEdit2 size={13} /> Edit Login
                  </button>
                  <button type="button" className="btn-ghost btn-sm text-red-500 hover:bg-red-50 whitespace-nowrap shrink-0" onClick={() => requestDeleteClient(client._id)}>
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
          {filteredClients.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <FiUsers size={40} className="mx-auto mb-2 opacity-30"/>
              <p>{clients.length === 0 ? 'No clients yet. Clients register via the public portal.' : 'No clients match your filters.'}</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {editingClient ? (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="p-5 border-b flex items-center justify-between">
                <h3 className="text-lg font-bold text-primary font-heading">Edit Client Account</h3>
                <button className="p-2 hover:bg-slate-100 rounded-lg" onClick={() => setEditingClient(null)}><FiX /></button>
              </div>
              <div className="p-5 space-y-3">
                <input className="form-input" placeholder="Name" value={editForm.name} onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))} />
                <input className="form-input" placeholder="Email" type="email" value={editForm.email} onChange={(e) => setEditForm((s) => ({ ...s, email: e.target.value }))} />
                <input className="form-input" placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm((s) => ({ ...s, phone: e.target.value }))} />
                <select className="form-select" value={editForm.isActive ? 'active' : 'inactive'} onChange={(e) => setEditForm((s) => ({ ...s, isActive: e.target.value === 'active' }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select className="form-select" value={editForm.branch} onChange={e => setEditForm(s => ({ ...s, branch: e.target.value }))}>
                  <option value="">No branch</option>
                  {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
                <input className="form-input" placeholder="Referral code" value={editForm.referralCode} onChange={(e) => setEditForm((s) => ({ ...s, referralCode: e.target.value.toUpperCase() }))} />
                <input
                  className="form-input"
                  type="password"
                  placeholder="New login password (optional)"
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm((s) => ({ ...s, newPassword: e.target.value }))}
                />
                <p className="text-xs text-slate-500">Leave blank to keep the current password. Must be 8+ chars with upper, lower, and a number.</p>
                <div className="flex gap-3">
                  <button className="btn-ghost flex-1 justify-center" onClick={() => setEditingClient(null)}>Cancel</button>
                  <button
                    className="btn-primary flex-1 justify-center"
                    onClick={() => updateClientMut.mutate({
                      id: editingClient._id,
                      payload: {
                        name: editForm.name,
                        email: editForm.email,
                        phone: editForm.phone,
                        isActive: editForm.isActive,
                        branch: editForm.branch,
                        referralCode: editForm.referralCode,
                      },
                      newPassword: editForm.newPassword,
                    })}
                    disabled={updateClientMut.isPending}
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
      {clientDeleteModal}
    </div>
  )
}
