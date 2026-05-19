import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'
import { FiMail, FiPhone, FiSave, FiCamera, FiBriefcase, FiCalendar, FiUser, FiShield, FiMapPin, FiCode, FiKey, FiEye, FiEyeOff } from 'react-icons/fi'
import { useState } from 'react'
import { mediaUrl } from '../../lib/media'
import { useForm as usePwdForm } from 'react-hook-form'

export default function EmployeeProfile() {
  const { user, updateUser } = useAuthStore()
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [showPwdForm, setShowPwdForm] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const { data } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get('/employees/me').then(r => r.data),
  })
  const emp = data?.employee

  const { register, handleSubmit } = useForm({
    defaultValues: { name: user?.name || '', phone: user?.phone || '' },
  })

  const { register: regPwd, handleSubmit: handlePwd, reset: resetPwd } = usePwdForm()

  const profileMut = useMutation({
    mutationFn: async (vals) => {
      let avatar = user?.avatar || ''
      if (avatarFile) {
        const fd = new FormData()
        fd.append('image', avatarFile)
        const { data: up } = await api.post('/uploads/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        avatar = up.imageUrl
      }
      return api.put('/auth/profile', { ...vals, avatar }).then(r => r.data)
    },
    onSuccess: r => { updateUser(r.user); toast.success('Profile updated'); setAvatarFile(null); setAvatarPreview(null) },
    onError: e => toast.error(e.response?.data?.message || 'Failed to update'),
  })

  const pwdMut = useMutation({
    mutationFn: vals => api.put('/auth/change-password', vals).then(r => r.data),
    onSuccess: () => { toast.success('Password changed'); setShowPwdForm(false); resetPwd() },
    onError: e => toast.error(e.response?.data?.message || 'Failed to change password'),
  })

  const handleAvatarChange = e => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const avatarSrc = avatarPreview || (user?.avatar ? mediaUrl(user.avatar) : null)
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'E'

  const infoFields = [
    { icon: FiMail, label: 'Email', val: user?.email },
    { icon: FiPhone, label: 'Phone', val: user?.phone || '—' },
    { icon: FiBriefcase, label: 'Department', val: emp?.department || '—' },
    { icon: FiUser, label: 'Designation', val: emp?.designation || '—' },
    { icon: FiShield, label: 'Employee No', val: emp?.employeeNo || '—' },
    { icon: FiCalendar, label: 'Joined Date', val: emp?.joinedDate ? new Date(emp.joinedDate).toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
    { icon: FiShield, label: 'EPF Number', val: emp?.epfNumber || '—' },
    { icon: FiMapPin, label: 'Branch', val: emp?.branch?.name || '—' },
  ]

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your personal information and account security.</p>
        </div>
      </div>

      {/* Profile card */}
      <div className="card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary to-secondary" />

        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-12 mb-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-secondary to-blue-600 flex items-center justify-center">
                {avatarSrc
                  ? <img src={avatarSrc} alt={user?.name} className="w-full h-full object-cover" />
                  : <span className="text-white font-bold text-2xl">{initials}</span>}
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-secondary hover:border-secondary hover:text-white transition-colors">
                <FiCamera size={13} />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold text-primary font-heading">{user?.name}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="badge badge-navy capitalize">{emp?.designation || user?.role}</span>
                {emp?.department && <span className="badge bg-slate-100 text-slate-600">{emp.department}</span>}
                {emp?.employeeNo && <span className="badge bg-slate-50 text-slate-500 font-mono text-xs">{emp.employeeNo}</span>}
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {infoFields.map(f => (
              <div key={f.label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                  <f.icon size={14} className="text-secondary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{f.label}</p>
                  <p className="text-sm font-medium text-slate-700 truncate">{f.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Skills */}
          {emp?.skills?.length > 0 && (
            <div className="mb-6 pb-6 border-b">
              <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-2 flex items-center gap-1.5"><FiCode size={11} /> Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {emp.skills.map(s => <span key={s} className="badge badge-blue text-xs">{s}</span>)}
              </div>
            </div>
          )}

          {/* CV */}
          {emp?.cvUrl && (
            <div className="flex gap-3 mb-6 pb-6 border-b">
              <a href={mediaUrl(emp.cvUrl)} target="_blank" rel="noreferrer" className="btn-outline btn-sm gap-1.5">
                <FiUser size={12} /> View CV
              </a>
              <a href={mediaUrl(emp.cvUrl)} download className="btn-ghost btn-sm gap-1.5">
                Download CV
              </a>
            </div>
          )}

          {/* Edit form */}
          <form onSubmit={handleSubmit(vals => profileMut.mutate(vals))} className="space-y-4 border-t pt-5">
            <h3 className="font-bold text-sm text-slate-600 uppercase tracking-wider">Edit Profile</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Display Name</label>
                <input className="form-input" {...register('name', { required: true })} />
              </div>
              <div>
                <label className="form-label">Phone Number</label>
                <input className="form-input" {...register('phone')} placeholder="+94 77 000 0000" />
              </div>
            </div>
            {avatarFile && <p className="text-xs text-secondary flex items-center gap-1.5"><FiCamera size={11} /> New photo selected — save to apply</p>}
            <button type="submit" disabled={profileMut.isPending} className="btn-primary gap-2">
              {profileMut.isPending
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                : <><FiSave size={14} /> Save Changes</>}
            </button>
          </form>
        </div>
      </div>

      {/* Password change */}
      <div className="card card-body">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <FiKey size={14} className="text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-primary">Change Password</p>
              <p className="text-xs text-slate-400">Keep your account secure</p>
            </div>
          </div>
          <button onClick={() => setShowPwdForm(p => !p)} className="btn-ghost btn-sm">
            {showPwdForm ? 'Cancel' : 'Change'}
          </button>
        </div>

        {showPwdForm && (
          <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handlePwd(vals => pwdMut.mutate(vals))} className="space-y-4 border-t pt-4">
            <div className="relative">
              <label className="form-label">Current Password</label>
              <input type={showOld ? 'text' : 'password'} className="form-input pr-10"
                {...regPwd('oldPassword', { required: true })} />
              <button type="button" onClick={() => setShowOld(p => !p)}
                className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600">
                {showOld ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
            <div className="relative">
              <label className="form-label">New Password</label>
              <input type={showNew ? 'text' : 'password'} className="form-input pr-10"
                {...regPwd('newPassword', { required: true, minLength: { value: 6, message: 'Min 6 characters' } })} />
              <button type="button" onClick={() => setShowNew(p => !p)}
                className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600">
                {showNew ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
            <button type="submit" disabled={pwdMut.isPending} className="btn-primary gap-2">
              {pwdMut.isPending ? 'Updating...' : 'Update Password'}
            </button>
          </motion.form>
        )}
      </div>
    </div>
  )
}
