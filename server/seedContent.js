const mongoose = require('mongoose');
require('dotenv').config();
const PortfolioItem = require('./src/models/PortfolioItem');
const Service = require('./src/models/Service');

const STATIC_PROJECTS = [
  { title: 'TechCorp ERP System', category: 'Enterprise', tech: ['React', 'Node.js', 'MongoDB'], desc: 'Full ERP system with HR, payroll, inventory, and client management for a Colombo-based tech firm.', colorFrom: '#3b82f6', colorTo: '#1d4ed8', result: '40% ops efficiency gain' },
  { title: 'FashionHub E-Commerce', category: 'E-Commerce', tech: ['Next.js', 'Stripe', 'PostgreSQL'], desc: 'Multi-vendor e-commerce platform with vendor dashboards, inventory tracking, and payment processing.', colorFrom: '#a855f7', colorTo: '#7e22ce', result: '3x revenue increase' },
  { title: 'HealthCare Patient Portal', category: 'Healthcare', tech: ['React Native', 'Node.js', 'MySQL'], desc: 'Patient management system with appointment scheduling, medical records, and billing integration.', colorFrom: '#22c55e', colorTo: '#15803d', result: '60% admin time saved' },
  { title: 'LogiTrack Delivery App', category: 'Logistics', tech: ['React Native', 'Google Maps', 'Socket.io'], desc: 'Real-time delivery tracking app for a logistics company with driver and customer portals.', colorFrom: '#f97316', colorTo: '#c2410c', result: '25% delivery efficiency' },
  { title: 'SchoolMS Learning Platform', category: 'Education', tech: ['React', 'Express', 'MongoDB'], desc: 'Comprehensive school management system with student, teacher, and parent portals.', colorFrom: '#ef4444', colorTo: '#b91c1c', result: '5,000+ daily users' },
  { title: 'FinPro Accounting Suite', category: 'Finance', tech: ['Vue.js', 'Node.js', 'PostgreSQL'], desc: 'Cloud-based accounting software with GST/VAT, invoicing, and financial reporting.', colorFrom: '#14b8a6', colorTo: '#0f766e', result: '200+ businesses using' },
];

const STATIC_SERVICES = [
  {
    icon: 'FiCode', title: 'Web Development', colorFrom: '#3b82f6', colorTo: '#2563eb',
    description: 'Full-stack web applications using React, Node.js, MongoDB, and modern cloud infrastructure. We build scalable, maintainable solutions.',
    features: ['React / Next.js frontends', 'Node.js / Express APIs', 'MongoDB & PostgreSQL', 'REST & GraphQL APIs'],
    priceText: 'From LKR 150,000'
  },
  {
    icon: 'FiSmartphone', title: 'Mobile App Development', colorFrom: '#22c55e', colorTo: '#16a34a',
    description: 'Cross-platform iOS and Android apps with React Native. Native performance, beautiful UI, and seamless backend integration.',
    features: ['React Native / Expo', 'iOS & Android', 'Push notifications', 'Offline-first architecture'],
    priceText: 'From LKR 250,000'
  },
  {
    icon: 'FiCloud', title: 'Cloud & DevOps', colorFrom: '#a855f7', colorTo: '#9333ea',
    description: 'End-to-end cloud infrastructure setup, CI/CD pipelines, containerization, and ongoing DevOps support.',
    features: ['AWS / Azure / GCP', 'Docker & Kubernetes', 'CI/CD pipelines', '24/7 monitoring'],
    priceText: 'From LKR 80,000/mo'
  },
  {
    icon: 'FiLayers', title: 'Enterprise Systems', colorFrom: '#f97316', colorTo: '#ea580c',
    description: 'Custom ERP, HRM, CRM, and inventory management systems designed for Sri Lankan enterprises.',
    features: ['ERP / HRM Systems', 'Custom workflows', 'EPF/ETF compliance', 'Multi-role portals'],
    priceText: 'From LKR 500,000'
  },
  {
    icon: 'FiDatabase', title: 'Database & Backend', colorFrom: '#ef4444', colorTo: '#dc2626',
    description: 'Database design, optimization, API development, and backend architecture for high-performance applications.',
    features: ['Database design', 'Query optimization', 'API security', 'Data migration'],
    priceText: 'From LKR 100,000'
  },
  {
    icon: 'FiShield', title: 'Cybersecurity', colorFrom: '#4b5563', colorTo: '#1f2937',
    description: 'Security audits, penetration testing, vulnerability assessments, and security consulting for your systems.',
    features: ['Penetration testing', 'Security audits', 'GDPR compliance', 'Secure code review'],
    priceText: 'From LKR 120,000'
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  const pCount = await PortfolioItem.countDocuments();
  if (pCount === 0) {
    for (let i = 0; i < STATIC_PROJECTS.length; i++) {
      const p = STATIC_PROJECTS[i];
      await PortfolioItem.create({
        title: p.title,
        category: p.category,
        technologies: p.tech,
        description: p.desc,
        colorFrom: p.colorFrom,
        colorTo: p.colorTo,
        result: p.result,
        order: i,
      });
    }
    console.log('Seeded PortfolioItems');
  } else {
    console.log('PortfolioItems already exist');
  }

  const sCount = await Service.countDocuments();
  if (sCount === 0) {
    for (let i = 0; i < STATIC_SERVICES.length; i++) {
      const s = STATIC_SERVICES[i];
      await Service.create({
        title: s.title,
        icon: s.icon,
        description: s.description,
        features: s.features,
        priceText: s.priceText,
        colorFrom: s.colorFrom,
        colorTo: s.colorTo,
        order: i,
      });
    }
    console.log('Seeded Services');
  } else {
    console.log('Services already exist');
  }

  await mongoose.disconnect();
}

seed().catch(console.error);
