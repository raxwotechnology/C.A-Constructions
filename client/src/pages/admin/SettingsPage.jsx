import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsAPI } from '../../api';
import toast from 'react-hot-toast';
import {
  Save, Globe, Phone, Mail, Link as LinkIcon, Upload,
  Image, Building, AlignLeft, ChevronRight, Loader2, CheckCircle, X
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');

function Section({ icon: Icon, title, description, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg,#080344,#534AB7)' }}>
            <Icon size={18} />
          </div>
          <div>
            <h3 className="card-title">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    footerText: '',
    facebookUrl: '',
    twitterUrl: '',
    linkedinUrl: '',
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.get().then(res => res.data.data),
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        companyName:  settings.companyName  || '',
        contactEmail: settings.contactEmail || '',
        contactPhone: settings.contactPhone || '',
        footerText:   settings.footerText   || '',
        facebookUrl:  settings.facebookUrl  || '',
        twitterUrl:   settings.twitterUrl   || '',
        linkedinUrl:  settings.linkedinUrl  || '',
      });
      if (settings.logo) {
        setLogoPreview(`${API_BASE}/uploads/${settings.logo}`);
      }
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data) => settingsAPI.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
      toast.success('Settings saved successfully!');
    },
    onError: () => toast.error('Failed to save settings.'),
  });

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB.'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', logoFile);
      await settingsAPI.updateLogo(fd);
      queryClient.invalidateQueries(['settings']);
      toast.success('Logo updated successfully!');
      setLogoFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Logo upload failed.');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const set = (name, value) => setFormData(p => ({ ...p, [name]: value }));

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={28} className="animate-spin text-purple" style={{ color: '#534AB7' }} />
    </div>
  );

  return (
    <div className="space-y-6 animate-in max-w-4xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Manage your brand, contact info, and social links.</p>
        </div>
      </div>

      {/* ── Logo Upload ── */}
      <Section icon={Image} title="Company Logo" description="This logo appears in the sidebar and customer portal.">
        <div className="flex items-center gap-6 flex-wrap">
          {/* Preview */}
          <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 flex-shrink-0 relative group">
            {logoPreview ? (
              <>
                <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                <button
                  onClick={() => { setLogoPreview(null); setLogoFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={12} />
                </button>
              </>
            ) : (
              <div className="text-center">
                <Image size={24} className="text-slate-300 mx-auto mb-1" />
                <p className="text-[10px] text-slate-400">No logo</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex-1 space-y-3">
            <p className="text-sm text-slate-600">
              Upload a PNG, JPG or SVG file. Recommended size: <strong>256×256px</strong> or larger. Max <strong>5 MB</strong>.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" id="logo-upload" />
              <label htmlFor="logo-upload"
                className="btn btn-secondary cursor-pointer">
                <Upload size={15} /> Choose Image
              </label>
              {logoFile && (
                <button onClick={handleLogoUpload} disabled={logoUploading}
                  className="btn btn-primary">
                  {logoUploading
                    ? <><Loader2 size={15} className="animate-spin" /> Uploading...</>
                    : <><CheckCircle size={15} /> Upload Logo</>}
                </button>
              )}
              {logoFile && (
                <p className="text-xs text-slate-500">
                  Selected: <strong>{logoFile.name}</strong> ({(logoFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Company Info ── */}
      <Section icon={Building} title="Company Information" description="Basic contact details shown in the customer portal footer.">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input type="text" value={formData.companyName}
                onChange={e => set('companyName', e.target.value)}
                className="form-input" placeholder="Raxwo Technologies" />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Email</label>
              <input type="email" value={formData.contactEmail}
                onChange={e => set('contactEmail', e.target.value)}
                className="form-input" placeholder="info@raxwo.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input type="text" value={formData.contactPhone}
                onChange={e => set('contactPhone', e.target.value)}
                className="form-input" placeholder="+92 300 0000000" />
            </div>
            <div className="form-group md:col-span-2">
              <label className="form-label">Footer Description</label>
              <textarea value={formData.footerText}
                onChange={e => set('footerText', e.target.value)}
                className="form-textarea" rows={3}
                placeholder="A short tagline shown in the customer portal footer..." />
            </div>
          </div>

          {/* Social links */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Social Media Links</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'facebookUrl', label: 'Facebook URL', icon: LinkIcon, placeholder: 'https://facebook.com/...' },
                { key: 'twitterUrl',  label: 'Twitter / X URL', icon: LinkIcon, placeholder: 'https://twitter.com/...' },
                { key: 'linkedinUrl', label: 'LinkedIn URL', icon: LinkIcon, placeholder: 'https://linkedin.com/...' },
              ].map(({ key, label, icon: Icon, placeholder }) => (
                <div key={key} className="form-group">
                  <label className="form-label flex items-center gap-2">
                    <Icon size={12} /> {label}
                  </label>
                  <input type="url" value={formData[key]}
                    onChange={e => set(key, e.target.value)}
                    className="form-input" placeholder={placeholder} />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button type="submit" disabled={updateMutation.isPending} className="btn btn-primary">
              {updateMutation.isPending
                ? <><Loader2 size={15} className="animate-spin" /> Saving...</>
                : <><Save size={15} /> Save All Settings</>}
            </button>
          </div>
        </form>
      </Section>
    </div>
  );
}
