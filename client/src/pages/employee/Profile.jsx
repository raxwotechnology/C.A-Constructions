import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import { FiMail, FiPhone, FiSave } from 'react-icons/fi'
import { useState } from 'react'
import { mediaUrl } from '../../lib/media'

export default function EmployeeProfile() {
  const { user, updateUser } = useAuthStore()
  const [avatarFile, setAvatarFile] = useState(null)
  const { data } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/employees/me').then(r => r.data),
  })
  const emp = data?.employee
  const { register, handleSubmit } = useForm({
    defaultValues: { name: user?.name, phone: user?.phone, avatar: user?.avatar || '' },
  })
  const profileMut = useMutation({
    mutationFn: (payload) => api.put('/auth/profile', payload).then((r) => r.data),
    onSuccess: (r) => { updateUser(r.user); toast.success('Profile updated') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })
  const uploadAvatar = async () => {
    if (!avatarFile) return user?.avatar || ''
    const fd = new FormData()
    fd.append('image', avatarFile)
    const { data } = await api.post('/uploads/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    return data.imageUrl
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header"><div><h1 className="page-title">Developer Profile</h1><p className="page-subtitle">Your professional information and account details</p></div></div>

      <div className="card card-body max-w-5xl">
        <div className="flex items-center gap-5 mb-6 pb-6 border-b">
          <div className="w-20 h-20 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary text-3xl font-bold overflow-hidden">
            {user?.avatar ? <img src={mediaUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover" /> : user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary font-heading">{user?.name}</h2>
            <p className="text-gray-500">{emp?.designation} · {emp?.department}</p>
            <span className="badge badge-navy mt-1">{emp?.employeeNo}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {[
            { label:'Email', value: user?.email, icon: FiMail },
            { label:'Phone', value: user?.phone || '—', icon: FiPhone },
            { label:'Department', value: emp?.department },
            { label:'Designation', value: emp?.designation },
            { label:'EPF Number', value: emp?.epfNumber || '—' },
            { label:'Joined Date', value: emp?.joinedDate ? new Date(emp.joinedDate).toLocaleDateString('en-LK') : '—' },
            { label:'Status', value: emp?.status },
            { label:'Role', value: user?.role },
          ].map(f => (
            <div key={f.label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
              <p className="font-medium text-gray-800 capitalize">{f.value || '—'}</p>
            </div>
          ))}
        </div>

        {emp?.skills?.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-400 mb-2">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {emp.skills.map(s => <span key={s} className="badge badge-blue">{s}</span>)}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(async (v) => {
          const avatar = await uploadAvatar()
          profileMut.mutate({ ...v, avatar })
        })} className="mt-6 pt-6 border-t grid md:grid-cols-2 gap-4">
          <div><label className="form-label">Display Name</label><input className="form-input" {...register('name')} /></div>
          <div><label className="form-label">Phone</label><input className="form-input" {...register('phone')} /></div>
          <div className="md:col-span-2"><label className="form-label">Profile picture</label><input type="file" accept="image/*" className="form-input" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} /></div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary" disabled={profileMut.isPending}><FiSave size={14} /> Save Profile</button>
          </div>
        </form>
      </div>
    </div>
  )
}
