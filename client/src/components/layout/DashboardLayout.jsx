import Sidebar from './Sidebar';
import Header from './Header';
import { Outlet, useLocation } from 'react-router-dom';

const pageTitles = {
  '/dashboard':                 { title: 'Dashboard', subtitle: 'Welcome back to Raxwo Technologies' },
  '/employees/developers':      { title: 'Developers', subtitle: 'Manage development team' },
  '/employees/managers':        { title: 'Managers', subtitle: 'Manage managers' },
  '/employees/marketing-designers': { title: 'Marketing Designers', subtitle: 'Manage design team' },
  '/projects':                  { title: 'Projects', subtitle: 'Track all company projects' },
  '/projects/timeline':         { title: 'Project Timeline', subtitle: 'Visual project overview' },
  '/attendance':                { title: 'Attendance', subtitle: 'Track employee attendance' },
  '/attendance/ai-verifier':    { title: 'AI Attendance Verifier', subtitle: 'Biometric verification' },
  '/salary':                    { title: 'Salary Dashboard', subtitle: 'Payroll management' },
  '/salary/payroll':            { title: 'Payroll Processing', subtitle: 'Process monthly payroll' },
  '/salary/overtime':           { title: 'Overtime Management', subtitle: 'Overtime approvals' },
  '/salary/reports':            { title: 'Salary Reports', subtitle: 'Payroll analytics' },
  '/appointments':              { title: 'Appointments', subtitle: 'Manage customer bookings' },
  '/appointments/services':     { title: 'Services', subtitle: 'Manage service catalog' },
  '/customers':                 { title: 'Customers', subtitle: 'Customer management' },
  '/financial':                 { title: 'Financial Reports', subtitle: 'Revenue & profit analytics' },
  '/financial/revenue':         { title: 'Revenue', subtitle: 'Revenue records' },
  '/financial/expenses':        { title: 'Expenses', subtitle: 'Expense records' },
  '/products':                  { title: 'Products', subtitle: 'Product catalog management' },
  '/social':                    { title: 'Social Media', subtitle: 'Content management' },
  '/analytics':                 { title: 'AI Analytics', subtitle: 'AI-powered business insights' },
  '/settings':                  { title: 'Settings', subtitle: 'System configuration' },
  '/profile':                   { title: 'My Profile', subtitle: 'Your account information' },
};

export default function DashboardLayout() {
  const location = useLocation();
  const pageInfo = pageTitles[location.pathname] || { title: 'Raxwo', subtitle: '' };

  return (
    <div className="main-layout bg-gray-50">
      <Sidebar />
      <div className="main-content">
        <Header title={pageInfo.title} subtitle={pageInfo.subtitle} />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
