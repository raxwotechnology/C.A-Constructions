import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import { FiSave, FiUser, FiLock } from 'react-icons/fi'
import { useState } from 'react'

export default function ClientProfile() {
  const { user, updateUser } = useAuthStore()
  const [avatarFile, setAvatarFile] = useState(null)
  const { register: reg1, handleSubmit: hs1 } = useForm({ defaultValues: { name: user?.name, phone: user?.phone } })
  const { register: reg2, handleSubmit: hs2, reset: reset2 } = useForm()

  const profileMut = useMutation({
    mutationFn: d => api.put('/auth/profile', d).then(r => r.data),
    onSuccess: r => { updateUser(r.user); toast.success('Profile updated') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const uploadAvatar = async () => {
    if (!avatarFile) return user?.avatar || ''
    const fd = new FormData()
    fd.append('image', avatarFile)
    const { data } = await api.post('/uploads/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    return data.imageUrl
  }
  const passMut = useMutation({
    mutationFn: d => api.put('/auth/change-password', d),
    onSuccess: () => { reset2(); toast.success('Password changed') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <div className="animate-fade-in">
      <section className="bg-gradient-hero pt-32 pb-10">
        <div className="container-max">
          <p className="text-white/70 text-sm">Client Portal</p>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mt-2">My Account</h1>
          <p className="text-white/75 mt-2">Manage your account details securely.</p>
        </div>
      </section>

      <section className="section-padding bg-slate-50">
        <div className="container-max space-y-6 max-w-5xl">
          <div className="page-header">
            <div>
              <h2 className="page-title">Profile</h2>
              <p className="page-subtitle">Personal details and security</p>
            </div>
          </div>

      <div className="card card-body">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b">
          <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary text-2xl font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary font-heading">{user?.name}</h2>
            <p className="text-gray-500 text-sm">{user?.email}</p>
            <span className="badge badge-blue mt-1 capitalize">{user?.role}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center"><FiUser className="text-secondary" size={16}/></div>
          <div><h3 className="font-bold text-primary font-heading">Personal Information</h3></div>
        </div>

        <form onSubmit={hs1(async (d) => {
          const avatar = await uploadAvatar()
          profileMut.mutate({ ...d, avatar })
        })} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Full Name</label><input {...reg1('name')} className="form-input"/></div>
            <div><label className="form-label">Phone</label><input {...reg1('phone')} placeholder="+94 77 xxx xxxx" className="form-input"/></div>
          </div>
          <div><label className="form-label">Email (cannot change)</label>
            <input value={user?.email} disabled className="form-input bg-gray-50 text-gray-400 cursor-not-allowed"/></div>
          <div><label className="form-label">Profile picture</label>
            <input type="file" accept="image/*" className="form-input" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} /></div>
          <button type="submit" disabled={profileMut.isPending} className="btn-primary">
            {profileMut.isPending?<span className="spinner"/>:<><FiSave size={14}/> Save Changes</>}
          </button>
        </form>
      </div>

      <div className="card card-body">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center"><FiLock className="text-red-500" size={16}/></div>
          <div><h3 className="font-bold text-primary font-heading">Change Password</h3></div>
        </div>
        <form onSubmit={hs2(d => passMut.mutate(d))} className="space-y-4">
          <div><label className="form-label">Current Password</label>
            <input {...reg2('currentPassword',{required:true})} type="password" placeholder="••••••••" className="form-input"/></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">New Password</label>
              <input {...reg2('newPassword',{required:true,minLength:{value:6}})} type="password" placeholder="••••••••" className="form-input"/></div>
            <div><label className="form-label">Confirm Password</label>
              <input {...reg2('confirmPassword',{required:true})} type="password" placeholder="••••••••" className="form-input"/></div>
          </div>
          <button type="submit" disabled={passMut.isPending} className="btn-danger">
            {passMut.isPending?<span className="spinner"/>:<><FiLock size={14}/> Update Password</>}
          </button>
        </form>
      </div>
      </div>
      </section>
    </div>
  )
}
