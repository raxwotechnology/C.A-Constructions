require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Employee = require('./models/Employee');
const Job = require('./models/Job');
const Project = require('./models/Project');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('🌱 Seeding database...');

  // Clear collections
  await User.deleteMany({});
  await Employee.deleteMany({});
  await Job.deleteMany({});
  await Project.deleteMany({});

  // Create admin
  const admin = await User.create({ name: 'Admin User', email: 'admin@raxwo.com', password: 'Admin@2026', role: 'admin', isActive: true });

  // Create manager
  const manager = await User.create({ name: 'Sarah Manager', email: 'manager@raxwo.com', password: 'Manager@2026', role: 'manager', isActive: true });

  // Create developers
  const emp1User = await User.create({ name: 'John Developer', email: 'john@raxwo.com', password: 'Employee@2026', role: 'developer', isActive: true });
  const emp2User = await User.create({ name: 'Nimal Silva', email: 'nimal@raxwo.com', password: 'Employee@2026', role: 'developer', isActive: true });

  const designerUser = await User.create({ name: 'Alex Designer', email: 'designer@raxwo.com', password: 'Designer@2026', role: 'designer', isActive: true });
  const marketingUser = await User.create({ name: 'Maya Marketing', email: 'marketing@raxwo.com', password: 'Marketing@2026', role: 'marketing', isActive: true });

  // Create employee profiles
  const emp1 = await Employee.create({
    userId: emp1User._id, employeeNo: 'EMP0001', department: 'Engineering',
    designation: 'Senior Site Engineer', basicSalary: 150000, allowances: 20000,
    epfNumber: 'EPF001', joinedDate: new Date('2023-01-15'), manager: manager._id, status: 'active',
    skills: ['AutoCAD', 'Structural Engineering', 'Site Supervision'], gender: 'male',
  });

  const emp2 = await Employee.create({
    userId: emp2User._id, employeeNo: 'EMP0002', department: 'Engineering',
    designation: 'Quantity Surveyor (QS)', basicSalary: 110000, allowances: 15000,
    epfNumber: 'EPF002', joinedDate: new Date('2024-03-01'), manager: manager._id, status: 'active',
    skills: ['Cost Estimation', 'BOM Calculation', 'AutoCAD'], gender: 'male',
  });

  await Employee.create({
    userId: designerUser._id, employeeNo: 'EMP0003', department: 'Architecture',
    designation: 'Lead Architect & Interior Designer', basicSalary: 140000, allowances: 18000,
    joinedDate: new Date('2024-06-01'), manager: manager._id, status: 'active',
    skills: ['Revit', '3D Rendering', 'SketchUp', 'Interior Design'], gender: 'female',
  });

  await Employee.create({
    userId: marketingUser._id, employeeNo: 'EMP0004', department: 'Operations',
    designation: 'Site Supervisor', basicSalary: 85000, allowances: 10000,
    joinedDate: new Date('2024-08-01'), manager: manager._id, status: 'active',
    skills: ['Safety Management', 'Quality Control'], gender: 'female',
  });

  // Create client
  const clientUser = await User.create({ name: 'Perera Residencies', email: 'client@perera.lk', password: 'Client@2026', role: 'client', isActive: true });

  // Create jobs
  await Job.create([
    {
      title: 'Civil Site Engineer', department: 'Engineering', type: 'full-time',
      description: 'We are looking for an experienced Civil Site Engineer to oversee construction sites at R A Creations & Home Designs.',
      requirements: ['3+ years construction site experience', 'Degree in Civil Engineering', 'AutoCAD & Site Supervision'],
      skills: ['autocad', 'site supervision', 'structural engineering', 'quality control'],
      salaryRange: { min: 120000, max: 180000 },
      deadline: new Date('2026-07-31'), status: 'open', postedBy: admin._id,
    },
    {
      title: 'Architectural 3D Visualizer', department: 'Architecture', type: 'full-time',
      description: 'Creative Architect / Visualizer needed for 3D residential modeling, interior and exterior designs.',
      requirements: ['2+ years experience', 'Proficiency in SketchUp/3ds Max/V-Ray', 'Strong portfolio'],
      skills: ['sketchup', 'revit', '3d rendering', 'interior design'],
      salaryRange: { min: 90000, max: 150000 },
      deadline: new Date('2026-07-15'), status: 'open', postedBy: admin._id,
    },
    {
      title: 'Quantity Surveyor (QS)', department: 'Quantity Surveying', type: 'full-time',
      description: 'Quantity Surveyor required for bill of quantities (BOQ), material estimation and cost control.',
      requirements: ['3+ years QS experience', 'BSc/Diploma in Quantity Surveying', 'BOQ preparation'],
      skills: ['quantity surveying', 'cost estimation', 'boq', 'autocad'],
      salaryRange: { min: 110000, max: 160000 },
      deadline: new Date('2026-08-01'), status: 'open', postedBy: admin._id,
    },
  ]);

  // Create project
  await Project.create({
    title: 'Modern 2-Story Residence - Colombo 07', description: 'Architectural planning, structural construction, and luxury interior design for Perera Residencies.',
    client: clientUser._id, projectManager: manager._id,
    assignedEmployees: [emp1User._id, emp2User._id],
    status: 'active', priority: 'high', budget: 18500000,
    startDate: new Date('2026-01-01'), deadline: new Date('2026-11-30'),
    progress: 40, technologies: ['Architectural Design', 'RCC Structure', 'Interior Finishing'],
    milestones: [
      { title: 'Architectural & Structural Drawings Approved', dueDate: new Date('2026-02-01'), completed: true },
      { title: 'Foundation & Substructure Completed', dueDate: new Date('2026-04-15'), completed: true },
      { title: 'Superstructure & Brickwork Plastering', dueDate: new Date('2026-07-30'), completed: false },
      { title: 'Roofing, Plumbing & Electrical Rough-ins', dueDate: new Date('2026-09-30'), completed: false },
      { title: 'Interior Finishing & Final Handover', dueDate: new Date('2026-11-30'), completed: false },
    ],
  });

  console.log('✅ Seed completed!');
  console.log('👤 Admin: admin@raxwo.com / Admin@2026');
  console.log('👤 Manager: manager@raxwo.com / Manager@2026');
  console.log('👤 Developer: john@raxwo.com / Employee@2026');
  console.log('👤 Developer: nimal@raxwo.com / Employee@2026');
  console.log('👤 Designer: designer@raxwo.com / Designer@2026');
  console.log('👤 Marketing: marketing@raxwo.com / Marketing@2026');
  console.log('👤 Client: client@techcorp.lk / Client@2026');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
