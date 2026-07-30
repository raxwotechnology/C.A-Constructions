import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../store/authStore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import SiteLogo from '../components/branding/SiteLogo'
import UserAvatar from '../components/ui/UserAvatar'
import { resolveNotificationLink } from '../lib/notificationLink'
import {
  FiHome, FiUsers, FiCalendar, FiDollarSign, FiFileText, FiBriefcase,
  FiFolder, FiBarChart2, FiSettings, FiLogOut, FiMenu, FiX, FiBell,
  FiUser, FiCheckSquare, FiCreditCard, FiLayers, FiTrendingUp, FiClipboard, FiPieChart, FiMessageSquare, FiBook, FiChevronDown, FiChevronRight,
  FiDownload, FiSearch,
  FiGift, FiServer, FiZap, FiMapPin, FiShield, FiFileText as FiQuote, FiTarget, FiKey, FiMail, FiVideo
} from 'react-icons/fi'
import toast from 'react-hot-toast'

const adminNav = [
  {
    group: 'Overview & Analytics',
    items: [
      { to: '/admin', label: 'Executive Pulse Dashboard', icon: FiHome, exact: true },
      { to: '/admin/enterprise-dashboard', label: 'Executive KPI Dashboard', icon: FiPieChart },
      { to: '/admin/analytics', label: 'Analytics & Trends', icon: FiBarChart2 },
      { to: '/admin/ai-analyzer', label: 'Forensic AI Analyzer', icon: FiZap },
    ]
  },
  {
    group: 'Construction & Site Operations',
    items: [
      { to: '/admin/projects', label: 'Construction Sites & Projects', icon: FiFolder },
      { to: '/admin/boq-projects', label: 'SLS 573 BOQ Breakdown', icon: FiLayers },
      { to: '/admin/daily-diary', label: 'Daily Site Report (DSR)', icon: FiClipboard },
      { to: '/admin/work-logs', label: 'Task Board & Work Logs', icon: FiCheckSquare },
      { to: '/admin/inventory', label: 'Warehouse & Site Stock', icon: FiLayers },
      { to: '/admin/agreements', label: 'SBD-03 Legal Contracts', icon: FiShield },
      { to: '/admin/quotations', label: 'BOQ Quotations Generator', icon: FiQuote },
      { to: '/admin/invoices', label: 'Site Invoices & Billing', icon: FiCreditCard },
    ]
  },
  {
    group: 'Human Resources & Payroll',
    items: [
      { to: '/admin/employees', label: 'Engineers & Labour Profiles', icon: FiUsers },
      { to: '/admin/payroll-hr', label: 'Sri Lanka Statutory Payroll', icon: FiDollarSign },
      { to: '/admin/attendance', label: 'GPS Photo Attendance', icon: FiClipboard },
      { to: '/admin/leaves', label: 'Leave Requests', icon: FiCalendar },
      { to: '/admin/payroll', label: 'Automated Payroll Engine', icon: FiCreditCard },
      { to: '/admin/epf', label: 'EPF (8%/12%) & ETF (3%)', icon: FiTrendingUp },
      { to: '/admin/advances', label: 'Advances & Receipts', icon: FiDollarSign },
    ]
  },
  {
    group: 'Finance & Accounts',
    items: [
      { to: '/admin/finance-ledger', label: 'Double-Entry Finance & VAT', icon: FiDollarSign },
      { to: '/admin/finance-entries', label: 'Income & Expense Entries', icon: FiClipboard },
      { to: '/admin/financial', label: 'Site Profitability & Expenses', icon: FiPieChart },
      { to: '/admin/financial-reports', label: 'Financial Statements (P&L)', icon: FiBarChart2 },
      { to: '/admin/petty-cash', label: 'Site Petty Cash', icon: FiCreditCard },
      { to: '/admin/cheques', label: 'Cheque Realization', icon: FiTarget },
      { to: '/admin/bank-management', label: 'Bank Accounts Management', icon: FiBarChart2 },
    ]
  },
  {
    group: 'Machinery & Equipment',
    items: [
      { to: '/admin/assets-fleet', label: 'Heavy Plant & Vehicles', icon: FiServer },
    ]
  },
  {
    group: 'Approvals & Documents',
    items: [
      { to: '/admin/approval-system', label: 'Central Approval Deck', icon: FiShield },
      { to: '/admin/document-manager', label: 'CAD Drawings & Documents', icon: FiBook },
      { to: '/admin/reports-export', label: '1-Click Reports Export', icon: FiDownload },
    ]
  },
  {
    group: 'CRM & System Settings',
    items: [
      { to: '/admin/crm-leads', label: 'CRM & Customer Leads', icon: FiUsers },
      { to: '/admin/log-centre', label: 'System Audit Logs', icon: FiShield },
      { to: '/admin/meetings', label: 'Site Meetings', icon: FiVideo },
      { to: '/admin/requests', label: 'System Requests', icon: FiClipboard },
      { to: '/admin/settings', label: 'Company Settings', icon: FiSettings },
    ]
  }
]

