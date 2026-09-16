/**
 * HomeLayout — used exclusively for the "/" (home) route.
 * No fixed header; the Home page manages its own minimal top nav.
 */
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaFacebookF, FaInstagram, FaYoutube, FaLinkedinIn, FaTiktok } from 'react-icons/fa'
import WhatsAppButton from '../components/ui/WhatsAppButton'
import SiteLogo from '../components/branding/SiteLogo'
import { useSiteBranding } from '../hooks/useSiteBranding'

export default function HomeLayout() {
  const { settings } = useSiteBranding()
  const location = useLocation()
  return (
    <div className="min-h-screen flex flex-col">
      <WhatsAppButton />
      <motion.main
        key={location.pathname}
        className="flex-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        <Outlet />
      </motion.main>

      {/* Footer - Light Mode */}
      <footer className="bg-white text-slate-800 relative overflow-hidden border-t border-slate-200 mt-auto">
        {/* Subtle decorative gradient top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />

        <div className="container-max py-16 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
            
            {/* Column 1: Company Section */}
            <div className="flex flex-col space-y-8">
              <div className="mb-2">
                <SiteLogo to="/" variant="light" asLink={false} />
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-heading font-bold text-orange-600 text-[15px] mb-2">Head Office:</h4>
                  <p className="text-slate-600 text-[15px]">{settings.contactAddress || 'Weliweriya, Sri lanka'}</p>
                </div>
                
                <div>
                  <h4 className="font-heading font-bold text-orange-600 text-[15px] mb-2">Contact:</h4>
                  <p className="text-slate-600 text-[15px]">{settings.contactPhone || '+94 74 357 3333'}</p>
                </div>

                <div className="flex gap-3 pt-2">
                  {[
                    { Icon: FaFacebookF, link: '#' },
                    { Icon: FaInstagram, link: '#' },
                    { Icon: FaYoutube, link: '#' },
                    { Icon: FaLinkedinIn, link: '#' },
                    { Icon: FaTiktok, link: '#' }
                  ].map((social, idx) => (
                    <a key={idx} href={social.link} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white transition-colors duration-300 flex items-center justify-center text-sm shadow-md">
                      <social.Icon />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h4 className="font-heading font-bold text-orange-600 text-lg mb-6">Quick links</h4>
              <ul className="space-y-4">
                {[
                  { name: 'Home', path: '/' },
                  { name: 'Our Services', path: '/our-services' },
                  { name: 'Portal Login', path: '/login' },
                  { name: 'Contact Support', path: '/contact' }
                ].map((link, idx) => (
                  <li key={idx}>
                    {link.path.startsWith('http') ? (
                      <a href={link.path} target="_blank" rel="noopener noreferrer" className="text-slate-600 font-bold text-[15px] hover:text-orange-600 transition-colors duration-200">
                        {link.name}
                      </a>
                    ) : (
                      <NavLink to={link.path} className="text-slate-600 font-bold text-[15px] hover:text-orange-600 transition-colors duration-200">
                        {link.name}
                      </NavLink>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Services */}
            <div>
              <h4 className="font-heading font-bold text-orange-600 text-lg mb-6">Services</h4>
              <ul className="space-y-4">
                {[
                  { name: 'Architectural Planning & 3D', path: '/our-services' },
                  { name: 'House Construction', path: '/our-services' },
                  { name: 'Interior & Landscape', path: '/our-services' },
                  { name: 'BOQ & Estimations', path: '/our-services' }
                ].map((link, idx) => (
                  <li key={idx}>
                    <NavLink to={link.path} className="text-slate-600 font-bold text-[15px] hover:text-orange-600 transition-colors duration-200">
                      {link.name}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Projects */}
            <div>
              <h4 className="font-heading font-bold text-orange-600 text-lg mb-6">Projects</h4>
              <ul className="space-y-4">
                {[
                  { name: 'Residential Construction', path: '/my-projects' },
                  { name: 'Commercial Spaces', path: '/my-projects' },
                  { name: 'Ongoing Construction', path: '/my-projects' },
                  { name: 'Completed Designs', path: '/my-projects' }
                ].map((link, idx) => (
                  <li key={idx}>
                    <NavLink to={link.path} className="text-slate-600 font-bold text-[15px] hover:text-orange-600 transition-colors duration-200">
                      {link.name}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-200 mt-16 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm font-bold tracking-wide">
              ©{new Date().getFullYear()} - {settings.siteName || 'R A Creations & Home Designs'}. All Rights Reserved
            </p>
            <div className="flex items-center gap-4 text-sm font-bold tracking-wide">
              <a href="#" className="text-slate-500 hover:text-orange-600 transition-colors">Privacy Policy</a>
              <span className="text-slate-300">|</span>
              <a href="#" className="text-slate-500 hover:text-orange-600 transition-colors">Terms & Conditions</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
