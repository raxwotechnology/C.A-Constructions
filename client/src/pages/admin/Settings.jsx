import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import { FiSave, FiLock, FiUser } from 'react-icons/fi'
import { useState } from 'react'

export default function AdminSettings() {
  const { user, updateUser } = useAuthStore()
  const [avatarFile, setAvatarFile] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const { register: reg1, handleSubmit: hs1 } = useForm({ defaultValues: { name: user?.name, phone: user?.phone } })
  const { register: reg2, handleSubmit: hs2, reset: reset2 } = useForm()

  const profileMut = useMutation({
    mutationFn: d => api.put('/auth/profile', d).then(r => r.data),
    onSuccess: r => { updateUser(r.user); toast.success('Profile updated') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const uploadImage = async (file) => {
    if (!file) return ''
    const fd = new FormData()
    fd.append('image', file)
    const { data } = await api.post('/uploads/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    return data.imageUrl
  }
  const passMut = useMutation({
    mutationFn: d => api.put('/auth/change-password', d),
    onSuccess: () => { reset2(); toast.success('Password changed') },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const { data: siteData } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => api.get('/site-settings').then((r) => r.data),
  })
  const { register: reg3, handleSubmit: hs3 } = useForm({
    values: {
      siteName: siteData?.settings?.siteName || '',
      siteDescription: siteData?.settings?.siteDescription || '',
      logoUrl: siteData?.settings?.logoUrl || '',
      footerText: siteData?.settings?.footerText || '',
      contactEmail: siteData?.settings?.contactEmail || '',
      contactPhone: siteData?.settings?.contactPhone || '',
      contactAddress: siteData?.settings?.contactAddress || '',
      mapLat: siteData?.settings?.mapLat ?? 7.0289,
      mapLng: siteData?.settings?.mapLng ?? 80.0153,
      mapZoom: siteData?.settings?.mapZoom ?? 13,
    },
  })
  const siteMut = useMutation({
    mutationFn: (d) => api.put('/site-settings', d).then((r) => r.data),
    onSuccess: () => toast.success('Site settings updated'),
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and system preferences</p>
        </div>
      </div>

      {/* Profile */}
      <div className="card card-body">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
            <FiUser className="text-secondary" size={18}/>
          </div>
          <div>
            <h3 className="font-bold text-primary font-heading">Profile Information</h3>
            <p className="text-xs text-gray-400">Update your name and phone number</p>
          </div>
        </div>

        <form onSubmit={hs1(async (d) => {
          const uploadedAvatar = await uploadImage(avatarFile)
          profileMut.mutate({ ...d, avatar: uploadedAvatar || user?.avatar || '' })
        })} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Full Name</label>
              <input {...reg1('name')} className="form-input"/>
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input {...reg1('phone')} placeholder="+94 77 xxx xxxx" className="form-input"/>
            </div>
          </div>
          <div>
            <label className="form-label">Email</label>
            <input value={user?.email} disabled className="form-input bg-gray-50 text-gray-400 cursor-not-allowed"/>
          </div>
          <div>
            <label className="form-label">Role</label>
            <input value={user?.role} disabled className="form-input bg-gray-50 text-gray-400 cursor-not-allowed capitalize"/>
          </div>
          <div><label className="form-label">Profile Picture</label><input type="file" accept="image/*" className="form-input" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} /></div>
          <button type="submit" disabled={profileMut.isPending} className="btn-primary">
            {profileMut.isPending ? <span className="spinner"/> : <><FiSave size={15}/> Save Profile</>}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card card-body">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <FiLock className="text-red-500" size={18}/>
          </div>
          <div>
            <h3 className="font-bold text-primary font-heading">Change Password</h3>
            <p className="text-xs text-gray-400">Choose a strong password with at least 6 characters</p>
          </div>
        </div>
        <form onSubmit={hs2(d => passMut.mutate(d))} className="space-y-4">
          <div>
            <label className="form-label">Current Password</label>
            <input {...reg2('currentPassword',{required:true})} type="password" placeholder="••••••••" className="form-input"/>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">New Password</label>
              <input {...reg2('newPassword',{required:true,minLength:{value:6,message:'Min 6 chars'}})} type="password" placeholder="••••••••" className="form-input"/>
            </div>
            <div>
              <label className="form-label">Confirm New Password</label>
              <input {...reg2('confirmPassword',{required:true})} type="password" placeholder="••••••••" className="form-input"/>
            </div>
          </div>
          <button type="submit" disabled={passMut.isPending} className="btn-danger">
            {passMut.isPending ? <span className="spinner"/> : <><FiLock size={15}/> Update Password</>}
          </button>
        </form>
      </div>

      {/* System info */}
      <div className="card card-body">
        <h3 className="font-bold text-primary font-heading mb-4">Site Settings</h3>
        <form onSubmit={hs3(async (d) => {
          const uploadedLogo = await uploadImage(logoFile)
          siteMut.mutate({ ...d, logoUrl: uploadedLogo || d.logoUrl || '' })
        })} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="form-label">Site Name</label><input {...reg3('siteName')} className="form-input" /></div>
            <div><label className="form-label">Logo URL</label><input {...reg3('logoUrl')} className="form-input" /></div>
          </div>
          <div><label className="form-label">Upload Logo Image</label><input type="file" accept="image/*" className="form-input" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} /></div>
          <div><label className="form-label">Description</label><textarea {...reg3('siteDescription')} className="form-input min-h-20" /></div>
          <div><label className="form-label">Footer Details</label><textarea {...reg3('footerText')} className="form-input min-h-20" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Contact Email</label><input {...reg3('contactEmail')} className="form-input" /></div>
            <div><label className="form-label">Contact Phone</label><input {...reg3('contactPhone')} className="form-input" /></div>
          </div>
          <div><label className="form-label">Contact Address</label><input {...reg3('contactAddress')} className="form-input" placeholder="Weliweriya, Sri Lanka" /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="form-label">Map Latitude</label><input type="number" step="any" {...reg3('mapLat', { valueAsNumber: true })} className="form-input" /></div>
            <div><label className="form-label">Map Longitude</label><input type="number" step="any" {...reg3('mapLng', { valueAsNumber: true })} className="form-input" /></div>
            <div><label className="form-label">Map Zoom</label><input type="number" {...reg3('mapZoom', { valueAsNumber: true })} className="form-input" /></div>
          </div>
          <button type="submit" className="btn-primary" disabled={siteMut.isPending}>Save Site Settings</button>
        </form>
      </div>

      <div className="card card-body bg-slate-50">
        <h3 className="font-bold text-primary font-heading mb-4">System Information</h3>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          {[
            { label:'Platform', value:'Raxwo Portal v1.0' },
            { label:'Stack', value:'MERN (MongoDB, Express, React, Node)' },
            { label:'Environment', value:'Development' },
            { label:'EPF Rate (Employee)', value:'8%' },
            { label:'EPF Rate (Employer)', value:'12%' },
            { label:'ETF Rate (Employer)', value:'3%' },
          ].map(i => (
            <div key={i.label} className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">{i.label}</span>
              <span className="font-medium text-gray-700">{i.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
