const path = require('path');
const fs = require('fs');

/** Stable uploads root (Hostinger cwd may differ from the server package). */
function getUploadsRoot() {
  if (process.env.UPLOADS_DIR) {
    return path.resolve(process.env.UPLOADS_DIR);
  }
  return path.resolve(__dirname, '../../uploads');
}

function ensureUploadSubdirs(subs = ['documents', 'images', 'cvs', 'agreements', 'bills', 'worklogs', 'requests']) {
  const root = getUploadsRoot();
  subs.forEach((sub) => {
    fs.mkdirSync(path.join(root, sub), { recursive: true });
  });
  return root;
}

function uploadSubdir(name) {
  return path.join(getUploadsRoot(), name);
}

/** Store only `/uploads/...` in the database so any API host works with mediaUrl(). */
function toRelativeUploadUrl(urlOrPath) {
  if (!urlOrPath || typeof urlOrPath !== 'string') return '';
  const trimmed = urlOrPath.trim();
  if (!trimmed) return '';
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const u = new URL(trimmed);
      if (u.pathname.startsWith('/uploads/')) return u.pathname;
    }
  } catch {
    /* ignore */
  }
  if (trimmed.startsWith('/uploads/')) return trimmed;
  if (trimmed.startsWith('uploads/')) return `/${trimmed}`;
  return trimmed;
}

function relativeUploadPath(subdir, filename) {
  return `/uploads/${subdir}/${filename}`;
}

module.exports = {
  getUploadsRoot,
  ensureUploadSubdirs,
  uploadSubdir,
  toRelativeUploadUrl,
  relativeUploadPath,
};
