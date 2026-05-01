import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';
import toast from 'react-hot-toast';
import {
  User, Save, Mail, Phone, Shield, Lock, Eye, EyeOff,
  Building2, Briefcase, Calendar, CheckCircle
} from 'lucide-react';

function FieldRow({ icon: Icon, label, children }) {
  return (
    <div className="group">
      <label className="form-label flex items-center gap-2">
        <Icon size={13} className="text-purple" style={{ color: '#534AB7' }} />
        {label}
      </label>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('info');
  const [pwSaving, setPwSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ''
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match.'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('Password must be at least 6 chars.'); return; }
    setPwSaving(true);
    try {
      await authAPI.changePassword({ oldPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await authAPI.updateProfile(profileForm);
      toast.success('Profile updated successfully! Refresh to see changes.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const tabs = [
    { id: 'info', label: 'My Details', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">View your staff details and manage your security settings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Profile card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-6 flex flex-col items-center text-center relative overflow-hidden">
            {/* Background design */}
            <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full opacity-10" style={{ background: 'linear-gradient(135deg, #080344, #534AB7)' }} />
            
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-xl"
                style={{ background: 'linear-gradient(135deg, #080344 0%, #534AB7 100%)' }}>
                {user?.fullName?.charAt(0)?.toUpperCase() || 'S'}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center shadow-lg border-2 border-white">
                <CheckCircle size={16} className="text-white" />
              </div>
            </div>

            <h2 className="text-lg font-black text-navy mt-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {user?.fullName}
            </h2>
            <p className="text-xs font-bold text-white bg-navy px-3 py-1 rounded-full uppercase tracking-wider mt-1.5 inline-block">
              {user?.userType?.replace('_', ' ')}
            </p>
            {user?.employeeId && (
              <p className="text-sm font-mono text-slate-500 mt-2 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                {user.employeeId}
              </p>
            )}

            <div className="w-full mt-5 pt-4 border-t border-slate-100 space-y-3 text-left">
              {user?.department && (
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center"><Building2 size={14} className="text-slate-400" /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider leading-none mb-0.5">Department</p>
                    <p className="font-medium text-slate-700">{user.department}</p>
                  </div>
                </div>
              )}
              {user?.position && (
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center"><Briefcase size={14} className="text-slate-400" /></div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider leading-none mb-0.5">Position</p>
                    <p className="font-medium text-slate-700">{user.position}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Tabs + Details */}
        <div className="lg:col-span-3 space-y-5">
          {/* Tab bar */}
          <div className="flex gap-2 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm w-fit">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  tab === t.id
                    ? 'text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
                style={tab === t.id ? { background: 'linear-gradient(135deg, #080344, #534AB7)' } : {}}>
                <t.icon size={15} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Details tab */}
          {tab === 'info' && (
            <div className="card">
              <div className="card-header">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #080344, #534AB7)' }}>
                    <User size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="card-title">Personal Details</h3>
                    <p className="text-xs text-slate-500">Update your core personal details here.</p>
                  </div>
                </div>
              </div>

              <div className="card-body">
                <form onSubmit={handleProfileUpdate}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FieldRow icon={User} label="Full Name">
                      <input type="text" value={profileForm.fullName} onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })}
                        className="form-input mt-1" required />
                    </FieldRow>

                    <FieldRow icon={Phone} label="Phone Number">
                      <input type="text" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="form-input mt-1" required />
                    </FieldRow>

                    <FieldRow icon={Mail} label="Email Address">
                      <input type="email" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="form-input mt-1" required />
                    </FieldRow>

                    <FieldRow icon={Calendar} label="Joining Date">
                      <input type="text" value={user?.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : 'N/A'} readOnly disabled
                        className="form-input mt-1 bg-slate-50 text-slate-500 cursor-not-allowed border-slate-100" />
                    </FieldRow>

                    <FieldRow icon={Calendar} label="Date of Birth">
                      <input type="date" value={profileForm.dateOfBirth} onChange={e => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                        className="form-input mt-1" />
                    </FieldRow>

                    {user?.skills?.length > 0 && (
                      <div className="md:col-span-2 mt-2">
                        <label className="form-label flex items-center gap-2 mb-3">
                          <Briefcase size={13} className="text-purple" style={{ color: '#534AB7' }} />
                          Skills
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {user.skills.map((skill, i) => (
                            <span key={i} className="bg-brand-50 text-purple border border-purple/20 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button type="submit" disabled={profileSaving} className="btn btn-primary px-6">
                      <Save size={15} />
                      {profileSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Security tab */}
          {tab === 'security' && (
            <div className="card">
              <div className="card-header">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50">
                    <Shield size={16} className="text-red-500" />
                  </div>
                  <div>
                    <h3 className="card-title">Change Password</h3>
                    <p className="text-xs text-slate-500">Update your account password.</p>
                  </div>
                </div>
              </div>

              <div className="card-body">
                <form onSubmit={handlePasswordChange} className="space-y-5 max-w-md">
                  {[
                    { key: 'currentPassword', label: 'Current Password' },
                    { key: 'newPassword', label: 'New Password' },
                    { key: 'confirmPassword', label: 'Confirm New Password' },
                  ].map(({ key, label }) => (
                    <div key={key} className="form-group">
                      <label className="form-label flex items-center gap-2">
                        <Lock size={13} className="text-purple" style={{ color: '#534AB7' }} />
                        {label}
                      </label>
                      <div className="relative">
                        <input
                          type={showPw[key] ? 'text' : 'password'}
                          value={pwForm[key]}
                          onChange={e => setPwForm({ ...pwForm, [key]: e.target.value })}
                          className="form-input pr-11"
                          placeholder="••••••••"
                          required
                        />
                        <button type="button" onClick={() => setShowPw(p => ({ ...p, [key]: !p[key] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPw[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                    ⚠ Password must be at least 6 characters. Choose something strong and unique.
                  </div>
                  <button type="submit" disabled={pwSaving} className="btn btn-primary">
                    <Shield size={15} />
                    {pwSaving ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
