import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../store/authStore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import SiteLogo from '../components/branding/SiteLogo'
import UserAvatar from '../components/ui/UserAvatar'
import { resolveNotificationLink } from '../lib/notificationLink'
import {
  FiHome, FiUsers, FiCalendar, FiDollarSign, FiBriefcase,
  FiFolder, FiBarChart2, FiSettings, FiLogOut, FiMenu, FiBell,
  FiUser, FiCheckSquare, FiCreditCard, FiLayers, FiTrendingUp, FiClipboard, FiPieChart, FiBook, FiChevronDown, FiChevronRight,
  FiDownload, FiSearch,
  FiServer, FiZap, FiShield, FiFileText as FiQuote, FiTarget, FiVideo
} from 'react-icons/fi'

// Distinct Color Styles for Main Categories to give high visual clarity (Light Theme)
const categoryStyles = [
  { bgOpen: 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-xs', bgClosed: 'bg-orange-50/80 hover:bg-orange-100/90 text-slate-800 border-l-4 border-orange-500', dot: 'bg-orange-500' },
  { bgOpen: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs', bgClosed: 'bg-blue-50/80 hover:bg-blue-100/90 text-slate-800 border-l-4 border-blue-500', dot: 'bg-blue-500' },
  { bgOpen: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs', bgClosed: 'bg-emerald-50/80 hover:bg-emerald-100/90 text-slate-800 border-l-4 border-emerald-500', dot: 'bg-emerald-500' },
  { bgOpen: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs', bgClosed: 'bg-purple-50/80 hover:bg-purple-100/90 text-slate-800 border-l-4 border-purple-500', dot: 'bg-purple-500' },
  { bgOpen: 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-xs', bgClosed: 'bg-amber-50/80 hover:bg-amber-100/90 text-slate-800 border-l-4 border-amber-500', dot: 'bg-amber-500' },
  { bgOpen: 'bg-gradient-to-r from-cyan-600 to-sky-600 text-white shadow-xs', bgClosed: 'bg-cyan-50/80 hover:bg-cyan-100/90 text-slate-800 border-l-4 border-cyan-500', dot: 'bg-cyan-500' },
  { bgOpen: 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-xs', bgClosed: 'bg-rose-50/80 hover:bg-rose-100/90 text-slate-800 border-l-4 border-rose-500', dot: 'bg-rose-500' },
]

const adminNav = [
  {
    group: 'Dashboard & Overview',
    items: [
      { to: '/admin', label: 'Main Dashboard', icon: FiHome, exact: true },
      { to: '/admin/enterprise-dashboard', label: 'KPI Summary', icon: FiPieChart },
      { to: '/admin/analytics', label: 'Analytics & Reports', icon: FiBarChart2 },
      { to: '/admin/ai-analyzer', label: 'AI Site Inspection', icon: FiZap },
    ]
  },
  {
    group: 'Projects & Sites',
    items: [
      { to: '/admin/projects', label: 'All Projects', icon: FiFolder },
      { to: '/admin/boq-projects', label: 'BOQ & Estimates', icon: FiLayers },
      { to: '/admin/daily-diary', label: 'Daily Site Reports', icon: FiClipboard },
      { to: '/admin/work-logs', label: 'Task Board', icon: FiCheckSquare },
      { to: '/admin/inventory', label: 'Material & Stock', icon: FiLayers },
      { to: '/admin/agreements', label: 'Contracts & Agreements', icon: FiShield },
      { to: '/admin/quotations', label: 'Quotations', icon: FiQuote },
      { to: '/admin/invoices', label: 'Invoices & Billing', icon: FiCreditCard },
    ]
  },
  {
    group: 'Staff & Payroll',
    items: [
      { to: '/admin/employees', label: 'Employees & Staff', icon: FiUsers },
      { to: '/admin/payroll-hr', label: 'Payroll Summary', icon: FiDollarSign },
      { to: '/admin/attendance', label: 'Daily Attendance', icon: FiClipboard },
      { to: '/admin/leaves', label: 'Leave Requests', icon: FiCalendar },
      { to: '/admin/payroll', label: 'Calculate Payroll', icon: FiCreditCard },
      { to: '/admin/epf', label: 'EPF & ETF Reports', icon: FiTrendingUp },
      { to: '/admin/advances', label: 'Salary Advances', icon: FiDollarSign },
    ]
  },
  {
    group: 'Accounts & Finance',
    items: [
      { to: '/admin/finance-ledger', label: 'Finance & VAT', icon: FiDollarSign },
      { to: '/admin/finance-entries', label: 'Income & Expenses', icon: FiClipboard },
      { to: '/admin/financial', label: 'Site Profits', icon: FiPieChart },
      { to: '/admin/financial-reports', label: 'Profit & Loss Reports', icon: FiBarChart2 },
      { to: '/admin/petty-cash', label: 'Petty Cash', icon: FiCreditCard },
      { to: '/admin/cheques', label: 'Cheques', icon: FiTarget },
      { to: '/admin/bank-management', label: 'Bank Accounts', icon: FiBarChart2 },
    ]
  },
  {
    group: 'Machinery & Vehicles',
    items: [
      { to: '/admin/assets-fleet', label: 'Vehicles & Machinery', icon: FiServer },
    ]
  },
  {
    group: 'Approvals & Documents',
    items: [
      { to: '/admin/approval-system', label: 'Multi-Level Approvals', icon: FiShield },
      { to: '/admin/document-manager', label: 'CAD Drawings & Docs', icon: FiBook },
      { to: '/admin/reports-export', label: 'Export Reports', icon: FiDownload },
    ]
  },
  {
    group: 'Leads & Settings',
    items: [
      { to: '/admin/crm-leads', label: 'Customer Leads', icon: FiUsers },
      { to: '/admin/log-centre', label: 'System Logs', icon: FiShield },
      { to: '/admin/meetings', label: 'Site Meetings', icon: FiVideo },
      { to: '/admin/requests', label: 'User Requests', icon: FiClipboard },
      { to: '/admin/settings', label: 'System Settings', icon: FiSettings },
    ]
  }
]

const pmNav = [
  {
    group: 'PM Operations',
    items: [
      { to: '/manager', label: 'PM Dashboard', icon: FiHome, exact: true },
      { to: '/manager/projects', label: 'Active Projects', icon: FiFolder },
      { to: '/manager/work-logs', label: 'Task Assignments', icon: FiCheckSquare },
      { to: '/manager/quotations', label: 'Quotations & BOQ', icon: FiQuote },
      { to: '/manager/agreements', label: 'Contracts', icon: FiShield },
      { to: '/manager/daily-diary', label: 'Daily Site Reports', icon: FiClipboard },
      { to: '/manager/attendance', label: 'Attendance', icon: FiClipboard },
      { to: '/manager/inventory', label: 'Material Stock', icon: FiLayers },
    ]
  }
]

const supervisorNav = [
  {
    group: 'Site Operations',
    items: [
      { to: '/supervisor', label: 'Supervisor Dashboard', icon: FiHome, exact: true },
      { to: '/supervisor/work-logs', label: 'Site Tasks', icon: FiCheckSquare },
      { to: '/supervisor/attendance', label: 'Attendance', icon: FiClipboard },
      { to: '/supervisor/daily-diary', label: 'Daily Site Report', icon: FiBook },
      { to: '/supervisor/inventory', label: 'Stock & Transfers', icon: FiLayers },
      { to: '/supervisor/petty-cash', label: 'Petty Cash Log', icon: FiCreditCard },
    ]
  }
]

const accountantNav = [
  {
    group: 'Accounts Operations',
    items: [
      { to: '/accountant', label: 'Accounts Dashboard', icon: FiHome, exact: true },
      { to: '/accountant/payroll', label: 'Payroll Engine', icon: FiDollarSign },
      { to: '/accountant/inventory', label: 'Stock Audit', icon: FiShield },
      { to: '/accountant/price-index', label: 'Supplier Prices', icon: FiTrendingUp },
      { to: '/accountant/petty-cash', label: 'Petty Cash Audits', icon: FiCreditCard },
    ]
  }
]

const workerNav = [
  {
    group: 'My Worker Portal',
    items: [
      { to: '/worker', label: 'My Wages', icon: FiHome, exact: true },
      { to: '/worker/work-logs', label: 'My Tasks', icon: FiCheckSquare },
      { to: '/worker/advances', label: 'Salary Advances', icon: FiCreditCard },
      { to: '/worker/attendance', label: 'My Attendance', icon: FiClipboard },
    ]
  }
]

const subcontractorNav = [
  {
    group: 'Subcontractor Portal',
    items: [
      { to: '/subcontractor', label: 'Payment Claims', icon: FiHome, exact: true },
      { to: '/subcontractor/agreements', label: 'Contracts', icon: FiShield },
    ]
  }
]

const supplierNav = [
  {
    group: 'Supplier Portal',
    items: [
      { to: '/supplier', label: 'Orders & Deliveries', icon: FiHome, exact: true },
    ]
  }
]

const clientNav = [
  {
    group: 'Client Owner Portal',
    items: [
      { to: '/client', label: 'Site Progress', icon: FiHome, exact: true },
      { to: '/client/escrow', label: 'Payments & Bills', icon: FiDollarSign },
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
  const location = useLocation()
  const qc = useQueryClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const [searchQuery, setSearchQuery] = useState('')

  // Accordion state: DEFAULT ALL SUB-CATEGORIES ARE HIDDEN (false)
  const [openCategories, setOpenCategories] = useState({})

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

  // Expand category containing the active page route
  useEffect(() => {
    if (!navGroups) return
    const currentPath = location.pathname
    const newOpen = { ...openCategories }
    let changed = false
    navGroups.forEach(group => {
      const hasActive = group.items.some(item => 
        item.exact ? currentPath === item.to : currentPath.startsWith(item.to)
      )
      if (hasActive && !newOpen[group.group]) {
        newOpen[group.group] = true
        changed = true
      }
    })
    if (changed) {
      setOpenCategories(newOpen)
    }
  }, [location.pathname, navGroups])

  const toggleCategory = (groupName) => {
    setOpenCategories(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }))
  }

  const handleLogout = () => {
    localStorage.removeItem('raxwo-auth')
    window.location.href = '/'
  }

  const renderSidebar = () => (
    <div className="h-full flex flex-col bg-white border-r border-slate-200 overflow-hidden text-slate-800">
      {/* Logo */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70">
        <div>
          <SiteLogo to="/" variant="light" />
          <p className="text-orange-600 text-xs font-semibold capitalize mt-1 pl-0.5">R A Creations | {user?.role || 'Admin'} Portal</p>
        </div>
      </div>

      {/* Nav with Distinct Visual Main Category Colors & Collapsible Subcategories */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {navGroups.map((group, idx) => {
          const isOpen = !!openCategories[group.group]
          const style = categoryStyles[idx % categoryStyles.length]

          return (
            <div key={group.group} className="rounded-xl overflow-hidden border border-slate-200 shadow-2xs bg-white">
              {/* Main Category Header with Distinct Visual Color */}
              <button
                onClick={() => toggleCategory(group.group)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-black tracking-wide transition-all text-left cursor-pointer ${
                  isOpen ? style.bgOpen : style.bgClosed
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-white' : style.dot} shrink-0 shadow-2xs`}></span>
                  <span className="truncate uppercase tracking-wider">{group.group}</span>
                </div>
                <span className={`ml-2 shrink-0 p-1 rounded-md ${isOpen ? 'bg-black/20' : 'bg-slate-200/70'}`}>
                  {isOpen ? <FiChevronDown size={14} className="text-white" /> : <FiChevronRight size={14} className="text-slate-600" />}
                </span>
              </button>

              {/* Sub-categories (Hidden by default, shown when expanded) */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-slate-50/90 p-1.5 space-y-1 border-t border-slate-200/80"
                  >
                    {group.items.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.exact}
                        className={({ isActive }) => 
                          `flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                            isActive 
                              ? 'bg-orange-500/10 text-orange-700 font-bold border border-orange-200 shadow-2xs' 
                              : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs'
                          }`
                        }
                        onClick={() => setSidebarOpen(false)}
                      >
                        {({ isActive }) => (
                          <>
                            <item.icon size={15} className={isActive ? 'text-orange-600' : 'text-slate-400'} />
                            <span className="truncate">{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/80">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <UserAvatar user={user} className="w-8 h-8 rounded-full flex-shrink-0" imgClassName="w-full h-full object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-slate-800 text-xs font-bold truncate">{user?.name || 'Admin User'}</p>
            <p className="text-orange-600 text-[10px] capitalize font-semibold truncate">{user?.role || 'administrator'}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 transition-colors p-1" title="Logout">
            <FiLogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-800">
      {/* Desktop Sidebar */}
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
        className={`lg:hidden fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] z-50 bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebar()}
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0 relative z-10">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs flex-shrink-0 relative z-[220]">
          <button className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-orange-600" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <FiMenu size={22} />
          </button>

          <div className="flex-1 px-4 max-w-xl flex items-center justify-end sm:justify-start">
            <div className="relative hidden sm:block w-full">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects, BOQ, documents, employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-orange-700 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-200 shadow-xs">
              R A Creations / R A Constructions
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-100 p-4 md:p-6 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
