import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { FiMenu, FiX, FiBell, FiChevronDown, FiLogOut, FiMessageSquare, FiCreditCard, FiFolder } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '../store/authStore'
import { mediaUrl } from '../lib/media'
import api from '../lib/api'
import toast from 'react-hot-toast'

const navLinks = [
  { to: '/', label: 'Home', exact: true },
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/feedback', label: 'Feedback' },
  { to: '/careers', label: 'Careers' },
  { to: '/contact', label: 'Contact' },
]

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const isClient = isAuthenticated && user?.role === 'client'

  const { data: notifData } = useQuery({
    queryKey: ['client-navbar-notifications'],
    queryFn: () => api.get('/analytics/notifications').then((r) => r.data),
    enabled: isClient,
    refetchInterval: 30000,
  })
  const notifications = notifData?.notifications || []
  const unreadCount = notifications.filter((item) => !item.read).length

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    setScrolled(window.scrollY > 10)
  }, [location.pathname])

  useEffect(() => {
    setMenuOpen(false)
    setProfileOpen(false)
    setNotifOpen(false)
  }, [location])

  const handleLogout = () => {
    logout()
    toast.success('Signed out successfully')
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-primary/95 backdrop-blur-md shadow-navy border-b border-white/15 py-3' : 'bg-transparent border-b border-transparent py-5'
      }`}>
        <div className="container-max flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-blue flex items-center justify-center shadow-blue">
              <span className="text-white font-bold text-lg font-heading">R</span>
            </div>
            <div>
              <span className="font-heading font-bold text-white text-xl leading-none">Raxwo</span>
              <p className="text-white/50 text-xs leading-none">Pvt Ltd</p>
            </div>
          </NavLink>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            {isClient ? (
              <>
                <NavLink to="/my-projects" className={({ isActive }) => `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:text-white hover:bg-white/10'}`}>
                  My Projects
                </NavLink>
                <NavLink to="/payments" className={({ isActive }) => `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:text-white hover:bg-white/10'}`}>
                  Payments
                </NavLink>
                <NavLink to="/booking" className={({ isActive }) => `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:text-white hover:bg-white/10'}`}>
                  Booking
                </NavLink>
                <NavLink to="/messages" className={({ isActive }) => `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:text-white hover:bg-white/10'}`}>
                  Messages
                </NavLink>
              </>
            ) : null}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {isClient ? (
              <>
                <div className="relative">
                  <button
                    onClick={() => setNotifOpen((s) => !s)}
                    className="relative w-10 h-10 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 flex items-center justify-center transition-colors"
                  >
                    <FiBell size={17} className="text-white" />
                    {unreadCount > 0 ? <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-semibold">{unreadCount > 9 ? '9+' : unreadCount}</span> : null}
                  </button>
                  <AnimatePresence>
                    {notifOpen ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-12 w-80 card z-50"
                      >
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                          <h4 className="font-semibold text-primary">Notifications</h4>
                          <NavLink to="/notifications" className="text-xs text-secondary hover:underline">See all</NavLink>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notifications.length === 0 ? <p className="text-sm text-slate-400 p-5 text-center">No notifications yet</p> : notifications.slice(0, 6).map((n) => (
                            <button
                              key={n._id}
                              type="button"
                              onClick={async () => {
                                try { if (!n.read) await api.put(`/analytics/notifications/${n._id}/read`) } catch (_) {}
                                setNotifOpen(false)
                                navigate(n.link || `/notifications/${n._id}`)
                              }}
                              className={`w-full text-left p-3 border-b border-slate-100/80 transition-colors ${n.read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50 hover:bg-blue-100/70'}`}
                            >
                              <p className="text-sm font-medium text-slate-800">{n.title}</p>
                              <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen((s) => !s)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-white hover:bg-white/15 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-semibold overflow-hidden">
                      {user?.avatar ? <img src={mediaUrl(user.avatar)} alt={user?.name} className="w-full h-full object-cover" /> : user?.name?.charAt(0)?.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium">{user?.name?.split(' ')[0]}</span>
                    <FiChevronDown size={14} />
                  </button>
                  <AnimatePresence>
                    {profileOpen ? (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        className="absolute right-0 top-12 w-52 p-2 z-50 rounded-2xl border border-slate-200 bg-white shadow-2xl"
                      >
                        <NavLink to="/my-projects" className="btn-ghost w-full justify-start text-sm"><FiFolder size={14} /> My Projects</NavLink>
                        <NavLink to="/payments" className="btn-ghost w-full justify-start text-sm"><FiCreditCard size={14} /> Payments</NavLink>
                        <NavLink to="/messages" className="btn-ghost w-full justify-start text-sm"><FiMessageSquare size={14} /> Messages</NavLink>
                        <NavLink to="/booking" className="btn-ghost w-full justify-start text-sm">Booking</NavLink>
                        <NavLink to="/feedback" className="btn-ghost w-full justify-start text-sm">Feedback</NavLink>
                        <NavLink to="/my-account" className="btn-ghost w-full justify-start text-sm">My Account</NavLink>
                        <button onClick={handleLogout} className="btn-ghost w-full justify-start text-sm text-red-500 hover:text-red-600"><FiLogOut size={14} /> Sign Out</button>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <NavLink to="/login" className="text-white/80 hover:text-white text-sm font-medium transition-colors px-4 py-2">
                  Sign In
                </NavLink>
                <NavLink to="/contact" className="btn-primary btn-sm">Get a Quote</NavLink>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden text-white p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-primary/98 backdrop-blur-md border-t border-white/10"
            >
              <div className="container-max py-4 flex flex-col gap-1">
                {navLinks.map(link => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.exact}
                    className={({ isActive }) =>
                      `px-4 py-2.5 rounded-lg text-sm font-medium ${isActive ? 'bg-white/15 text-white' : 'text-white/75'}`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
                {isClient ? (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                    <NavLink to="/my-projects" className="px-4 py-2.5 rounded-lg text-sm font-medium text-white/80">My Projects</NavLink>
                    <NavLink to="/payments" className="px-4 py-2.5 rounded-lg text-sm font-medium text-white/80">Payments</NavLink>
                    <NavLink to="/messages" className="px-4 py-2.5 rounded-lg text-sm font-medium text-white/80">Messages</NavLink>
                    <NavLink to="/booking" className="px-4 py-2.5 rounded-lg text-sm font-medium text-white/80">Booking</NavLink>
                    <NavLink to="/feedback" className="px-4 py-2.5 rounded-lg text-sm font-medium text-white/80">Feedback</NavLink>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-red-300">Sign Out</button>
                  </div>
                ) : (
                  <div className="flex gap-3 mt-3 pt-3 border-t border-white/10">
                    <NavLink to="/login" className="flex-1 text-center btn-outline btn-sm">Sign In</NavLink>
                    <NavLink to="/contact" className="flex-1 text-center btn-primary btn-sm">Get Quote</NavLink>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-primary text-white">
        <div className="container-max py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-blue flex items-center justify-center">
                  <span className="text-white font-bold text-lg font-heading">R</span>
                </div>
                <div>
                  <span className="font-heading font-bold text-white text-xl">Raxwo Pvt Ltd</span>
                  <p className="text-white/50 text-xs">Innovative Software Solutions</p>
                </div>
              </div>
              <p className="text-white/60 text-sm leading-relaxed max-w-sm">
                Premium software development company based in Colombo, Sri Lanka. We craft scalable, modern digital solutions for businesses worldwide.
              </p>
              <div className="flex gap-3 mt-6">
                {['LinkedIn', 'GitHub', 'Twitter'].map(s => (
                  <a key={s} href="#" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-secondary transition-colors flex items-center justify-center text-xs font-medium">
                    {s[0]}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-heading font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2">
                {['Home', 'Services', 'About', 'Portfolio', 'Careers', 'Contact'].map(link => (
                  <li key={link}>
                    <NavLink to={link === 'Home' ? '/' : `/${link.toLowerCase()}`} className="text-white/60 hover:text-white text-sm transition-colors">
                      {link}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-heading font-semibold text-white mb-4">Contact Us</h4>
              <ul className="space-y-3 text-sm text-white/60">
                <li>📍 123 Galle Road, Colombo 03, Sri Lanka</li>
                <li>📞 +94 11 234 5678</li>
                <li>✉️ hello@raxwo.com</li>
                <li>🕒 Mon–Fri: 8AM – 6PM</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/40 text-sm">© {new Date().getFullYear()} Raxwo Pvt Ltd. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="text-white/40 hover:text-white/70 text-sm transition-colors">Privacy Policy</a>
              <a href="#" className="text-white/40 hover:text-white/70 text-sm transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
