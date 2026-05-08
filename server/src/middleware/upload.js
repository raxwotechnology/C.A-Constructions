const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Local storage for CVs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/cvs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `cv-${unique}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only PDF, DOC, DOCX files are allowed'), false);
};

exports.uploadCV = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
}).single('cv');

// Avatar upload (memory for Cloudinary)
const memStorage = multer.memoryStorage();
exports.uploadImage = multer({
  storage: memStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'), false);
  },
  limits: { fileSize: 2 * 1024 * 1024 }
}).single('avatar');

// Local image upload for profile/site/portfolio/services
const imageDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/images');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `img-${unique}${path.extname(file.originalname)}`);
  }
});

exports.uploadImageLocal = multer({
  storage: imageDiskStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'), false);
  },
  limits: { fileSize: 4 * 1024 * 1024 }
}).single('image');

// ── Agreement upload (PDF, DOC, DOCX, images) ──────────
const agreementStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/agreements');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `agreement-${unique}${path.extname(file.originalname)}`);
  }
});

exports.uploadAgreement = multer({
  storage: agreementStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX, JPG, PNG files are allowed'), false);
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
}).single('agreement');

// ── Bill / Receipt upload (PDF, images) ─────────────────
const billStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/bills');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `bill-${unique}${path.extname(file.originalname)}`);
  }
});

exports.uploadBill = multer({
  storage: billStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, JPG, PNG, WEBP files are allowed'), false);
  },
  limits: { fileSize: 8 * 1024 * 1024 } // 8MB
}).single('bill');
