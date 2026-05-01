import api from './axios';

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// Employees
export const employeeAPI = {
  getAll: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  toggleStatus: (id) => api.patch(`/employees/${id}/toggle-status`),
  delete: (id) => api.delete(`/employees/${id}`),
  getStats: () => api.get('/employees/stats'),
};

// Projects
export const projectAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getStats: () => api.get('/projects/stats'),
  addMilestone: (id, data) => api.post(`/projects/${id}/milestones`, data),
  updateMilestone: (id, mId, data) => api.put(`/projects/${id}/milestones/${mId}`, data),
  addProgress: (id, data) => api.post(`/projects/${id}/progress`, data),
};

// Attendance
export const attendanceAPI = {
  getAll: (params) => api.get('/attendance', { params }),
  getToday: () => api.get('/attendance/today'),
  getSummary: (params) => api.get('/attendance/summary', { params }),
  clockIn: (data) => api.post('/attendance/clock-in', data),
  clockOut: () => api.post('/attendance/clock-out'),
  update: (id, data) => api.put(`/attendance/${id}`, data),
  uploadScreenshot: (data) => api.post('/attendance/screenshot', data),
};

// Salary & Payroll
export const salaryAPI = {
  getStructures: () => api.get('/salary/structures'),
  setStructure: (data) => api.post('/salary/structures', data),
  getPayroll: (params) => api.get('/salary/payroll', { params }),
  processPayroll: (data) => api.post('/salary/payroll/process', data),
  markPaid: (id, data) => api.patch(`/salary/payroll/${id}/pay`, data),
  getOvertime: (params) => api.get('/salary/overtime', { params }),
  addOvertime: (data) => api.post('/salary/overtime', data),
  approveOvertime: (id, data) => api.patch(`/salary/overtime/${id}/approve`, data),
};

// Appointments
export const appointmentAPI = {
  getAll: (params) => api.get('/appointments', { params }),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  cancel: (id, data) => api.patch(`/appointments/${id}/cancel`, data),
  getStats: () => api.get('/appointments/stats'),
  getServices: () => api.get('/appointments/services'),
  createService: (data) => api.post('/appointments/services', data),
  updateService: (id, data) => api.put(`/appointments/services/${id}`, data),
  deleteService: (id) => api.delete(`/appointments/services/${id}`),
};

// Customers
export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  update: (id, data) => api.put(`/customers/${id}`, data),
  setDiscount: (id, discount) => api.patch(`/customers/${id}/discount`, { discount }),
};

// Financial
export const financialAPI = {
  getSummary: (params) => api.get('/financial/summary', { params }),
  getRevenue: (params) => api.get('/financial/revenue', { params }),
  addRevenue: (data) => api.post('/financial/revenue', data),
  updateRevenue: (id, data) => api.put(`/financial/revenue/${id}`, data),
  deleteRevenue: (id) => api.delete(`/financial/revenue/${id}`),
  getExpenses: (params) => api.get('/financial/expenses', { params }),
  addExpense: (data) => api.post('/financial/expenses', data),
  updateExpense: (id, data) => api.put(`/financial/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/financial/expenses/${id}`),
};

// Products
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

// Social Media
export const socialAPI = {
  getAll: (params) => api.get('/social', { params }),
  create: (data) => api.post('/social', data),
  update: (id, data) => api.put(`/social/${id}`, data),
  delete: (id) => api.delete(`/social/${id}`),
  publish: (id) => api.patch(`/social/${id}/publish`),
};

// Analytics
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getAIPredictions: () => api.get('/analytics/ai-predictions'),
  getRevenue: (params) => api.get('/analytics/revenue', { params }),
};

// Settings
export const settingsAPI = {
  get: () => api.get('/settings'),
  updateLogo: (data) => api.post('/settings/logo', data),
  update: (data) => api.put('/settings', data),
};

// Notifications
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
};
