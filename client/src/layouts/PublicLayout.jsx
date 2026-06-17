import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import {
  FiMenu,
  FiX,
  FiBell,
  FiChevronDown,
  FiLogOut,
  FiMessageSquare,
  FiCreditCard,
  FiFolder,
  FiHome,
  FiCalendar,
  FiGift,
  FiUsers,
  FiServer,
  FiLayers,
  FiVideo,
} from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '../store/authStore'
import { mediaUrl } from '../lib/media'
import SiteLogo from '../components/branding/SiteLogo'
import api from '../lib/api'
import toast from 'react-hot-toast'

// Minimal public navigation (client-only links go in profile dropdown)
const navLinks = [
  { to: '/', label: 'Home', exact: true },
  { to: '/services', label: 'Services' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

const moreLinks = [
  { to: '/careers', label: 'Careers' },
  { to: '/feedback', label: 'Feedback' },
]

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const profileRef = useRef(null)
  const notifRef = useRef(null)
  const moreRef = useRef(null)
  const topbarRef = useRef(null)
  const [topbarH, setTopbarH] = useState(80)
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const isClient = isAuthenticated && user?.role === 'client'

  const { data: notifData } = useQuery({
    queryKey: ['client-navbar-notifications'],
    queryFn: () => api.get('/system-metrics/notifications').then((r) => r.data),
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
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.pathname])

  useEffect(() => {
    setMenuOpen(false)
    setProfileOpen(false)
    setNotifOpen(false)
    setMoreOpen(false)
  }, [location])

  useEffect(() => {
    const onDown = (e) => {
      const t = e.target
      if (profileRef.current && !profileRef.current.contains(t)) setProfileOpen(false)
      if (notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false)
      if (moreRef.current && !moreRef.current.contains(t)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [])

  useEffect(() => {
    if (!topbarRef.current) return

    const el = topbarRef.current
    const update = () => {
      const next = Math.round(el.getBoundingClientRect().height || 0)
      if (next > 0) setTopbarH(next)
    }

    update()
    const ro = new ResizeObserver(() => update())
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  const handleLogout = () => {
    logout()
    toast.success('Signed out successfully')
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header ref={topbarRef} className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-primary/95 backdrop-blur-md shadow-navy border-b border-white/15 py-3' : 'bg-primary/95 backdrop-blur-md border-b border-white/10 py-4 md:py-5'
      }`}>
        <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center gap-3">
          {/* Logo */}
          <SiteLogo to="/" variant="dark" className="flex-shrink-0 group" />

          {/* Desktop nav */}
          <nav className="hidden md:flex flex-1 items-center justify-center gap-0.5 min-w-0 overflow-visible">
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                className={({ isActive }) =>
                  `px-3 lg:px-4 py-2 rounded-lg text-[13px] lg:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}

            {/* Optional links under a compact dropdown */}
            <div ref={moreRef} className="relative ml-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => setMoreOpen((s) => !s)}
                className={`px-3 lg:px-4 py-2 rounded-lg text-[13px] lg:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  moreLinks.some((l) => location.pathname.startsWith(l.to))
                    ? 'bg-white/15 text-white'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                }`}
              >
                More <FiChevronDown className="inline-block ml-1 -mt-0.5" size={14} />
              </button>
              <AnimatePresence>
                {moreOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute left-0 top-12 w-44 p-2 z-[120] rounded-2xl border border-white/15 bg-primary/95 backdrop-blur-md shadow-2xl"
                  >
                    {moreLinks.map((l) => (
                      <NavLink
                        key={l.to}
                        to={l.to}
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-xl text-sm transition-colors ${
                            isActive ? 'bg-white/15 text-white' : 'text-white/85 hover:bg-white/10'
                          }`
                        }
                      >
                        {l.label}
                      </NavLink>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </nav>

          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            {isClient ? (
              <>
                <div ref={notifRef} className="relative">
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
                        className="absolute right-0 top-12 w-80 card z-[120]"
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
                                try { if (!n.read) await api.put(`/system-metrics/notifications/${n._id}/read`) } catch (_) {}
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
                <div ref={profileRef} className="relative">
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
                        className="absolute right-0 top-12 w-52 p-2 z-[120] rounded-2xl border border-slate-200 bg-white shadow-2xl"
                      >
                        {isClient ? (
                          <>
                            <NavLink to="/my-projects" className="btn-ghost w-full justify-start text-sm"><FiHome size={14} /> Dashboard</NavLink>
                            <NavLink to="/my-projects" className="btn-ghost w-full justify-start text-sm"><FiFolder size={14} /> My Projects</NavLink>
                            <NavLink to="/our-services" className="btn-ghost w-full justify-start text-sm"><FiLayers size={14} /> Our Services</NavLink>
                            <NavLink to="/my-subscriptions" className="btn-ghost w-full justify-start text-sm"><FiServer size={14} /> Subscriptions</NavLink>
                            <NavLink to="/payments" className="btn-ghost w-full justify-start text-sm"><FiCreditCard size={14} /> Payments</NavLink>
                            <NavLink to="/booking" className="btn-ghost w-full justify-start text-sm"><FiCalendar size={14} /> Booking</NavLink>
                            <NavLink to="/messages" className="btn-ghost w-full justify-start text-sm"><FiMessageSquare size={14} /> Messages</NavLink>
                            <NavLink to="/meetings" className="btn-ghost w-full justify-start text-sm"><FiVideo size={14} /> Meetings</NavLink>
                            <NavLink to="/rewards" className="btn-ghost w-full justify-start text-sm"><FiGift size={14} /> Rewards</NavLink>
                            <NavLink to="/notifications" className="btn-ghost w-full justify-start text-sm"><FiBell size={14} /> Notifications</NavLink>
                            <div className="my-1 border-t border-slate-100" />
                            <NavLink to="/my-account" className="btn-ghost w-full justify-start text-sm"><FiUsers size={14} /> Settings</NavLink>
                          </>
                        ) : (
                          <>
                            <NavLink to="/login" className="btn-ghost w-full justify-start text-sm">Sign In</NavLink>
                            <NavLink to="/contact" className="btn-ghost w-full justify-start text-sm">Get a Quote</NavLink>
                          </>
                        )}
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
          <button className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="md:hidden bg-primary/98 backdrop-blur-md border-t border-white/10 shadow-2xl"
            >
              <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-1 max-h-[70vh] overflow-y-auto">
                {navLinks.map(link => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.exact}
                    className={({ isActive }) =>
                      `px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/15 text-white' : 'text-white/85 hover:bg-white/10'}`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
                {moreLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-white/15 text-white' : 'text-white/85 hover:bg-white/10'}`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
                {isClient ? (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                    <NavLink to="/my-projects" className="px-4 py-3 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">Dashboard</NavLink>
                    <NavLink to="/my-projects" className="px-4 py-3 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">My Projects</NavLink>
                    <NavLink to="/our-services" className="px-4 py-3 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">Our Services</NavLink>
                    <NavLink to="/my-subscriptions" className="px-4 py-3 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">Subscriptions</NavLink>
                    <NavLink to="/payments" className="px-4 py-3 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">Payments</NavLink>
                    <NavLink to="/messages" className="px-4 py-3 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">Messages</NavLink>
                    <NavLink to="/meetings" className="px-4 py-3 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">Meetings</NavLink>
                    <NavLink to="/rewards" className="px-4 py-3 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">Rewards</NavLink>
                    <NavLink to="/booking" className="px-4 py-3 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">Booking</NavLink>
                    <NavLink to="/notifications" className="px-4 py-3 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">Notifications</NavLink>
                    <NavLink to="/my-account" className="px-4 py-3 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">Settings</NavLink>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/10 transition-colors">Sign Out</button>
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
      <main className="flex-1 bg-slate-50" style={{ paddingTop: topbarH }}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12 }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-primary text-white">
        <div className="container-max py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-2">
              <div className="mb-4">
                <SiteLogo to="/" variant="dark" asLink={false} />
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
            <p className="text-white/40 text-sm">© {new Date().getFullYear()} Raxwo. All rights reserved.</p>
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
