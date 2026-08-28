const cron = require('node-cron');
const Message = require('../models/Message');
const SiteSetting = require('../models/SiteSetting');

// Run every day at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const settings = await SiteSetting.findOne();
    if (!settings || !settings.messageAutoDeleteDays || settings.messageAutoDeleteDays <= 0) return;

    const days = settings.messageAutoDeleteDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await Message.deleteMany({ createdAt: { $lt: cutoffDate } });
    if (result.deletedCount > 0) {
      console.log(`[CRON] Auto-deleted ${result.deletedCount} messages older than ${days} days.`);
    }
  } catch (err) {
    console.error('[CRON Error] Failed to auto-delete messages:', err);
  }
});