const pmNav = [
  {
    group: 'PM Operations',
    items: [
      { to: '/manager', label: 'PM Dashboard', icon: FiHome, exact: true },
      { to: '/manager/projects', label: 'Active Sites', icon: FiFolder },
      { to: '/manager/work-logs', label: 'Task Assignments', icon: FiCheckSquare },
      { to: '/manager/quotations', label: 'Auto BOQ Generator', icon: FiQuote },
      { to: '/manager/agreements', label: 'SBD-03 Legal Contracts', icon: FiShield },
      { to: '/manager/daily-diary', label: 'Daily Site Report (DSR)', icon: FiClipboard },
      { to: '/manager/attendance', label: 'Attendance & Conflicts', icon: FiClipboard },
      { to: '/manager/inventory', label: 'Site Material Stock', icon: FiLayers },
    ]
  }
]

const supervisorNav = [
  {
    group: 'Supervisor Operations',
    items: [
      { to: '/supervisor', label: 'Action Cards Deck', icon: FiHome, exact: true },
      { to: '/supervisor/work-logs', label: 'Site Task Board', icon: FiCheckSquare },
      { to: '/supervisor/attendance', label: 'Photo & GPS Attendance', icon: FiClipboard },
      { to: '/supervisor/daily-diary', label: 'Daily Site Report (DSR)', icon: FiBook },
      { to: '/supervisor/inventory', label: 'Stock & Transfers', icon: FiLayers },
      { to: '/supervisor/petty-cash', label: 'Site Petty Cash Log', icon: FiCreditCard },
    ]
  }
]

const accountantNav = [
  {
    group: 'Finance & Accounts Deck',
    items: [
      { to: '/accountant', label: 'Payroll & Finance Deck', icon: FiHome, exact: true },
      { to: '/accountant/payroll', label: '3-Min Automated Payroll', icon: FiDollarSign },
      { to: '/accountant/inventory', label: 'GRN Variance Warnings', icon: FiShield },
      { to: '/accountant/price-index', label: 'Supplier Price Alerts', icon: FiTrendingUp },
      { to: '/accountant/petty-cash', label: 'Petty Cash Audits', icon: FiCreditCard },
    ]
  }
]

const workerNav = [
  {
    group: 'Worker Portal',
    items: [
      { to: '/worker', label: 'My Wage & Heatmap', icon: FiHome, exact: true },
      { to: '/worker/work-logs', label: 'My Task Panel', icon: FiCheckSquare },
      { to: '/worker/advances', label: 'Advances & Receipts', icon: FiCreditCard },
      { to: '/worker/attendance', label: 'My Attendance', icon: FiClipboard },
    ]
  }
]

const subcontractorNav = [
  {
    group: 'Sub-Contractor Deck',
    items: [
      { to: '/subcontractor', label: 'Claim Progress Pipeline', icon: FiHome, exact: true },
      { to: '/subcontractor/agreements', label: 'SBD-03 Court Agreements', icon: FiShield },
    ]
  }
]

const supplierNav = [
  {
    group: 'Supplier Deck',
    items: [
      { to: '/supplier', label: 'Digital GRN & PO Tracker', icon: FiHome, exact: true },
    ]
  }
]

const clientNav = [
  {
    group: 'Client Owner Deck',
    items: [
      { to: '/client', label: 'Live Progress Tracker', icon: FiHome, exact: true },
      { to: '/client/escrow', label: 'Escrow & Variations', icon: FiDollarSign },
    ]
  }
]

