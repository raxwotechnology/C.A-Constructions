const Job = require('../models/Job');
const Application = require('../models/Application');
const path = require('path');
const fs = require('fs');

// Simple CV text parser (keyword extraction)
const parseCV = (text) => {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(\+?\d[\d\s\-().]{7,}\d)/g;
  const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9\-_]+/gi;

  const emails = text.match(emailRegex) || [];
  const phones = text.match(phoneRegex) || [];
  const linkedins = text.match(linkedinRegex) || [];

  const skillKeywords = ['javascript','typescript','react','node','express','mongodb','python','django','java','spring','angular','vue','php','laravel','mysql','postgresql','redis','docker','kubernetes','aws','azure','git','graphql','rest','api','html','css','tailwind','bootstrap','figma','jira','agile','scrum','devops','ci/cd','linux','nginx'];
  const foundSkills = skillKeywords.filter(s => text.toLowerCase().includes(s));

  // Experience years extraction
  const expMatch = text.match(/(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/i);
  const experienceYears = expMatch ? parseInt(expMatch[1]) : 0;

  return {
    email: emails[0] || '',
    phone: phones[0] || '',
    linkedin: linkedins[0] || '',
    skills: foundSkills,
    experienceYears,
    summary: text.substring(0, 500),
  };
};

// Score CV against job requirements
const scoreCV = (cvSkills, jobSkills) => {
  if (!jobSkills || jobSkills.length === 0) return 50;
  const matched = cvSkills.filter(s => jobSkills.map(j => j.toLowerCase()).includes(s.toLowerCase()));
  return Math.round((matched.length / jobSkills.length) * 100);
};

// @desc    Get all jobs (public)
// @route   GET /api/recruitment/jobs
exports.getJobs = async (req, res, next) => {
  try {
    const { status, department } = req.query;
    const query = {};
    if (status) query.status = status; else query.status = 'open';
    if (department) query.department = department;
    const jobs = await Job.find(query).populate('postedBy', 'name').sort({ createdAt: -1 });
    res.json({ success: true, count: jobs.length, jobs });
  } catch (err) { next(err); }
};

// @desc    Get single job
// @route   GET /api/recruitment/jobs/:id
exports.getJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate('postedBy', 'name');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, job });
  } catch (err) { next(err); }
};

// @desc    Create job
// @route   POST /api/recruitment/jobs
exports.createJob = async (req, res, next) => {
  try {
    const job = await Job.create({ ...req.body, postedBy: req.user._id });
    res.status(201).json({ success: true, job });
  } catch (err) { next(err); }
};

// @desc    Update job
// @route   PUT /api/recruitment/jobs/:id
exports.updateJob = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, job });
  } catch (err) { next(err); }
};

// @desc    Delete job
// @route   DELETE /api/recruitment/jobs/:id
exports.deleteJob = async (req, res, next) => {
  try {
    await Job.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Job deleted' });
  } catch (err) { next(err); }
};

// @desc    Submit application with CV upload
// @route   POST /api/recruitment/apply/:jobId
exports.applyForJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job || job.status !== 'open') return res.status(400).json({ success: false, message: 'Job not available' });

    // Check duplicate
    const exists = await Application.findOne({ job: job._id, email: req.body.email });
    if (exists) return res.status(400).json({ success: false, message: 'Already applied for this job' });

    let cvUrl = '';
    let parsedData = {};
    let skills = [];
    let experienceYears = 0;

    if (req.file) {
      cvUrl = `/uploads/cvs/${req.file.filename}`;
      try {
        const pdfParse = require('pdf-parse');
        const buffer = fs.readFileSync(req.file.path);
        const data = await pdfParse(buffer);
        const parsed = parseCV(data.text);
        parsedData = parsed;
        skills = parsed.skills;
        experienceYears = parsed.experienceYears;
      } catch (e) {
        console.log('CV parse failed:', e.message);
      }
    }

    const matchScore = scoreCV(skills, job.skills);

    const application = await Application.create({
      job: job._id,
      name: req.body.name,
      email: req.body.email || parsedData.email,
      phone: req.body.phone || parsedData.phone,
      linkedin: req.body.linkedin || parsedData.linkedin,
      cvUrl,
      extractedData: {
        summary: parsedData.summary || '',
        skills,
      },
      skills,
      experienceYears,
      matchScore,
      coverLetter: req.body.coverLetter,
    });

    // Increment applicant count
    await Job.findByIdAndUpdate(job._id, { $inc: { applicantCount: 1 } });

    res.status(201).json({ success: true, message: 'Application submitted successfully', application });
  } catch (err) { next(err); }
};

// @desc    Get all applications
// @route   GET /api/recruitment/applications
exports.getApplications = async (req, res, next) => {
  try {
    const { jobId, status } = req.query;
    const query = {};
    if (jobId) query.job = jobId;
    if (status) query.status = status;
    const applications = await Application.find(query).populate('job', 'title department').sort({ matchScore: -1 });
    res.json({ success: true, count: applications.length, applications });
  } catch (err) { next(err); }
};

// @desc    Get single application
// @route   GET /api/recruitment/applications/:id
exports.getApplication = async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id).populate('job', 'title department skills').populate('reviewedBy', 'name');
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, application: app });
  } catch (err) { next(err); }
};

// @desc    Update application status
// @route   PUT /api/recruitment/applications/:id/status
exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const { status, notes, interviewDate, interviewNotes } = req.body;
    const app = await Application.findByIdAndUpdate(
      req.params.id,
      { status, notes, interviewDate, interviewNotes, reviewedBy: req.user._id },
      { new: true }
    ).populate('job', 'title');
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, application: app });
  } catch (err) { next(err); }
};

// @desc    Get ranked applications for a job
// @route   GET /api/recruitment/jobs/:id/ranking
exports.getJobRanking = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).select('title skills');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const applications = await Application.find({ job: job._id })
      .select('name email skills experienceYears matchScore status createdAt')
      .sort({ matchScore: -1, experienceYears: -1, createdAt: 1 });

    const ranked = applications.map((app, index) => ({
      rank: index + 1,
      id: app._id,
      name: app.name,
      email: app.email,
      matchScore: app.matchScore,
      experienceYears: app.experienceYears,
      status: app.status,
      matchedSkills: app.skills.filter((s) => (job.skills || []).map((x) => x.toLowerCase()).includes(String(s).toLowerCase())),
    }));

    res.json({ success: true, job: { id: job._id, title: job.title }, ranked });
  } catch (err) { next(err); }
};
