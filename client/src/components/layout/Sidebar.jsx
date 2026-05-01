import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, FolderKanban, Clock, DollarSign, Calendar,
  BarChart2, Package, Share2, Settings, LogOut, ChevronDown, ChevronRight,
  UserCircle, Building2, ShieldCheck
} from 'lucide-react';
import { useState } from 'react';

const adminNav = [
  { label: 'Overview', icon: LayoutDashboard, to: '/dashboard' },
  {
    label: 'People', icon: Users, children: [
      { label: 'Developers', to: '/employees/developers' },
      { label: 'Managers', to: '/employees/managers' },
      { label: 'Marketing Designers', to: '/employees/marketing-designers' },
    ]
  },
  {
    label: 'Projects', icon: FolderKanban, children: [
      { label: 'All Projects', to: '/projects' },
      { label: 'Timeline', to: '/projects/timeline' },
    ]
  },
  {
    label: 'Attendance', icon: Clock, children: [
      { label: 'Records', to: '/attendance' },
      { label: 'AI Verifier', to: '/attendance/ai-verifier' },
    ]
  },
  {
    label: 'Payroll & Salary', icon: DollarSign, children: [
      { label: 'Dashboard', to: '/salary' },
      { label: 'Process Payroll', to: '/salary/payroll' },
      { label: 'Overtime', to: '/salary/overtime' },
      { label: 'Reports', to: '/salary/reports' },
    ]
  },
  {
    label: 'CRM', icon: Calendar, children: [
      { label: 'Appointments', to: '/appointments' },
      { label: 'Customers', to: '/customers' },
      { label: 'Services', to: '/appointments/services' },
    ]
  },
  {
    label: 'Finance', icon: BarChart2, children: [
      { label: 'Reports', to: '/financial' },
      { label: 'Revenue', to: '/financial/revenue' },
      { label: 'Expenses', to: '/financial/expenses' },
    ]
  },
  { label: 'Products', icon: Package, to: '/products' },
  { label: 'Social Media', icon: Share2, to: '/social' },
  { label: 'Analytics', icon: BarChart2, to: '/analytics' },
  { label: 'Settings', icon: Settings, to: '/settings' },
];

const employeeNav = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'My Projects', icon: FolderKanban, to: '/projects' },
  { label: 'Attendance', icon: Clock, to: '/attendance' },
  { label: 'Salary', icon: DollarSign, to: '/salary' },
  { label: 'Profile', icon: UserCircle, to: '/profile' },
];

function NavItem({ item }) {
  const [open, setOpen] = useState(false);

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="sidebar-item w-full"
        >
          <item.icon size={16} className="flex-shrink-0 opacity-80" />
          <span className="flex-1 text-left">{item.label}</span>
          {open ? <ChevronDown size={13} className="opacity-60" /> : <ChevronRight size={13} className="opacity-60" />}
        </button>
        {open && (
          <div className="ml-8 mt-1 space-y-0.5 border-l border-white/10 pl-4">
            {item.children.map(child => (
              <NavLink
                key={child.to}
                to={child.to}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'text-white bg-white/12 font-semibold'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/6'
                  }`
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
    >
      <item.icon size={16} className="flex-shrink-0 opacity-80" />
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const navItems = isAdmin ? adminNav : employeeNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = {
    admin: 'Administrator',
    developer: 'Developer',
    manager: 'Manager',
    marketing_designer: 'Marketing Designer',
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="px-5 py-5 flex-shrink-0 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Building2 size={17} className="text-white" />
          </div>
          <div>
            <p className="font-black text-white text-base leading-tight tracking-tight" style={{fontFamily:'Poppins,sans-serif'}}>Raxwo</p>
            <p className="text-[10px] text-white/40 leading-tight">Technologies</p>
          </div>
          <div className="ml-auto">
            <ShieldCheck size={14} className="text-green-400/70" />
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto space-y-0.5">
        {navItems.map((item) => (
          <NavItem key={item.label} item={item} />
        ))}
      </nav>

      {/* User footer */}
      <div className="flex-shrink-0 p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/08 transition-colors cursor-default">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-lg"
            style={{ background: 'linear-gradient(135deg,#534AB7,#080344)' }}>
            {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white truncate">{user?.fullName}</p>
            <p className="text-[11px] text-white/45 truncate">{roleLabel[user?.userType] || user?.userType}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
