const mongoose = require('mongoose');

/** Strip invalid/empty ObjectId fields from work-log tasks before MongoDB save. */
function sanitizeWorkLogTasks(tasks) {
  if (!Array.isArray(tasks)) return [];

  return tasks
    .filter((t) => t && String(t.taskName || t.name || '').trim())
    .map((t) => {
      const out = {
        taskName: String(t.taskName || t.name || '').trim(),
        hours: Number(t.hours) || 0,
        notes: String(t.notes || ''),
      };

      const rawProject = t.project;
      if (rawProject != null && String(rawProject).trim() !== '') {
        const id = String(rawProject).trim();
        if (mongoose.Types.ObjectId.isValid(id)) {
          out.project = new mongoose.Types.ObjectId(id);
        }
      }
      return out;
    })
    .filter((t) => t.hours > 0 && t.taskName);
}

module.exports = { sanitizeWorkLogTasks };
