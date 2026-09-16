const mongoose = require('mongoose');
const Project = require('../server/src/models/Project');

console.log('Testing Project schema pre-validate hook...');
const p = new Project({});
p.validate().then(() => {
  console.log('Validation success! Auto-generated Name:', p.name);
  console.log('Auto-generated Code:', p.code);
}).catch(err => {
  console.error('Validation error:', err.message);
});
