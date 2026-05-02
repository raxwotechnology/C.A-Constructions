import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import CustomerLayout from './components/layout/CustomerLayout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Admin/Staff pages
import DashboardPage from './pages/admin/DashboardPage';
import EmployeesPage from './pages/admin/EmployeesPage';
import ProjectsPage from './pages/admin/ProjectsPage';
import AttendancePage from './pages/admin/AttendancePage';
import AIAttendanceVerifierPage from './pages/admin/AIAttendanceVerifierPage';
import SalaryPage from './pages/admin/SalaryPage';
import AppointmentsPage from './pages/admin/AppointmentsPage';
import FinancialPage from './pages/admin/FinancialPage';
import ProductsPage from './pages/admin/ProductsPage';
import SocialPage from './pages/admin/SocialPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import SettingsPage from './pages/admin/SettingsPage';
import ProfilePage from './pages/admin/ProfilePage';

// Customer pages
import LandingPage from './pages/customer/LandingPage';
import CustomerLoginPage from './pages/customer/CustomerLoginPage';
import CustomerDashboardPage from './pages/customer/CustomerDashboardPage';
import CustomerProfilePage from './pages/customer/CustomerProfilePage';
import CustomerAppointmentsPage from './pages/customer/CustomerAppointmentsPage';
import CustomerServicesPage from './pages/customer/CustomerServicesPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    }
  }
});

const ADMIN_ROLES = ['admin'];
const STAFF_ROLES = ['admin', 'developer', 'manager', 'marketing_designer'];
const MANAGER_ROLES = ['admin', 'manager'];

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/customer/login" element={<CustomerLoginPage />} />

            {/* Customer portal inside CustomerLayout (No Sidebar) */}
            <Route path="/customer" element={
              <ProtectedRoute roles={['customer']}><CustomerLayout /></ProtectedRoute>
            }>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<CustomerDashboardPage />} />
              <Route path="appointments" element={<CustomerAppointmentsPage />} />
              <Route path="services" element={<CustomerServicesPage />} />
              <Route path="profile" element={<CustomerProfilePage />} />
            </Route>

            {/* Staff dashboard */}
            <Route element={
              <ProtectedRoute roles={STAFF_ROLES}><DashboardLayout /></ProtectedRoute>
            }>
              <Route path="dashboard" element={<DashboardPage />} />

              {/* Employee management */}
              <Route path="employees/developers" element={<ProtectedRoute roles={ADMIN_ROLES}><EmployeesPage type="developers" /></ProtectedRoute>} />
              <Route path="employees/managers" element={<ProtectedRoute roles={ADMIN_ROLES}><EmployeesPage type="managers" /></ProtectedRoute>} />
              <Route path="employees/marketing-designers" element={<ProtectedRoute roles={ADMIN_ROLES}><EmployeesPage type="marketing-designers" /></ProtectedRoute>} />

              {/* Projects */}
              <Route path="projects" element={<ProjectsPage />} />

              {/* Attendance */}
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="attendance/ai-verifier" element={<AIAttendanceVerifierPage />} />

              {/* Salary */}
              <Route path="salary" element={<SalaryPage />} />
              <Route path="salary/payroll" element={<SalaryPage />} />
              <Route path="salary/overtime" element={<SalaryPage />} />
              <Route path="salary/reports" element={<SalaryPage />} />

              {/* Appointments */}
              <Route path="appointments" element={<ProtectedRoute roles={[...ADMIN_ROLES, 'manager']}><AppointmentsPage /></ProtectedRoute>} />
              <Route path="appointments/services" element={<ProtectedRoute roles={ADMIN_ROLES}><AppointmentsPage /></ProtectedRoute>} />

              {/* Customers */}
              <Route path="customers" element={<ProtectedRoute roles={MANAGER_ROLES}><EmployeesPage type="customers" /></ProtectedRoute>} />

              {/* Financial */}
              <Route path="financial" element={<ProtectedRoute roles={MANAGER_ROLES}><FinancialPage /></ProtectedRoute>} />
              <Route path="financial/revenue" element={<ProtectedRoute roles={MANAGER_ROLES}><FinancialPage /></ProtectedRoute>} />
              <Route path="financial/expenses" element={<ProtectedRoute roles={MANAGER_ROLES}><FinancialPage /></ProtectedRoute>} />

              {/* Products */}
              <Route path="products" element={<ProductsPage />} />

              {/* Social */}
              <Route path="social" element={<SocialPage />} />

              {/* Analytics */}
              <Route path="analytics" element={<ProtectedRoute roles={MANAGER_ROLES}><AnalyticsPage /></ProtectedRoute>} />

              {/* Settings & Profile */}
              <Route path="settings" element={<ProtectedRoute roles={ADMIN_ROLES}><SettingsPage /></ProtectedRoute>} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>

          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                fontFamily: 'Poppins, sans-serif',
                fontSize: '13px',
                borderRadius: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
