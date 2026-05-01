const multer = require('multer');
const path = require('path');
const fs = require('fs');

const createStorage = (folder) => multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads', folder);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (allowedTypes) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} not allowed. Allowed: ${allowedTypes.join(', ')}`), false);
  }
};

const imageFilter = fileFilter(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);
const documentFilter = fileFilter(['.pdf', '.doc', '.docx']);
const anyFilter = fileFilter(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.pdf', '.doc', '.docx']);

exports.uploadEmployeeFiles = (folder) => multer({
  storage: createStorage(`${folder}/images`),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'cv', maxCount: 1 },
  { name: 'agreement', maxCount: 1 }
]);

exports.uploadEmployeeCV = (folder) => multer({
  storage: createStorage(`${folder}/cv`),
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
}).single('cv');

exports.uploadEmployeeAgreement = (folder) => multer({
  storage: createStorage(`${folder}/agreements`),
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
}).single('agreement');

exports.uploadProductImage = multer({
  storage: createStorage('products'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
}).array('images', 10);

exports.uploadSocialMedia = multer({
  storage: createStorage('social_media'),
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
}).array('media', 5);

exports.uploadLogo = multer({
  storage: createStorage('logos'),
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
}).single('logo');

exports.uploadAvatar = multer({
  storage: createStorage('avatars'),
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
}).single('avatar');

exports.uploadScreenshot = multer({
  storage: createStorage('screenshots'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('screenshot');
