import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import { FiSave, FiLock, FiUser } from 'react-icons/fi'
import { useState } from 'react'

export default function AdminSettings() {
  const { user, updateUser } = useAuthStore()
  const qc = useQueryClient()
  const [avatarFile, setAvatarFile] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [avatarToRemove, setAvatarToRemove] = useState(false)
  const [logoToRemove, setLogoToRemove] = useState(false)

  const { register: reg1, handleSubmit: hs1, formState: { isSubmitting: isSubmittingProfile } } = useForm({
    values: { name: user?.name, phone: user?.phone }
  })
  const { register: reg2, handleSubmit: hs2, reset: reset2 } = useForm()

  const profileMut = useMutation({
    mutationFn: d => api.put('/auth/profile', d).then(r => r.data),
    onSuccess: r => { 
      updateUser(r.user); 
      setAvatarFile(null);
      setAvatarToRemove(false);
      toast.success('Profile updated') 
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })
  const uploadImage = async (file) => {
    if (!file) return ''
    try {
      const fd = new FormData()
      fd.append('image', file)
      const { data } = await api.post('/uploads/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      return data.imageUrl
    } catch (err) {
      console.error('Image upload failed:', err)
      throw new Error(err.response?.data?.message || 'Image upload failed')
    }
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
  const { register: reg3, handleSubmit: hs3, formState: { isSubmitting: isSubmittingSite } } = useForm({
    values: {
      siteName: siteData?.settings?.siteName || '',
      siteDescription: siteData?.settings?.siteDescription || '',
      logoUrl: siteData?.settings?.logoUrl || '',
      footerText: siteData?.settings?.footerText || '',
      contactEmail: siteData?.settings?.contactEmail || '',
      contactPhone: siteData?.settings?.contactPhone || '',
      contactAddress: siteData?.settings?.contactAddress || '',
      websiteUrl: siteData?.settings?.websiteUrl || '',
      mapLat: siteData?.settings?.mapLat ?? 7.0289,
      mapLng: siteData?.settings?.mapLng ?? 80.0153,
      mapZoom: siteData?.settings?.mapZoom ?? 13,
      epfEmployeeRate: siteData?.settings?.epfEmployeeRate ?? 8,
      epfEmployerRate: siteData?.settings?.epfEmployerRate ?? 12,
      etfEmployerRate: siteData?.settings?.etfEmployerRate ?? 3,
    },
  })

  const siteMut = useMutation({
    mutationFn: (d) => api.put('/site-settings', d).then((r) => r.data),
    onSuccess: () => {
      toast.success('Site settings updated')
      setLogoFile(null)
      setLogoToRemove(false)
      qc.invalidateQueries({ queryKey: ['site-settings'] })
      qc.invalidateQueries({ queryKey: ['epf-records'] })
    },
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
          try {
            let avatar = user?.avatar || ''
            if (avatarToRemove) avatar = ''
            if (avatarFile) {
              const uploaded = await uploadImage(avatarFile)
              if (uploaded) avatar = uploaded
            }
            profileMut.mutate({ ...d, avatar })
          } catch (e) {
            toast.error(e.message)
          }
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
          <div className="flex flex-col gap-2">
            <label className="form-label">Profile Picture</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                {avatarFile ? (
                  <img src={URL.createObjectURL(avatarFile)} alt="Preview" className="w-full h-full object-cover" />
                ) : (!avatarToRemove && user?.avatar) ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400"><FiUser size={30} /></div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input type="file" accept="image/*" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-secondary/10 file:text-secondary hover:file:bg-secondary/20 transition-all cursor-pointer" 
                  onChange={(e) => {
                    setAvatarFile(e.target.files?.[0] || null)
                    setAvatarToRemove(false)
                  }} 
                />
                {((!avatarToRemove && user?.avatar) || avatarFile) && (
                  <button type="button" onClick={() => { 
                    if (window.confirm('Are you sure you want to remove your profile picture?')) {
                      setAvatarToRemove(true); 
                      setAvatarFile(null);
                    }
                  }} className="text-xs text-red-500 hover:text-red-600 font-medium w-fit">Remove Picture</button>
                )}
              </div>
            </div>
          </div>
          <button type="submit" disabled={profileMut.isPending || isSubmittingProfile} className="btn-primary">
            {profileMut.isPending || isSubmittingProfile ? <span className="spinner"/> : <><FiSave size={15}/> Save Profile</>}
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
          try {
            let logoUrl = d.logoUrl || ''
            if (logoToRemove) logoUrl = ''
            if (logoFile) {
              const uploaded = await uploadImage(logoFile)
              if (uploaded) logoUrl = uploaded
            }
            siteMut.mutate({ ...d, logoUrl })
          } catch (e) {
            toast.error(e.message)
          }
        })} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="form-label">Site Name</label><input {...reg3('siteName')} className="form-input" /></div>
            <div><label className="form-label">Logo URL</label><input {...reg3('logoUrl')} className="form-input" /></div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="form-label">Site Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-12 rounded bg-gray-50 border border-gray-200 flex items-center justify-center p-1">
                {logoFile ? (
                  <img src={URL.createObjectURL(logoFile)} alt="Preview" className="max-h-full object-contain" />
                ) : (!logoToRemove && siteData?.settings?.logoUrl) ? (
                  <img src={siteData.settings.logoUrl} alt="Logo" className="max-h-full object-contain" />
                ) : (
                  <span className="text-[10px] text-gray-400">No Logo</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input type="file" accept="image/*" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer" 
                  onChange={(e) => {
                    setLogoFile(e.target.files?.[0] || null)
                    setLogoToRemove(false)
                  }} 
                />
                {((!logoToRemove && siteData?.settings?.logoUrl) || logoFile) && (
                  <button type="button" onClick={() => { 
                    if (window.confirm('Are you sure you want to remove the site logo?')) {
                      setLogoToRemove(true); 
                      setLogoFile(null);
                    }
                  }} className="text-xs text-red-500 hover:text-red-600 font-medium w-fit">Remove Logo</button>
                )}
              </div>
            </div>
          </div>
          <div><label className="form-label">Description</label><textarea {...reg3('siteDescription')} className="form-input min-h-20" /></div>
          <div><label className="form-label">Footer Details</label><textarea {...reg3('footerText')} className="form-input min-h-20" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Contact Email</label><input {...reg3('contactEmail')} className="form-input" /></div>
            <div><label className="form-label">Contact Phone</label><input {...reg3('contactPhone')} className="form-input" /></div>
          </div>
          <div><label className="form-label">Contact Address</label><input {...reg3('contactAddress')} className="form-input" placeholder="Weliweriya, Sri Lanka" /></div>
          <div><label className="form-label">Website URL</label><input {...reg3('websiteUrl')} className="form-input" placeholder="https://www.example.com" /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="form-label">Map Latitude</label><input type="number" step="any" {...reg3('mapLat', { valueAsNumber: true })} className="form-input" /></div>
            <div><label className="form-label">Map Longitude</label><input type="number" step="any" {...reg3('mapLng', { valueAsNumber: true })} className="form-input" /></div>
            <div><label className="form-label">Map Zoom</label><input type="number" {...reg3('mapZoom', { valueAsNumber: true })} className="form-input" /></div>
          </div>
          <div className="border-t border-slate-100 pt-4 mt-2">
            <p className="text-xs text-gray-500 mb-3">Payroll and EPF/ETF calculations use these percentages of basic salary (Sri Lanka defaults: 8% / 12% / 3%).</p>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">EPF employee (%)</label>
                <input type="number" step="0.01" min={0} max={50} {...reg3('epfEmployeeRate', { valueAsNumber: true })} className="form-input" />
              </div>
              <div>
                <label className="form-label">EPF employer (%)</label>
                <input type="number" step="0.01" min={0} max={50} {...reg3('epfEmployerRate', { valueAsNumber: true })} className="form-input" />
              </div>
              <div>
                <label className="form-label">ETF employer (%)</label>
                <input type="number" step="0.01" min={0} max={50} {...reg3('etfEmployerRate', { valueAsNumber: true })} className="form-input" />
              </div>
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={siteMut.isPending || isSubmittingSite}>
            {siteMut.isPending || isSubmittingSite ? <span className="spinner"/> : 'Save Site Settings'}
          </button>
        </form>
      </div>

      <div className="card card-body bg-slate-50">
        <h3 className="font-bold text-primary font-heading mb-4">System Information</h3>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          {[
            { label:'Platform', value:'Raxwo Portal v1.0' },
            { label:'Stack', value:'MERN (MongoDB, Express, React, Node)' },
            { label:'Environment', value:'Development' },
            { label:'EPF Rate (Employee)', value: `${Number(siteData?.settings?.epfEmployeeRate ?? 8)}%` },
            { label:'EPF Rate (Employer)', value: `${Number(siteData?.settings?.epfEmployerRate ?? 12)}%` },
            { label:'ETF Rate (Employer)', value: `${Number(siteData?.settings?.etfEmployerRate ?? 3)}%` },
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
