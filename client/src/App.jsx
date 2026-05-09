import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import useAuthStore from './store/authStore'

// Layouts
import PublicLayout from './layouts/PublicLayout'
import DashboardLayout from './layouts/DashboardLayout'

// Public pages
import Home from './pages/public/Home'
import Services from './pages/public/Services'
import About from './pages/public/About'
import Portfolio from './pages/public/Portfolio'
import Careers from './pages/public/Careers'
import Contact from './pages/public/Contact'
import JobDetail from './pages/public/JobDetail'
import Apply from './pages/public/Apply'

// Auth
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminEmployees from './pages/admin/Employees'
import AdminLeaves from './pages/admin/Leaves'
import AdminPayroll from './pages/admin/Payroll'
import AdminEPF from './pages/admin/EPFRecords'
import AdminRecruitment from './pages/admin/Recruitment'
import AdminProjects from './pages/admin/Projects'
import ProjectDetail from './pages/admin/ProjectDetail'
import Agreements from './pages/admin/Agreements'
import AdminClients from './pages/admin/Clients'
import AdminClientProfile from './pages/admin/ClientProfile'
import AdminSubscriptions from './pages/admin/Subscriptions'
import AdminInvoices from './pages/admin/Invoices'
import AdminLetters from './pages/admin/Letters'
import AdminAnalytics from './pages/admin/Analytics'
import AdminSettings from './pages/admin/Settings'
import CandidateProfile from './pages/admin/CandidateProfile'
import AdminBookings from './pages/admin/Bookings'
import AdminFeedbacks from './pages/admin/Feedbacks'
import AdminAttendance from './pages/admin/Attendance'
import AdminPerformance from './pages/admin/Performance'
import AdminExports from './pages/admin/Exports'
import AdminFinancial from './pages/admin/Financial'
import AdminFinanceEntries from './pages/admin/FinanceEntries'
import AdminServices from './pages/admin/Services'
import AdminPortfolio from './pages/admin/Portfolio'
import AdminRewards from './pages/admin/Rewards'
import AdminAIAnalyzer from './pages/admin/AIAnalyzer'
import AdminBranches from './pages/admin/Branches'
import AdminAuditLogs from './pages/admin/AuditLogs'
import AdminQuotations from './pages/admin/Quotations'
import AdminPettyCash from './pages/admin/PettyCash'
import AdminAdvances from './pages/admin/Advances'
import AdminLoans from './pages/admin/Loans'
import WorkLogs from './pages/admin/WorkLogs'
import FinancialReports from './pages/admin/FinancialReports'
import LeavePolicies from './pages/admin/LeavePolicies'
import ManagerDashboard from './pages/manager/Dashboard'
import ManagerProjects from './pages/manager/Projects'
import ManagerTeam from './pages/manager/Team'
import ManagerReports from './pages/manager/Reports'
import ManagerProfile from './pages/manager/Profile'
import MessagesCenter from './pages/shared/MessagesCenter'
import NotificationDetail from './pages/shared/NotificationDetail'

// Developer pages
import DeveloperDashboard from './pages/employee/Dashboard'
import DeveloperProjects from './pages/employee/Projects'
import DeveloperProfile from './pages/employee/Profile'
import DeveloperTasks from './pages/employee/Tasks'
import DeveloperLeaves from './pages/employee/Leaves'
import DeveloperPayslips from './pages/employee/Payslips'
import DeveloperLetters from './pages/employee/Letters'
import DeveloperAttendance from './pages/employee/Attendance'
import DeveloperNotifications from './pages/employee/Notifications'
import DeveloperExport from './pages/employee/Export'

// Client pages
import ClientProjects from './pages/client/Projects'
import ClientSubscriptions from './pages/client/Subscriptions'
import ClientInvoices from './pages/client/Invoices'
import ClientProfile from './pages/client/Profile'
import ClientMessages from './pages/client/Messages'
import ClientNotifications from './pages/client/Notifications'
import ClientBooking from './pages/client/Booking'
import ClientFeedback from './pages/client/Feedback'
import ClientRewards from './pages/client/Rewards'

// Guard components
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/unauthorized" replace />
  return children
}

const GuestRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore()
  if (isAuthenticated) {
    const redirect = {
      admin: '/admin',
      manager: '/manager',
      developer: '/developer',
      designer: '/designer',
      marketing: '/marketing',
      client: '/my-projects',
    }
    return <Navigate to={redirect[user?.role] || '/'} replace />
  }
  return children
}

