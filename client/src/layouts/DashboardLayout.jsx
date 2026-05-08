import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../store/authStore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { mediaUrl } from '../lib/media'
import { resolveNotificationLink } from '../lib/notificationLink'
import {
  FiHome, FiUsers, FiCalendar, FiDollarSign, FiFileText, FiBriefcase,
  FiFolder, FiBarChart2, FiSettings, FiLogOut, FiMenu, FiX, FiBell,
  FiUser, FiCheckSquare, FiCreditCard, FiLayers, FiTrendingUp, FiClipboard, FiPieChart, FiMessageSquare, FiBook, FiChevronDown,
  FiDownload,
  FiGift, FiServer
} from 'react-icons/fi'
import toast from 'react-hot-toast'

const adminNav = [
  { group: 'Overview', items: [
    { to: '/admin', label: 'Dashboard', icon: FiHome, exact: true },
    { to: '/admin/analytics', label: 'Analytics', icon: FiBarChart2 },
  ]},
  { group: 'Human Resources', items: [
    { to: '/admin/employees', label: 'Employees', icon: FiUsers },
    { to: '/admin/attendance', label: 'Attendance', icon: FiClipboard },
    { to: '/admin/leaves', label: 'Leave Management', icon: FiCalendar },
    { to: '/admin/payroll', label: 'Payroll', icon: FiDollarSign },
    { to: '/admin/epf', label: 'EPF / ETF', icon: FiTrendingUp },
    { to: '/admin/letters', label: 'Letters', icon: FiFileText },
  ]},
  { group: 'Recruitment', items: [
    { to: '/admin/recruitment', label: 'Recruitment / ATS', icon: FiBriefcase },
  ]},
  { group: 'Business', items: [
    { to: '/admin/projects', label: 'Projects', icon: FiFolder },
    { to: '/admin/subscriptions', label: 'Subscriptions', icon: FiServer },
    { to: '/admin/services', label: 'Services', icon: FiLayers },
    { to: '/admin/portfolio', label: 'Portfolio', icon: FiPieChart },
    { to: '/admin/financial', label: 'Financial', icon: FiDollarSign },
    { to: '/admin/finance-entries', label: 'Income & Expenses', icon: FiClipboard },
    { to: '/admin/rewards', label: 'Rewards & Loyalty', icon: FiGift },
    { to: '/admin/exports', label: 'Exports', icon: FiDownload },
    { to: '/admin/bookings', label: 'Bookings', icon: FiBook },
    { to: '/admin/performance', label: 'Performance', icon: FiTrendingUp },
    { to: '/admin/clients', label: 'Clients', icon: FiLayers },
    { to: '/admin/invoices', label: 'Invoices', icon: FiCreditCard },
    { to: '/admin/feedback', label: 'Feedback', icon: FiMessageSquare },
  ]},
  { group: 'System', items: [
    { to: '/admin/settings', label: 'Settings', icon: FiSettings },
    { to: '/admin/messages', label: 'Messages', icon: FiMessageSquare },
  ]},
]

const managerNav = [
  { group: 'Overview', items: [
    { to: '/manager', label: 'Dashboard', icon: FiHome, exact: true },
    { to: '/manager/projects', label: 'Project Tracking', icon: FiFolder },
    { to: '/manager/team', label: 'Team Management', icon: FiUsers },
    { to: '/manager/reports', label: 'Reports', icon: FiPieChart },
    { to: '/manager/messages', label: 'Messages', icon: FiMessageSquare },
  ]},
]

const developerNav = [
  { group: 'My Workspace', items: [
    { to: '/developer', label: 'Dashboard', icon: FiHome, exact: true },
    { to: '/developer/projects', label: 'My Projects', icon: FiFolder },
    { to: '/developer/profile', label: 'My Profile', icon: FiUser },
    { to: '/developer/tasks', label: 'Assigned Tasks', icon: FiCheckSquare },
  ]},
  { group: 'Compensation', items: [
    { to: '/developer/attendance', label: 'Attendance', icon: FiClipboard },
    { to: '/developer/leaves', label: 'Leave Requests', icon: FiCalendar },
    { to: '/developer/payslips', label: 'Salary + EPF/ETF', icon: FiDollarSign },
    { to: '/developer/export', label: 'Export Center', icon: FiDownload },
    { to: '/developer/letters', label: 'Letters', icon: FiFileText },
    { to: '/developer/messages', label: 'Messages', icon: FiMessageSquare },
    { to: '/developer/notifications', label: 'Notifications', icon: FiBell },
  ]},
]

const withBasePath = (groups, basePath) =>
  groups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      to: item.to.startsWith('/developer') ? item.to.replace('/developer', basePath) : item.to,
    })),
  }))

const navMap = {
  admin: adminNav,
  manager: managerNav,
  developer: developerNav,
  designer: withBasePath(developerNav, '/designer'),
  marketing: withBasePath(developerNav, '/marketing'),
}

