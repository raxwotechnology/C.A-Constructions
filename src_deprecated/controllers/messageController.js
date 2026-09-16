const Message = require('../models/Message');
const User = require('../models/User');
const { emitToUser } = require('../socket');
const { createNotification } = require('../services/notificationService');

function normalizeThreadUser(sender, recipient, me) {
  const other = String(sender._id || sender) === String(me) ? recipient : sender;
  return other;
}

exports.getContacts = async (req, res, next) => {
  try {
    let roleQuery = {};
    if (req.user.role === 'client') roleQuery = { role: { $in: ['admin', 'manager', 'developer'] }, isActive: true };
    else roleQuery = { role: 'client', isActive: true };

    const users = await User.find(roleQuery).select('name email role avatar').sort({ name: 1 });
    res.json({ success: true, users });
  } catch (err) { next(err); }
};

exports.getThreads = async (req, res, next) => {
  try {
    const me = req.user._id;
    const messages = await Message.find({ $or: [{ sender: me }, { recipient: me }] })
      .populate('sender', 'name role avatar')
      .populate('recipient', 'name role avatar')
      .sort({ createdAt: -1 })
      .limit(400);

    const map = new Map();
    for (const msg of messages) {
      const otherUser = normalizeThreadUser(msg.sender, msg.recipient, me);
      const otherId = String(otherUser._id);
      if (!map.has(otherId)) {
        map.set(otherId, {
          user: otherUser,
          lastMessage: msg.content,
          lastAt: msg.createdAt,
          unread: 0,
        });
      }
      if (String(msg.recipient._id) === String(me) && !msg.readAt) {
        const prev = map.get(otherId);
        prev.unread += 1;
        map.set(otherId, prev);
      }
    }

    res.json({ success: true, threads: Array.from(map.values()) });
  } catch (err) { next(err); }
};

exports.getThreadMessages = async (req, res, next) => {
  try {
    const me = req.user._id;
    const { userId } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: me, recipient: userId },
        { sender: userId, recipient: me },
      ],
    })
      .populate('sender', 'name role avatar')
      .populate('recipient', 'name role avatar')
      .sort({ createdAt: 1 });

    await Message.updateMany(
      { sender: userId, recipient: me, readAt: null },
      { $set: { readAt: new Date() } }
    );

    res.json({ success: true, messages });
  } catch (err) { next(err); }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { recipientId, content } = req.body;
    if (!recipientId || !content?.trim()) {
      return res.status(400).json({ success: false, message: 'recipientId and content are required' });
    }

    const recipient = await User.findById(recipientId).select('_id name role');
    if (!recipient) return res.status(404).json({ success: false, message: 'Recipient not found' });

    if (req.user.role === 'client' && recipient.role === 'client') {
      return res.status(403).json({ success: false, message: 'Clients cannot message other clients' });
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      content: content.trim(),
    });

    const hydrated = await Message.findById(message._id)
      .populate('sender', 'name role avatar')
      .populate('recipient', 'name role avatar');

    emitToUser(recipientId, 'message:new', hydrated);
    emitToUser(req.user._id, 'message:new', hydrated);

    await createNotification({
      recipient: recipientId,
      title: 'New Message',
      message: `You received a message from ${hydrated.sender.name}`,
      type: 'system',
      link: '/messages',
    });

    res.status(201).json({ success: true, message: hydrated });
  } catch (err) { next(err); }
};