export default function App() {
  const { initAuth } = useAuthStore()
  useEffect(() => { initAuth() }, [])

  return (
    <Routes>
      {/* Public Website */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/about" element={<About />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/careers/:id" element={<JobDetail />} />
        <Route path="/careers/:id/apply" element={<Apply />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/my-projects" element={<ProtectedRoute roles={['client']}><ClientProjects /></ProtectedRoute>} />
        <Route path="/my-subscriptions" element={<ProtectedRoute roles={['client']}><ClientSubscriptions /></ProtectedRoute>} />
        <Route path="/booking" element={<ProtectedRoute roles={['client']}><ClientBooking /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute roles={['client']}><ClientInvoices /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute roles={['client']}><ClientMessages /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute roles={['client']}><ClientNotifications /></ProtectedRoute>} />
        <Route path="/notifications/:id" element={<ProtectedRoute roles={['client']}><NotificationDetail /></ProtectedRoute>} />
        <Route path="/my-account" element={<ProtectedRoute roles={['client']}><ClientProfile /></ProtectedRoute>} />
        <Route path="/feedback" element={<ClientFeedback />} />
        <Route path="/rewards" element={<ProtectedRoute roles={['client']}><ClientRewards /></ProtectedRoute>} />
      </Route>

      {/* Auth */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><DashboardLayout role="admin" /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="employees" element={<AdminEmployees />} />
        <Route path="leaves" element={<AdminLeaves />} />
        <Route path="payroll" element={<AdminPayroll />} />
        <Route path="epf" element={<AdminEPF />} />
        <Route path="recruitment" element={<AdminRecruitment />} />
        <Route path="recruitment/candidates/:id" element={<CandidateProfile />} />
        <Route path="projects" element={<AdminProjects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
        <Route path="clients" element={<AdminClients />} />
        <Route path="clients/:id" element={<AdminClientProfile />} />
        <Route path="invoices" element={<AdminInvoices />} />
        <Route path="letters" element={<AdminLetters />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="messages" element={<MessagesCenter />} />
        <Route path="notifications/:id" element={<NotificationDetail />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="feedback" element={<AdminFeedbacks />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="performance" element={<AdminPerformance />} />
        <Route path="exports" element={<AdminExports />} />
        <Route path="financial" element={<AdminFinancial />} />
        <Route path="finance-entries" element={<AdminFinanceEntries />} />
        <Route path="services" element={<AdminServices />} />
        <Route path="portfolio" element={<AdminPortfolio />} />
        <Route path="rewards" element={<AdminRewards />} />
        <Route path="ai-analyzer" element={<AdminAIAnalyzer />} />
        <Route path="branches" element={<AdminBranches />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
        <Route path="quotations" element={<AdminQuotations />} />
        <Route path="agreements" element={<Agreements />} />
        <Route path="petty-cash" element={<AdminPettyCash />} />
        <Route path="advances" element={<AdminAdvances />} />
        <Route path="loans" element={<AdminLoans />} />
        <Route path="work-logs" element={<WorkLogs />} />
        <Route path="financial-reports" element={<FinancialReports />} />
        <Route path="leave-policies" element={<LeavePolicies />} />
      </Route>

      {/* Manager */}
      <Route path="/manager" element={<ProtectedRoute roles={['manager']}><DashboardLayout role="manager" /></ProtectedRoute>}>
        <Route index element={<ManagerDashboard />} />
        <Route path="projects" element={<ManagerProjects />} />
        <Route path="team" element={<ManagerTeam />} />
        <Route path="reports" element={<ManagerReports />} />
        <Route path="messages" element={<MessagesCenter />} />
        <Route path="profile" element={<ManagerProfile />} />
        <Route path="work-logs" element={<WorkLogs />} />
        <Route path="notifications/:id" element={<NotificationDetail />} />
      </Route>

      {/* Developer */}
      <Route path="/developer" element={<ProtectedRoute roles={['developer']}><DashboardLayout role="developer" /></ProtectedRoute>}>
        <Route index element={<DeveloperDashboard />} />
        <Route path="projects" element={<DeveloperProjects />} />
        <Route path="profile" element={<DeveloperProfile />} />
        <Route path="tasks" element={<DeveloperTasks />} />
        <Route path="leaves" element={<DeveloperLeaves />} />
        <Route path="payslips" element={<DeveloperPayslips />} />
        <Route path="export" element={<DeveloperExport />} />
        <Route path="letters" element={<DeveloperLetters />} />
        <Route path="messages" element={<MessagesCenter />} />
        <Route path="attendance" element={<DeveloperAttendance />} />
        <Route path="work-logs" element={<WorkLogs />} />
        <Route path="notifications" element={<DeveloperNotifications />} />
        <Route path="notifications/:id" element={<NotificationDetail />} />
      </Route>

      {/* Designer */}
      <Route path="/designer" element={<ProtectedRoute roles={['designer']}><DashboardLayout role="designer" /></ProtectedRoute>}>
        <Route index element={<DeveloperDashboard />} />
        <Route path="projects" element={<DeveloperProjects />} />
        <Route path="profile" element={<DeveloperProfile />} />
        <Route path="tasks" element={<DeveloperTasks />} />
        <Route path="leaves" element={<DeveloperLeaves />} />
        <Route path="payslips" element={<DeveloperPayslips />} />
        <Route path="export" element={<DeveloperExport />} />
        <Route path="letters" element={<DeveloperLetters />} />
        <Route path="messages" element={<MessagesCenter />} />
        <Route path="attendance" element={<DeveloperAttendance />} />
        <Route path="work-logs" element={<WorkLogs />} />
        <Route path="notifications" element={<DeveloperNotifications />} />
        <Route path="notifications/:id" element={<NotificationDetail />} />
      </Route>

      {/* Marketing */}
      <Route path="/marketing" element={<ProtectedRoute roles={['marketing']}><DashboardLayout role="marketing" /></ProtectedRoute>}>
        <Route index element={<DeveloperDashboard />} />
        <Route path="projects" element={<DeveloperProjects />} />
        <Route path="profile" element={<DeveloperProfile />} />
        <Route path="tasks" element={<DeveloperTasks />} />
        <Route path="leaves" element={<DeveloperLeaves />} />
        <Route path="payslips" element={<DeveloperPayslips />} />
        <Route path="export" element={<DeveloperExport />} />
        <Route path="letters" element={<DeveloperLetters />} />
        <Route path="messages" element={<MessagesCenter />} />
        <Route path="attendance" element={<DeveloperAttendance />} />
        <Route path="work-logs" element={<WorkLogs />} />
        <Route path="notifications" element={<DeveloperNotifications />} />
        <Route path="notifications/:id" element={<NotificationDetail />} />
      </Route>

      <Route path="/unauthorized" element={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary mb-4">403</h1>
            <p className="text-gray-600 mb-6">You are not authorized to view this page.</p>
            <a href="/" className="btn-primary">Go Home</a>
          </div>
        </div>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
