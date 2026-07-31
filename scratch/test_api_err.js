const express = require('express');
const app = require('../server/src/app');
const mongoose = require('mongoose');

console.log('Testing app routes locally...');
// Test calling employee controller directly
const employeeController = require('../server/src/controllers/employeeController');

const req = { query: { assignable: '1' } };
const res = {
  json: (d) => console.log('Employees Result:', d?.count || d),
  status: (s) => { console.log('Status:', s); return res; }
};
const next = (err) => console.error('Employee Error:', err);

employeeController.getEmployees(req, res, next);
