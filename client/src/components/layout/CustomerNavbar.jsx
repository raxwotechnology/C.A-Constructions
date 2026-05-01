import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Calendar, Package, LayoutDashboard, UserCircle, Building2, Bell, Menu, X, CheckCircle, Info, Cake } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationAPI } from '../../api';

const navLinks = [
  { name: 'Dashboard', path: '/customer/dashboard', icon: LayoutDashboard },
  { name: 'My Appointments', path: '/customer/appointments', icon: Calendar },
  { name: 'Services', path: '/customer/services', icon: Package },
  { name: 'Profile', path: '/customer/profile', icon: UserCircle },
];

export default function CustomerNavbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);
  const qc = useQueryClient();

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.getAll().then(r => r.data.data),
    refetchInterval: 60000
  });
  const notifications = notifData || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markRead = useMutation({
    mutationFn: notificationAPI.markAsRead,
    onSuccess: () => qc.invalidateQueries(['notifications'])
  });

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/customer/login');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10"
      style={{ background: 'linear-gradient(90deg, #080344 0%, #1a0a6b 50%, #0d0454 100%)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <div>
              <p className="font-black text-white text-base leading-none" style={{ fontFamily: 'Poppins,sans-serif', letterSpacing: '-0.02em' }}>Raxwo</p>
              <p className="text-white/35 text-[9px] uppercase tracking-widest">Technologies</p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'text-white/55 hover:text-white hover:bg-white/08'
                  }`}
                >
                  <link.icon size={15} />
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Discount pill */}
            {user?.discount > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-amber-300 border border-amber-400/30"
                style={{ background: 'rgba(251,191,36,0.12)' }}>
                ⭐ {user.discount}% OFF
              </div>
            )}

            {/* Notification */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => setShowNotif(!showNotif)} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all relative">
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full shadow-sm border-2 border-slate-900" />
                )}
              </button>
              
              {showNotif && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl z-50 overflow-hidden border border-slate-100 shadow-2xl animate-in">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">Notifications</h3>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{unreadCount} new</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-sm">No notifications yet.</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n._id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-slate-50/50' : ''}`}>
                          <div className="flex gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === 'birthday' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                              {n.type === 'birthday' ? <Cake size={14} /> : <Info size={14} />}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className={`text-sm text-slate-800 ${!n.isRead ? 'font-bold' : 'font-medium'}`}>{n.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                            </div>
                            {!n.isRead && (
                              <button onClick={() => markRead.mutate(n._id)} className="text-slate-400 hover:text-green-500" title="Mark as read">
                                <CheckCircle size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User avatar */}
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-xl hover:bg-white/10 transition-all">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#534AB7,#080344)' }}>
                  {user?.fullName?.charAt(0) || 'C'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-bold text-white leading-tight">{user?.fullName?.split(' ')[0]}</p>
                  <p className="text-[10px] text-white/40">Customer</p>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl overflow-hidden z-50 border border-slate-100"
                  style={{ boxShadow: '0 16px 48px rgba(8,3,68,0.18)' }}>
                  <div className="p-4 bg-gradient-to-br from-navy to-brand-700 text-white" style={{ background: 'linear-gradient(135deg,#080344,#534AB7)' }}>
                    <p className="font-bold text-sm">{user?.fullName}</p>
                    <p className="text-white/55 text-xs">{user?.phone}</p>
                  </div>
                  <div className="py-1.5">
                    {navLinks.map(l => (
                      <Link key={l.path} to={l.path} onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <l.icon size={14} className="text-slate-400" /> {l.name}
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 py-1.5">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors">
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
              onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 py-3 space-y-1">
            {navLinks.map(link => {
              const isActive = location.pathname === link.path;
              return (
                <Link key={link.path} to={link.path} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white hover:bg-white/08'
                  }`}>
                  <link.icon size={16} /> {link.name}
                </Link>
              );
            })}
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-all">
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
