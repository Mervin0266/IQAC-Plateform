const { Notification } = require('../models');

const sendNotification = async (recipientId, title, message, type = 'info') => {
  try {
    await Notification.create({
      recipientId,
      title,
      message,
      type
    });
  } catch (error) {
    console.error('✗ Notification creation failed:', error);
  }
};

module.exports = { sendNotification };
