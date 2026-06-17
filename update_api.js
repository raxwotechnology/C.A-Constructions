const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'client', 'src');

function getAllFiles(dirPath, arrayOfFiles) {
  let dirFiles = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  dirFiles.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });
  return arrayOfFiles;
}

const files = getAllFiles(srcDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.includes('/analytics/')) {
    content = content.replace(/\/analytics\/dashboard/g, '/system-metrics/dashboard');
    content = content.replace(/\/analytics\/advanced/g, '/system-metrics/advanced');
    content = content.replace(/\/analytics\/ai-predict/g, '/system-metrics/ai-predict');
    content = content.replace(/\/analytics\/notifications/g, '/system-metrics/notifications');
    changed = true;
  }

  if (content.includes('/social')) {
    content = content.replace(/api\.get\(['\`]\/social['\`]\)/g, 'api.get(\'/platform-data\')');
    content = content.replace(/api\.get\(['\`]\/social-assignments/g, 'api.get(\'/platform-assignments');
    content = content.replace(/api\.post\(['\`]\/social-assignments/g, 'api.post(\'/platform-assignments');
    content = content.replace(/api\.delete\(['\`]\/social-assignments/g, 'api.delete(\'/platform-assignments');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