export default function DashboardLayout({ role }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const notifButtonRef = useRef(null)
  const [notifPos, setNotifPos] = useState({ top: 72, right: 16 })

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/analytics/notifications').then(r => r.data),
    refetchInterval: 30000,
  })

  const notifications = notifData?.notifications || []
  const unreadCount = notifications.filter(n => !n.read).length

  const handleNotificationClick = async (n) => {
    const finalRole = user?.role || role
    try {
      if (!n.read) {
        await api.put(`/analytics/notifications/${n._id}/read`)
        qc.setQueryData(['notifications'], (prev) => {
          if (!prev?.notifications) return prev
          return {
            ...prev,
            notifications: prev.notifications.map((x) => (x._id === n._id ? { ...x, read: true, readAt: new Date().toISOString() } : x)),
          }
        })
      }
    } catch (_) {}
    qc.invalidateQueries({ queryKey: ['notifications'] })
    qc.invalidateQueries({ queryKey: ['developer-notifications'] })
    qc.invalidateQueries({ queryKey: ['client-notifications-page'] })
    setShowNotif(false)
    navigate(resolveNotificationLink(n.link, finalRole, n._id))
  }

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const navGroups = navMap[user?.role] || navMap[role] || []

  useEffect(() => {
    const updateNotifPos = () => {
      const rect = notifButtonRef.current?.getBoundingClientRect()
      if (!rect) return
      const panelWidth = 320 // w-80
      const margin = 12
      const computedTop = rect.bottom + 8
      const computedLeft = Math.min(
        Math.max(margin, rect.right - panelWidth),
        window.innerWidth - panelWidth - margin
      )
      setNotifPos({
        top: Math.max(8, computedTop),
        right: Math.max(8, window.innerWidth - (computedLeft + panelWidth)),
      })
    }

    if (showNotif) {
      updateNotifPos()
      window.addEventListener('resize', updateNotifPos)
      window.addEventListener('scroll', updateNotifPos, true)
    }

    return () => {
      window.removeEventListener('resize', updateNotifPos)
      window.removeEventListener('scroll', updateNotifPos, true)
    }
  }, [showNotif])

  const renderSidebar = () => (
    <div className="h-full flex flex-col bg-white border-r border-slate-200 overflow-hidden">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-blue flex items-center justify-center shadow-blue">
            <span className="text-white font-bold font-heading">R</span>
          </div>
          <div>
            <span className="font-heading font-bold text-primary text-lg leading-none">Raxwo</span>
            <p className="text-slate-400 text-xs leading-none capitalize">{user?.role} Portal</p>
          </div>
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {navGroups.map(group => (
          <div key={group.group}>
            <p className="sidebar-group-label mb-2">{group.group}</p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={16} className={isActive ? 'text-white' : 'text-slate-500'} />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-[#000080] font-semibold text-sm flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-800 text-sm font-medium truncate">{user?.name}</p>
            <p className="text-slate-400 text-xs capitalize truncate">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Logout">
            <FiLogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0 bg-white shadow-card">
        {renderSidebar()}
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] z-50 shadow-2xl"
            >
              {renderSidebar()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0 relative z-10">
        {/* Top bar */}
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-3 sm:px-4 md:px-6 py-3 flex items-center justify-between shadow-card flex-shrink-0 relative z-[220]">
          <button className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-primary" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <FiMenu size={22} />
          </button>

          <div className="flex-1 lg:flex-none" />

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notifications */}
            <div className="relative z-[230]">
              <button
                ref={notifButtonRef}
                onClick={() => setShowNotif(!showNotif)}
                className="relative w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <FiBell size={18} className="text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotif && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="fixed w-80 card shadow-2xl z-[1000]"
                    style={{ top: `${notifPos.top}px`, right: `${notifPos.right}px` }}
                  >
                    <div className="p-4 border-b border-gray-100 flex justify-between">
                      <h3 className="font-semibold text-gray-800">Notifications</h3>
                      <span className="badge badge-blue">{unreadCount} new</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <p className="text-center text-gray-400 text-sm py-8">No notifications</p>
                      ) : notifications.slice(0, 8).map(n => (
                        <button key={n._id} type="button" onClick={() => handleNotificationClick(n)} className={`w-full text-left p-3.5 border-b border-gray-50 ${!n.read ? 'bg-blue-50 hover:bg-blue-100/70' : 'bg-white hover:bg-slate-50'}`}>
                          <p className="text-sm font-medium text-gray-800">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User profile menu */}
            <div className="relative z-[240]">
              <button
                onClick={() => setShowProfileMenu((s) => !s)}
                className="h-10 px-2 sm:px-2.5 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center gap-2 text-secondary font-semibold text-sm hover:bg-secondary/15 transition-colors"
              >
                <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
                  {user?.avatar ? <img src={mediaUrl(user.avatar)} alt={user?.name} className="w-full h-full rounded-lg object-cover" /> : user?.name?.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline max-w-[8rem] truncate">{user?.name?.split(' ')[0]}</span>
                <FiChevronDown size={14} className="hidden sm:block" />
              </button>
              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute right-0 top-12 w-52 p-2 z-[270] rounded-2xl border border-slate-200 bg-white shadow-2xl"
                  >
                    <NavLink to={['developer', 'designer', 'marketing'].includes(user?.role) ? `/${user?.role}/profile` : user?.role === 'manager' ? '/manager' : '/admin/settings'} className="btn-ghost w-full justify-start text-sm">
                      View Profile
                    </NavLink>
                    <NavLink to={['developer', 'designer', 'marketing'].includes(user?.role) ? `/${user?.role}/notifications` : user?.role === 'manager' ? '/manager/profile' : '/admin/settings'} className="btn-ghost w-full justify-start text-sm">
                      Settings
                    </NavLink>
                    <button onClick={handleLogout} className="btn-ghost w-full justify-start text-sm text-red-500 hover:text-red-600">
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5 relative z-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
