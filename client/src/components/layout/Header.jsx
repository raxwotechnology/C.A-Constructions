import { Bell, ChevronDown, Settings, User, LogOut, Search, X, CheckCircle, Info, Cake } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationAPI } from '../../api';

export default function Header({ title, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropRef = useRef(null);
  const notifRef = useRef(null);
  const [showNotif, setShowNotif] = useState(false);
  const qc = useQueryClient();

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.getAll().then(r => r.data.data),
    refetchInterval: 60000 // refresh every minute
  });
  const notifications = notifData || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markRead = useMutation({
    mutationFn: notificationAPI.markAsRead,
    onSuccess: () => qc.invalidateQueries(['notifications'])
  });

  useEffect(() => {
    const handler = (e) => { 
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowDropdown(false); 
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const roleColor = {
    admin: 'from-violet-600 to-navy',
    developer: 'from-blue-500 to-cyan-600',
    manager: 'from-emerald-500 to-teal-600',
    marketing_designer: 'from-pink-500 to-rose-600',
  };
  const gradClass = roleColor[user?.userType] || 'from-navy to-brand-700';

  return (
    <header className="top-header">
      {/* Left: Page title */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-black text-navy leading-tight" style={{ fontFamily: 'Poppins,sans-serif', letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          {subtitle && <p className="text-xs text-slate-400 font-medium">{subtitle}</p>}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotif(!showNotif)}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all">
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full shadow-sm border-2 border-white" />
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
                        <div className="flex-1 min-w-0">
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

        {/* User Menu */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-all"
          >
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradClass} flex items-center justify-center text-white text-sm font-black shadow-sm`}>
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-bold text-slate-800 leading-tight">{user?.fullName?.split(' ')[0]}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{user?.userType?.replace('_',' ')}</p>
            </div>
            <ChevronDown size={13} className={`text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <div
              className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl z-50 overflow-hidden border border-slate-100"
              style={{ boxShadow: '0 16px 48px rgba(8,3,68,0.15), 0 0 0 1px rgba(83,74,183,0.05)' }}
            >
              {/* User info */}
              <div className={`p-4 bg-gradient-to-br ${gradClass} text-white`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">
                    {user?.fullName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{user?.fullName}</p>
                    <p className="text-white/65 text-[11px] truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="py-1.5">
                <button onClick={() => { navigate('/profile'); setShowDropdown(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  <User size={15} className="text-slate-400" /> My Profile
                </button>
                <button onClick={() => { navigate('/settings'); setShowDropdown(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                  <Settings size={15} className="text-slate-400" /> Settings
                </button>
              </div>
              <div className="border-t border-slate-100 py-1.5">
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors">
                  <LogOut size={15} className="text-rose-400" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
