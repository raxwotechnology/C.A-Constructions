import { useQuery } from '@tanstack/react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FiUsers, FiMail, FiPhone, FiFolder, FiPlus, FiEdit2, FiX } from 'react-icons/fi'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export default function AdminClients() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', referralCode: '' })
  const [editingClient, setEditingClient] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', isActive: true })
  const { data, isLoading } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => api.get('/auth/users').then(r => r.data),
  })
  const { data: projData } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  })
  const addClientMut = useMutation({
    mutationFn: (payload) => api.post('/auth/clients', payload).then((r) => r.data),
    onSuccess: () => {
      toast.success('Client added')
      setForm({ name: '', email: '', phone: '', password: '', referralCode: '' })
      qc.invalidateQueries({ queryKey: ['admin-clients'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to add client'),
  })
  const updateClientMut = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/auth/users/${id}`, payload).then((r) => r.data),
    onSuccess: () => {
      toast.success('Client updated')
      setEditingClient(null)
      qc.invalidateQueries({ queryKey: ['admin-clients'] })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update client'),
  })

  const clients = (data?.users || []).filter(u => u.role === 'client')

  const getClientProjects = (clientId) =>
    (projData?.projects || []).filter(p => p.client?._id === clientId || p.client === clientId)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">{clients.length} registered clients</p>
        </div>
      </div>
      <div className="card card-body">
        <h3 className="font-bold text-primary font-heading mb-3">Add Client Manually</h3>
        <div className="grid md:grid-cols-6 gap-3">
          <input className="form-input" placeholder="Client name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          <input className="form-input" placeholder="Client email" type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          <input className="form-input" placeholder="Phone" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
          <input className="form-input" placeholder="Password (optional)" type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
          <input className="form-input" placeholder="Referral code (optional)" value={form.referralCode} onChange={(e) => setForm((s) => ({ ...s, referralCode: e.target.value.toUpperCase() }))} />
          <button className="btn-primary justify-center" onClick={() => addClientMut.mutate(form)} disabled={!form.name || !form.email || addClientMut.isPending}>
            <FiPlus size={14} /> Add Client
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"/></div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map(client => {
            const projects = getClientProjects(client._id)
            return (
              <div key={client._id} className="card card-body card-hover">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary font-bold text-lg">
                    {client.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-primary font-heading">{client.name}</h3>
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
                <div className="mt-3">
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => {
                      setEditingClient(client)
                      setEditForm({
                        name: client.name || '',
                        email: client.email || '',
                        phone: client.phone || '',
                        isActive: Boolean(client.isActive),
                      })
                    }}
                  >
                    <FiEdit2 size={13} /> Edit Client
                  </button>
                </div>
              </div>
            )
          })}
          {clients.length === 0 && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <FiUsers size={40} className="mx-auto mb-2 opacity-30"/>
              <p>No clients yet. Clients register via the public portal.</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {editingClient ? (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="p-5 border-b flex items-center justify-between">
                <h3 className="text-lg font-bold text-primary font-heading">Edit Client</h3>
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
                <div className="flex gap-3">
                  <button className="btn-ghost flex-1 justify-center" onClick={() => setEditingClient(null)}>Cancel</button>
                  <button className="btn-primary flex-1 justify-center" onClick={() => updateClientMut.mutate({ id: editingClient._id, payload: editForm })} disabled={updateClientMut.isPending}>Save</button>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
