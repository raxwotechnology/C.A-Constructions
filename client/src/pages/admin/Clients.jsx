import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { FiUsers, FiMail, FiPhone, FiFolder } from 'react-icons/fi'

export default function AdminClients() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => api.get('/auth/users').then(r => r.data),
  })
  const { data: projData } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
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
    </div>
  )
}
