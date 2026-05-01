import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { appointmentAPI } from '../../api';
import { ArrowRight, Clock, Star, Users, CheckCircle, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const { user } = useAuth();
  
  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => appointmentAPI.getServices().then(r => r.data.data),
  });

  const services = servicesData || [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Public Navbar */}
      <nav className="bg-navy-900 text-white sticky top-0 z-50 border-b border-white/10" style={{ backgroundColor: '#080344' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <span className="font-bold">Rx</span>
              </div>
              <span className="font-bold text-lg tracking-tight">Raxwo Technologies</span>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <Link to={user.userType === 'customer' ? "/customer/dashboard" : "/dashboard"} className="btn-primary bg-brand-500 hover:bg-brand-600 border-none" style={{ backgroundColor: '#534AB7' }}>
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/customer/login" className="text-white/80 hover:text-white text-sm font-medium">Login</Link>
                  <Link to="/register" className="bg-white text-navy-900 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-bold transition-colors" style={{ color: '#080344' }}>
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-navy-900 text-white py-20 relative overflow-hidden" style={{ backgroundColor: '#080344' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
            Expert Tech Consultations,<br className="hidden md:block" /> Delivered with Precision
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10">
            Book professional development, design, and marketing services directly from our top-tier engineers and creatives.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex justify-center gap-4">
            <a href="#services" className="bg-brand-500 hover:bg-brand-600 text-white px-8 py-3 rounded-xl font-bold text-lg transition-all shadow-lg hover:-translate-y-1" style={{ backgroundColor: '#534AB7' }}>
              View Services
            </a>
            <Link to={user ? "/customer/dashboard" : "/register"} className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-bold text-lg transition-all backdrop-blur-sm">
              {user ? 'My Account' : 'Get Started'}
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Happy Customers', value: '500+', icon: Users },
              { label: 'Projects Completed', value: '1,200+', icon: CheckCircle },
              { label: 'Support Available', value: '24/7', icon: Clock },
              { label: 'Satisfaction Rate', value: '99%', icon: Star },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center">
                <stat.icon size={28} className="text-brand-500 mb-3" style={{ color: '#534AB7' }} />
                <span className="text-3xl font-black text-gray-900 mb-1">{stat.value}</span>
                <span className="text-sm font-medium text-gray-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Professional Services</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">Select a service below to book a consultation with our experts.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s) => (
            <div key={s._id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all border-l-4 border-l-navy-900 flex flex-col" style={{ borderLeftColor: '#080344' }}>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                <Smartphone size={24} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{s.name}</h3>
              <p className="text-gray-500 text-sm mb-6 flex-1">{s.description || 'Professional consultation and development service.'}</p>
              
              <div className="flex items-end justify-between mt-auto">
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Starting from</p>
                  <p className="text-2xl font-black text-navy-900" style={{ color: '#080344' }}>₨{Number(s.price).toLocaleString()}</p>
                </div>
                <Link to={user ? "/customer/services" : "/customer/login"} className="text-brand-500 hover:text-brand-700 font-bold flex items-center gap-1 text-sm" style={{ color: '#534AB7' }}>
                  Book Now <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-navy-900 text-white py-12 border-t border-white/10 mt-auto" style={{ backgroundColor: '#080344' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left">
          <div className="md:flex md:items-center md:justify-between">
            <div className="mb-6 md:mb-0">
              <span className="font-bold text-xl tracking-tight block mb-2">Raxwo Technologies</span>
              <p className="text-white/60 text-sm max-w-sm">Empowering businesses with cutting-edge software solutions, dynamic designs, and AI-driven analytics.</p>
            </div>
            <div className="flex flex-col md:flex-row gap-4 md:gap-8 text-sm font-medium text-white/80">
              <a href="#" className="hover:text-white">About Us</a>
              <a href="#services" className="hover:text-white">Services</a>
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Contact Support</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-white/40 text-xs text-center">
            &copy; {new Date().getFullYear()} Raxwo (Pvt) Ltd. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
