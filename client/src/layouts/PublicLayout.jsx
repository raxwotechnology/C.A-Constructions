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
import { FaFacebookF, FaInstagram, FaYoutube, FaLinkedinIn, FaTiktok } from 'react-icons/fa'
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
  { to: '/contact', label: 'Contact' },
]

const moreLinks = [
  { to: '/careers', label: 'Careers' },

]

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false)
  const profileRef = useRef(null)
  const notifRef = useRef(null)
  const moreRef = useRef(null)
  const servicesRef = useRef(null)
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

  const { data: servicesData } = useQuery({
    queryKey: ['public-services'],
    queryFn: () => api.get('/content/services').then(r => r.data),
  })
  const allServices = servicesData?.services || []
  const serviceCategories = Array.from(new Set(allServices.filter(s => s.type === 'service' || !s.type).map(s => s.category).filter(Boolean)))
  const productCategories = Array.from(new Set(allServices.filter(s => s.type === 'product').map(s => s.category).filter(Boolean)))

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
      if (servicesRef.current && !servicesRef.current.contains(t)) setServicesDropdownOpen(false)
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
          <nav className="hidden md:flex flex-1 items-center gap-1 min-w-0 px-4">
            <a href="https://raxwo.net/" className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-1.5 whitespace-nowrap">
              <FiHome size={14} /> Back
            </a>
            <span className="w-px h-4 bg-white/20 mx-1" />
            <NavLink to="/" end className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${isActive ? 'text-white bg-white/15' : 'text-white/75 hover:text-white hover:bg-white/10'}`}>Home</NavLink>
            
            <div className="relative group" ref={servicesRef}>
              <button onClick={() => setServicesDropdownOpen(!servicesDropdownOpen)} className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${servicesDropdownOpen || location.pathname === '/services' ? 'text-white bg-white/15' : 'text-white/75 hover:text-white hover:bg-white/10'}`}>
                Services & Software Products <FiChevronDown size={14} className={`transition-transform group-hover:rotate-180`} />
              </button>
              
              {/* Mega Menu Dropdown */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[130]">
                <div className="w-[950px] bg-[#f8f9fa] rounded-none shadow-2xl border-t-2 border-primary overflow-hidden p-6">
                  
                  <div className="grid grid-cols-2 gap-8 divide-x divide-slate-200">
                    {/* Services */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Services</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <a href="https://raxwo.net/services/" className="group/item flex flex-col items-center text-center">
                          <div className="w-full h-20 mb-2 overflow-hidden rounded-md bg-white border border-slate-100 flex items-center justify-center">
                            <img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=200&q=80" alt="All Services" className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-500" />
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-800 group-hover/item:text-[#20b2f5] transition-colors">All Services</h4>
                        </a>
                        <a href="https://raxwo.net/development-hub/" className="group/item flex flex-col items-center text-center">
                          <div className="w-full h-20 mb-2 overflow-hidden rounded-md bg-white border border-slate-100 flex items-center justify-center">
                            <img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=200&q=80" alt="Development Hub" className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-500" />
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-800 group-hover/item:text-[#20b2f5] transition-colors">Development Hub</h4>
                        </a>
                        <a href="https://raxwo.net/creative-design-studio/" className="group/item flex flex-col items-center text-center">
                          <div className="w-full h-20 mb-2 overflow-hidden rounded-md bg-white border border-slate-100 flex items-center justify-center">
                            <img src="https://images.unsplash.com/photo-1561070791-2526d30994b5?w=200&q=80" alt="Creative & Design Studio" className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-500" />
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-800 group-hover/item:text-[#20b2f5] transition-colors">Creative Studio</h4>
                        </a>
                        <a href="https://raxwo.net/marketing-lab/" className="group/item flex flex-col items-center text-center">
                          <div className="w-full h-20 mb-2 overflow-hidden rounded-md bg-white border border-slate-100 flex items-center justify-center">
                            <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&q=80" alt="Marketing Lab" className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-500" />
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-800 group-hover/item:text-[#20b2f5] transition-colors">Marketing Lab</h4>
                        </a>
                      </div>
                    </div>

                    {/* Products */}
                    <div className="pl-8">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Software Products</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <a href="https://raxwo.net/mobile-shop-erp/" className="group/item flex flex-col items-center text-center">
                          <div className="w-full h-20 mb-2 overflow-hidden rounded-md bg-white border border-slate-100 flex items-center justify-center">
                            <img src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=200&q=80" alt="Mobile Shop ERP" className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-500" />
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-800 group-hover/item:text-[#20b2f5] transition-colors">Mobile Shop ERP 📱</h4>
                        </a>
                        <a href="https://raxwo.net/salon-management-erp/" className="group/item flex flex-col items-center text-center">
                          <div className="w-full h-20 mb-2 overflow-hidden rounded-md bg-white border border-slate-100 flex items-center justify-center">
                            <img src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&q=80" alt="Salon ERP" className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-500" />
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-800 group-hover/item:text-[#20b2f5] transition-colors">Salon ERP 💇</h4>
                        </a>
                        <a href="https://raxwo.net/restaurant-hotel-erp/" className="group/item flex flex-col items-center text-center">
                          <div className="w-full h-20 mb-2 overflow-hidden rounded-md bg-white border border-slate-100 flex items-center justify-center">
                            <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&q=80" alt="Restaurant ERP" className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-500" />
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-800 group-hover/item:text-[#20b2f5] transition-colors">Restaurant ERP 🍽️</h4>
                        </a>
                        <a href="https://raxwo.net/hardware-distribution-erp/" className="group/item flex flex-col items-center text-center">
                          <div className="w-full h-20 mb-2 overflow-hidden rounded-md bg-white border border-slate-100 flex items-center justify-center">
                            <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&q=80" alt="Hardware ERP" className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-500" />
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-800 group-hover/item:text-[#20b2f5] transition-colors">Hardware ERP 🏗️</h4>
                        </a>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <NavLink to="/careers" className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${isActive ? 'text-white bg-white/15' : 'text-white/75 hover:text-white hover:bg-white/10'}`}>Careers</NavLink>
            <a href="https://raxwo.net/lets-talk/" className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap text-white/75 hover:text-white hover:bg-white/10">Let's Talk</a>
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
                        <button onClick={handleLogout} className="btn-ghost w-full justify-start text-sm text-red-500 hover:text-red-600"><FiLogOut size={14} /> Sign Out</button>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </>
            ) : null}
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
                <a
                  href="https://raxwo.net/"
                  className="px-4 py-3 rounded-lg text-sm font-medium transition-colors text-white/85 hover:bg-white/10 flex items-center gap-2"
                >
                  <FiHome size={16} /> Back
                </a>

                <div className="my-1 border-t border-white/10" />

                <NavLink to="/" end className={({ isActive }) => `px-4 py-3 rounded-lg text-sm font-medium transition-colors block ${isActive ? 'text-white bg-white/15' : 'text-white/85 hover:bg-white/10'}`}>
                  Home
                </NavLink>
                <div className="my-2 border-l-2 border-[#20b2f5] pl-4 flex flex-col gap-1">
                  <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Services & Software Products</div>
                  <a href="https://raxwo.net/services/" className="text-sm font-medium text-white/85 py-1 hover:text-[#20b2f5]">All Services</a>
                  <a href="https://raxwo.net/development-hub/" className="text-sm font-medium text-white/85 py-1 hover:text-[#20b2f5]">Development Hub</a>
                  <a href="https://raxwo.net/creative-design-studio/" className="text-sm font-medium text-white/85 py-1 hover:text-[#20b2f5]">Creative & Design Studio</a>
                  <a href="https://raxwo.net/marketing-lab/" className="text-sm font-medium text-white/85 py-1 hover:text-[#20b2f5]">Marketing Lab</a>
                  <a href="https://raxwo.net/services-products/" className="text-sm font-medium text-white/85 py-1 hover:text-[#20b2f5]">Services & Products</a>
                </div>
                <NavLink to="/careers" className={({ isActive }) => `px-4 py-3 rounded-lg text-sm font-medium transition-colors block ${isActive ? 'text-white bg-white/15' : 'text-white/85 hover:bg-white/10'}`}>
                  Careers
                </NavLink>
                <a href="https://raxwo.net/lets-talk/" className="px-4 py-3 rounded-lg text-sm font-medium transition-colors block text-white/85 hover:bg-white/10">
                  Let's Talk
                </a>
                
                {isClient && (
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
      <footer className="bg-[#0C0227] text-white relative overflow-hidden border-t border-white/5">
        {/* Subtle World Map / Abstract Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `url("https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg")`,
            backgroundSize: '80%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'invert(1)'
          }}
        />

        <div className="container-max py-16 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
            
            {/* Column 1: Company Section */}
            <div className="flex flex-col space-y-8">
              <div className="mb-2">
                <SiteLogo to="/" variant="dark" asLink={false} />
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-heading font-bold text-[#20b2f5] mb-2">Head Office:</h4>
                  <p className="text-white text-sm">Weliweriya, Sri lanka</p>
                </div>
                
                <div>
                  <h4 className="font-heading font-bold text-[#20b2f5] mb-2">Contact:</h4>
                  <p className="text-white text-sm">+94 74 357 3333</p>
                </div>

                <div className="flex gap-3 pt-2">
                  {[
                    { Icon: FaFacebookF, link: '#' },
                    { Icon: FaInstagram, link: '#' },
                    { Icon: FaYoutube, link: '#' },
                    { Icon: FaLinkedinIn, link: '#' },
                    { Icon: FaTiktok, link: '#' }
                  ].map((social, idx) => (
                    <a key={idx} href={social.link} 
                      className="w-8 h-8 rounded-full bg-[#20b2f5] hover:bg-white hover:text-[#20b2f5] text-white transition-colors duration-300 flex items-center justify-center text-sm shadow-lg">
                      <social.Icon />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h4 className="font-heading font-bold text-[#20b2f5] text-lg mb-6">Quick links</h4>
              <ul className="space-y-4">
                {[
                  { name: 'Home', path: '/' },
                  { name: 'Who We Are', path: '/about' },
                  { name: 'Let\'s Talk', path: '/contact' },
                  { name: 'FAQ\'s', path: '/faqs' },
                  { name: 'Careers', path: '/careers' }
                ].map((link, idx) => (
                  <li key={idx}>
                    <NavLink to={link.path} className="text-white font-bold text-sm hover:text-[#20b2f5] transition-colors duration-200">
                      {link.name}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Services */}
            <div>
              <h4 className="font-heading font-bold text-[#20b2f5] text-lg mb-6">Services</h4>
              <ul className="space-y-4">
                {[
                  { name: 'All Services', path: 'https://raxwo.net/services/' },
                  { name: 'Development Hub', path: 'https://raxwo.net/development-hub/' },
                  { name: 'Creative & Design Studio', path: 'https://raxwo.net/creative-design-studio/' },
                  { name: 'Marketing Lab', path: 'https://raxwo.net/marketing-lab/' },
                  { name: 'Services & Products', path: 'https://raxwo.net/services-products/' }
                ].map((link, idx) => (
                  <li key={idx}>
                    <a href={link.path} className="text-white font-bold text-sm hover:text-[#20b2f5] transition-colors duration-200">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Products */}
            <div>
              <h4 className="font-heading font-bold text-[#20b2f5] text-lg mb-6">Products</h4>
              <ul className="space-y-4">
                {[
                  { name: 'Software Products', path: 'https://raxwo.net/software-products/' },
                  { name: 'Mobile Shop ERP 📱', path: 'https://raxwo.net/mobile-shop-erp/' },
                  { name: 'Salon Management ERP 💇', path: 'https://raxwo.net/salon-management-erp/' },
                  { name: 'Restaurant & Hotel ERP 🍽️', path: 'https://raxwo.net/salon-management-erp/' },
                  { name: 'Hardware & Distribution ERP 🏗️', path: 'https://raxwo.net/hardware-distribution-erp/' }
                ].map((link, idx) => (
                  <li key={idx}>
                    <a href={link.path} className="text-white font-bold text-sm hover:text-[#20b2f5] transition-colors duration-200">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Bottom Bar */}
          <div className="border-t-[1px] border-dotted border-white/20 mt-16 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white text-xs font-bold tracking-wide">
              ©{new Date().getFullYear()} - Raxwo (Pvt) ltd. | All Rights Reserved
            </p>
            <div className="flex items-center gap-4 text-xs font-bold tracking-wide">
              <a href="/privacy" className="text-white hover:text-[#20b2f5] transition-colors">Privacy Policy</a>
              <span className="text-white/30">|</span>
              <a href="/terms" className="text-white hover:text-[#20b2f5] transition-colors">Terms & Conditions</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
