const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const recruitmentRoutes = require('./routes/recruitmentRoutes');
const projectRoutes = require('./routes/projectRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const letterRoutes = require('./routes/letterRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const messageRoutes = require('./routes/messageRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const siteSettingRoutes = require('./routes/siteSettingRoutes');
const performanceRoutes = require('./routes/performanceRoutes');
const exportRoutes = require('./routes/exportRoutes');
const financeRoutes = require('./routes/financeRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const contentRoutes = require('./routes/contentRoutes');
const rewardRoutes = require('./routes/rewardRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const auditRoutes = require('./routes/auditRoutes');
const branchRoutes = require('./routes/branchRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const advanceRoutes = require('./routes/advanceRoutes');
const loanRoutes = require('./routes/loanRoutes');
const pettyCashRoutes = require('./routes/pettyCashRoutes');
const clientRoutes = require('./routes/clientRoutes');
const workLogRoutes = require('./routes/workLogRoutes');
const bonusRoutes = require('./routes/bonusRoutes');
const agreementRoutes = require('./routes/agreementRoutes');
const { ensureDefaultRules } = require('./services/rewardService');

const app = express();
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
const allowedOrigins = [
  process.env.CLIENT_URL || 'https://manage.raxwo.net',
  'https://manage.raxwo.net',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Static files (uploaded CVs)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/letters', letterRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/site-settings', siteSettingRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/advances', advanceRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/petty-cash', pettyCashRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/work-logs', workLogRoutes);
app.use('/api/bonuses', bonusRoutes);
app.use('/api/agreements', agreementRoutes);

ensureDefaultRules().catch(() => {});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Raxwo API is running', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Error handler
app.use(errorHandler);

module.exports = app;
