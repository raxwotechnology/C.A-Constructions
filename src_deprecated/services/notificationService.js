const Notification = require('../models/Notification');
const { emitToUser } = require('../socket');

async function createNotification({
  recipient,
  title,
  message,
  type = 'system',
  link = '',
}) {
  if (!recipient || !title || !message) return null;
  const notif = await Notification.create({ recipient, title, message, type, link });
  emitToUser(recipient, 'notification:new', notif);
  return notif;
}

module.exports = { createNotification };
