const { createAuditLog } = require('./server/src/controllers/auditController');
console.log('createAuditLog type:', typeof createAuditLog);
if (typeof createAuditLog === 'function') {
  console.log('SUCCESS: createAuditLog is a function');
} else {
  console.log('FAILURE: createAuditLog is NOT a function');
}
