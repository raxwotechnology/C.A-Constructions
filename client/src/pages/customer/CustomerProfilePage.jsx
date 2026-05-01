import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { customerAPI } from '../../api';
import toast from 'react-hot-toast';
import {
  User, Save, Mail, Phone, MapPin, Building, Award, Star,
  Shield, Calendar, CheckCircle, Lock, Eye, EyeOff, Edit3
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

export default function CustomerProfilePage() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('info');
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    address: user?.address || '',
    companyName: user?.companyName || '',
  });

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await customerAPI.update(user._id, form);
      updateUser(res.data.data);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update.'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match.'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('Password must be at least 6 chars.'); return; }
    setPwSaving(true);
    try {
      await customerAPI.update(user._id, { password: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated successfully!');
    } catch { toast.error('Failed to update password.'); }
    finally { setPwSaving(false); }
  };

  const tabs = [
    { id: 'info', label: 'Personal Info', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your account details and security settings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Profile card */}
        <div className="lg:col-span-1 space-y-4">
          {/* Avatar card */}
          <div className="card p-6 flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-xl"
                style={{ background: 'linear-gradient(135deg, #080344 0%, #534AB7 100%)' }}>
                {user?.fullName?.charAt(0)?.toUpperCase() || 'C'}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center shadow-lg">
                <CheckCircle size={16} className="text-white" />
              </div>
            </div>

            <h2 className="text-lg font-black text-navy mt-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {user?.fullName}
            </h2>
            <p className="text-sm text-slate-500">{user?.phone}</p>
            {user?.email && <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>}

            <div className="w-full mt-4 pt-4 border-t border-slate-100 space-y-2 text-left">
              {user?.companyName && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Building size={14} className="text-slate-400" />
                  {user.companyName}
                </div>
              )}
              {user?.address && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={14} className="text-slate-400" />
                  <span className="truncate">{user.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar size={14} className="text-slate-400" />
                Customer Account
              </div>
            </div>
          </div>

          {/* Discount card */}
          {user?.discount > 0 && (
            <div className="rounded-2xl p-5 text-white relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
              <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
              <div className="relative z-10">
                <Star size={22} className="text-white mb-2" fill="white" />
                <p className="text-3xl font-black leading-none mb-1">{user.discount}%</p>
                <p className="text-sm font-bold text-white/90">Loyalty Discount</p>
                <p className="text-xs text-white/70 mt-1">Applied automatically on every booking</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Tabs + Form */}
        <div className="lg:col-span-3 space-y-5">
          {/* Tab bar */}
          <div className="flex gap-2 bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm w-fit">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  tab === t.id
                    ? 'text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                style={tab === t.id ? { background: 'linear-gradient(135deg, #080344, #534AB7)' } : {}}>
                <t.icon size={15} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Personal Info tab */}
          {tab === 'info' && (
            <div className="card">
              <div className="card-header">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #080344, #534AB7)' }}>
                    <User size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="card-title">Personal Information</h3>
                    <p className="text-xs text-slate-500">Update your profile details below.</p>
                  </div>
                </div>
                <button onClick={handleSave} disabled={saving}
                  className="btn btn-primary btn-sm">
                  <Save size={14} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              <div className="card-body">
                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FieldRow icon={User} label="Full Name">
                    <input type="text" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                      className="form-input mt-1" placeholder="Your full name" required />
                  </FieldRow>

                  <FieldRow icon={Phone} label="Phone Number (Read-only)">
                    <input type="text" value={user?.phone || ''} readOnly disabled
                      className="form-input mt-1 bg-slate-50 text-slate-400 cursor-not-allowed" />
                  </FieldRow>

                  <FieldRow icon={Mail} label="Email Address">
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                      className="form-input mt-1" placeholder="your@email.com" />
                  </FieldRow>

                  <FieldRow icon={Building} label="Company Name">
                    <input type="text" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })}
                      className="form-input mt-1" placeholder="Your company (optional)" />
                  </FieldRow>

                  <div className="md:col-span-2">
                    <FieldRow icon={MapPin} label="Address">
                      <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                        className="form-textarea mt-1" rows={3} placeholder="Your address (optional)" />
                    </FieldRow>
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
                    <p className="text-xs text-slate-500">Ensure your account is using a strong password.</p>
                  </div>
                </div>
              </div>

              <div className="card-body">
                <form onSubmit={handlePasswordChange} className="space-y-5 max-w-md">
                  {[
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