const navMap = {
  admin: adminNav,
  manager: pmNav,
  supervisor: supervisorNav,
  accountant: accountantNav,
  worker: workerNav,
  subcontractor: subcontractorNav,
  supplier: supplierNav,
  client: clientNav,
  developer: workerNav,
  designer: workerNav,
  marketing: workerNav,
}

export default function DashboardLayout({ role }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const notifButtonRef = useRef(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchBox, setShowSearchBox] = useState(false)
  const searchBoxRef = useRef(null)

  // Accordion state for collapsible main categories
  const [openCategories, setOpenCategories] = useState({
    'Overview & Analytics': true,
    'Construction & Site Operations': true,
    'Human Resources & Payroll': true,
    'Finance & Accounts': true,
    'Machinery & Equipment': true,
    'Approvals & Documents': true,
    'CRM & System Settings': true,
    'PM Operations': true,
    'Supervisor Operations': true,
    'Finance & Accounts Deck': true,
  })

  const toggleCategory = (groupName) => {
    setOpenCategories(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }))
  }

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/system-metrics/notifications').then(r => r.data),
    refetchInterval: 30000,
  })

  const notifications = notifData?.notifications || []
  const unreadCount = notifications.filter(n => !n.read).length

  const handleNotificationClick = async (n) => {
    const finalRole = user?.role || role
    try {
      if (!n.read) {
        await api.put(`/system-metrics/notifications/${n._id}/read`)
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
    localStorage.removeItem('raxwo-auth')
    window.location.href = '/'
  }

  const baseNavGroups = navMap[user?.role] || navMap[role] || navMap.admin
  const navGroups = useMemo(() => {
    if (user?.allowedTabs && user.allowedTabs.length > 0) {
      return baseNavGroups.map(group => ({
        ...group,
        items: group.items.filter(item => {
          const tabKey = item.to.split('/').pop()
          return user.allowedTabs.includes(tabKey) || item.exact
        })
      })).filter(group => group.items.length > 0)
    }
    return baseNavGroups
  }, [user, role, baseNavGroups])

  const renderSidebar = () => (
    <div className="h-full flex flex-col bg-white border-r border-slate-200 overflow-hidden text-slate-800">
      {/* Logo */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/50">
        <div>
          <SiteLogo to="/" variant="light" />
          <p className="text-slate-500 text-xs font-medium capitalize mt-1.5 pl-1">R A Creations | {user?.role} Portal</p>
        </div>
      </div>

      {/* Nav with Collapsible Categories */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {navGroups.map(group => {
          const isOpen = openCategories[group.group] !== false
          return (
            <div key={group.group} className="border-b border-slate-100 pb-2">
              <button
                onClick={() => toggleCategory(group.group)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 transition-colors"
              >
                <span>{group.group}</span>
                {isOpen ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
              </button>

              {isOpen && (
                <div className="mt-1 space-y-0.5 pl-1">
                  {group.items.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.exact}
                      className={({ isActive }) => 
                        `flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                          isActive 
                            ? 'bg-orange-600 text-white shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`
                      }
                      onClick={() => setSidebarOpen(false)}
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon size={15} className={isActive ? 'text-white' : 'text-slate-400'} />
                          <span className="truncate">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-sm">
          <UserAvatar user={user} className="w-8 h-8 rounded-full flex-shrink-0" imgClassName="w-full h-full object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-slate-900 text-xs font-bold truncate">{user?.name}</p>
            <p className="text-slate-500 text-[10px] capitalize truncate">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 transition-colors p-1" title="Logout">
            <FiLogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* Desktop Widen Sidebar (w-72 / 280px) */}
      <aside className="hidden lg:block w-72 flex-shrink-0 bg-white border-r border-slate-200 shadow-sm">
        {renderSidebar()}
      </aside>

      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] z-50 shadow-2xl transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebar()}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0 relative z-10">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs flex-shrink-0 relative z-[220]">
          <button className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-cyan-600" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <FiMenu size={22} />
          </button>

          <div className="flex-1 px-4 max-w-xl flex items-center justify-end sm:justify-start">
            <div className="relative hidden sm:block w-full">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects, BOQ, employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              R A Creations / R A Constructions
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
