import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../api';
import { Building2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '', userType: 'customer' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.register(form);
      if (res.data.success) {
        toast.success('Account created! Please login.');
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-navy rounded-xl flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <p className="font-black text-navy">Raxwo Technologies</p>
              <p className="text-xs text-gray-500">Create your account</p>
            </div>
          </div>

          {error && <div className="alert-error mb-4"><span>⚠</span><span>{error}</span></div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Your full name" className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="your@email.com" className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="Your phone number" className="form-input" required />
            </div>
            <div className="form-group">
              <label className="form-label">Account Type</label>
              <select name="userType" value={form.userType} onChange={handleChange} className="form-select">
                <option value="customer">Customer</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Min 6 characters" className="form-input" required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Repeat password" className="form-input" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center h-11">
              {loading ? <><Loader2 size={15} className="animate-spin" /> Creating account...</> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-navy font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
