import CustomerNavbar from './CustomerNavbar';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { settingsAPI } from '../../api';

export default function CustomerLayout() {
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.get().then(res => res.data.data),
  });

  const settings = settingsData || {
    companyName: 'Raxwo Technologies',
    contactEmail: 'support@raxwo.com',
    contactPhone: '+1 (555) 123-4567',
    footerText: 'Empowering businesses with cutting-edge software solutions.'
  };
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <CustomerNavbar />
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="animate-in fade-in duration-300">
          <Outlet />
        </div>
      </main>
      
      <footer className="bg-navy-900 text-white mt-auto py-12 border-t border-white/10" style={{ backgroundColor: '#080344' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-start md:justify-between grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="mb-4 md:mb-0">
              <h4 className="text-xl font-bold mb-2">{settings.companyName}</h4>
              <p className="text-sm text-white/60 mb-4 max-w-sm">{settings.footerText}</p>
              <div className="text-sm text-white/80 space-y-1">
                <p>Email: {settings.contactEmail}</p>
                <p>Phone: {settings.contactPhone}</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-bold mb-4">Quick Links</h4>
              <div className="flex flex-col space-y-2 text-sm text-white/80">
                <a href="#" className="hover:text-brand-400 transition-colors">Home</a>
                <a href="#" className="hover:text-brand-400 transition-colors">Services</a>
                <a href="#" className="hover:text-brand-400 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-brand-400 transition-colors">Terms of Service</a>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold mb-4">Connect With Us</h4>
              <div className="flex gap-4">
                {/* Simplified social icons placeholders */}
                <a href={settings.facebookUrl || '#'} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand-500 transition-colors">FB</a>
                <a href={settings.twitterUrl || '#'} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand-500 transition-colors">TW</a>
                <a href={settings.linkedinUrl || '#'} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand-500 transition-colors">IN</a>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-white/10 text-center">
            <p className="text-sm text-white/40">
              &copy; {new Date().getFullYear()} {settings.companyName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
