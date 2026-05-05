import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import { FiSave } from 'react-icons/fi'
import { useState } from 'react'

export default function ManagerProfile() {
  const { user, updateUser } = useAuthStore()
  const [avatarFile, setAvatarFile] = useState(null)
  const { register, handleSubmit } = useForm({
    defaultValues: { name: user?.name, phone: user?.phone },
  })

  const profileMut = useMutation({
    mutationFn: (d) => api.put('/auth/profile', d).then((r) => r.data),
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
      <div className="page-header">
        <div>
          <h1 className="page-title">Manager Profile</h1>
          <p className="page-subtitle">Update your account and profile picture.</p>
        </div>
      </div>
      <div className="card card-body">
        <form onSubmit={handleSubmit(async (v) => {
          const avatar = await uploadAvatar()
          profileMut.mutate({ ...v, avatar })
        })} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="form-label">Name</label><input className="form-input" {...register('name')} /></div>
            <div><label className="form-label">Phone</label><input className="form-input" {...register('phone')} /></div>
          </div>
          <div>
            <label className="form-label">Profile picture</label>
            <input type="file" accept="image/*" className="form-input" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
          </div>
          <button type="submit" className="btn-primary" disabled={profileMut.isPending}><FiSave size={14} /> Save</button>
        </form>
      </div>
    </div>
  )
}

