const axios = require('axios');
const SmsLog = require('../models/SmsLog');
const Employee = require('../models/Employee');

const SMSLENZ_URL = 'https://www.smslenz.lk/api';
const SMSLENZ_USER_ID = '157';
const SMSLENZ_API_KEY = '31396018-0f04-47ab-b9a8-60b2f55a8e2c';
const SMSLENZ_SENDER_ID = 'ZAGE';

/**
 * Validates and formats a phone number for SMS sending (Sri Lanka format mostly).
 * @param {string} phone 
 * @returns {string|null} The formatted phone number, or null if invalid
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  let formatted = phone.replace(/[^0-9]/g, '');
  
  if (formatted.startsWith('0')) {
    formatted = '94' + formatted.substring(1);
  } else if (formatted.startsWith('94') && formatted.length === 11) {
    // Already good
  } else if (formatted.length === 9) {
    formatted = '94' + formatted;
  }
  
  // Basic length check for Sri Lanka (94 + 9 digits = 11 digits)
  // Adapt this if you are sending internationally
  if (formatted.length >= 11) {
    return formatted;
  }
  return null;
};

/**
 * Send an SMS via SMSLenz and log it.
 * @param {string} phone - Recipient phone number
 * @param {string} message - Message body
 * @param {string} recipientName - Name of the recipient for logging
 * @param {string} module - Which module triggered this (e.g. 'leave', 'payroll')
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
const sendSms = async (phone, message, recipientName = 'Unknown', module = 'system') => {
  const formattedPhone = formatPhoneNumber(phone);
  
  if (!formattedPhone) {
    console.log(`[SMS] Invalid phone number for ${recipientName}: ${phone}`);
    await SmsLog.create({
      recipientName,
      recipientPhone: phone || 'N/A',
      message,
      module,
      status: 'failed',
      response: { error: 'Invalid phone number format' }
    });
    return false;
  }

  try {
    const https = require('https');
    const agent = new https.Agent({ rejectUnauthorized: false });
    // Some SMS APIs use 'msg' instead of 'text' or require /sendsms endpoint
    const url = `${SMSLENZ_URL}/sendsms?id=${SMSLENZ_USER_ID}&pw=${SMSLENZ_API_KEY}&to=${formattedPhone}&text=${encodeURIComponent(message)}&msg=${encodeURIComponent(message)}&mask=${SMSLENZ_SENDER_ID}`;
    const response = await axios.get(url, { httpsAgent: agent });

    // Some APIs return 200 OK but with a text body like "error" or "success".
    // Adjust based on SMSLenz actual response
    const data = response.data;
    
    await SmsLog.create({
      recipientName,
      recipientPhone: formattedPhone,
      message,
      module,
      status: 'sent',
      response: data
    });
    console.log(`[SMS] Sent successfully to ${recipientName} (${formattedPhone})`);
    return true;
  } catch (error) {
    console.error(`[SMS] Failed to send to ${formattedPhone}:`, error.message);
    await SmsLog.create({
      recipientName,
      recipientPhone: formattedPhone,
      message,
      module,
      status: 'failed',
      response: error.response?.data || error.message
    });
    return false;
  }
};

/**
 * Send an SMS to a specific employee by ID
 * @param {string} employeeId - ID of the employee
 * @param {string} message - Message body
 * @param {string} module - Module generating the SMS
 */
const sendEmployeeSms = async (employeeId, message, module) => {
  try {
    const emp = await Employee.findById(employeeId).populate('userId', 'name email');
    if (!emp) return false;
    
    const phone = emp.mobile || emp.phone;
    if (!phone) {
      console.log(`[SMS] No phone number available for employee ${emp.userId?.name || employeeId}`);
      return false;
    }
    
    return await sendSms(phone, message, emp.userId?.name || 'Employee', module);
  } catch (error) {
    console.error('[SMS] Error fetching employee for SMS:', error);
    return false;
  }
};

module.exports = {
  sendSms,
  sendEmployeeSms,
  formatPhoneNumber
};
