const Message = require('../models/Message');
const User = require('../models/User');
const ChatGroup = require('../models/ChatGroup');
const { emitToUser } = require('../socket');
const { createNotification } = require('../services/notificationService');

function normalizeThreadUser(sender, recipient, me) {
  const other = String(sender._id || sender) === String(me) ? recipient : sender;
  return other;
}

exports.getContacts = async (req, res, next) => {
  try {
    let roleQuery = { isActive: true, _id: { $ne: req.user._id } };
    if (req.user.role === 'client') {
      roleQuery.role = { $ne: 'client' };
    }

    const users = await User.find(roleQuery).select('name email role avatar').sort({ name: 1 });
    const groups = await ChatGroup.find({ members: req.user._id }).sort({ name: 1 });

    res.json({ success: true, users, groups });
  } catch (err) { next(err); }
};

exports.getThreads = async (req, res, next) => {
  try {
    const me = req.user._id;
    const myGroups = await ChatGroup.find({ members: me });
    const groupIds = myGroups.map(g => g._id);

    const messages = await Message.find({
      $or: [{ sender: me }, { recipient: me }, { group: { $in: groupIds } }]
    })
      .populate('sender', 'name role avatar')
      .populate('recipient', 'name role avatar')
      .populate('group', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(500);

    const map = new Map();
    for (const msg of messages) {
      if (msg.group) {
        const gId = String(msg.group._id);
        if (!map.has(gId)) {
          map.set(gId, {
            group: msg.group,
            lastMessage: msg.content,
            lastAt: msg.createdAt,
            unread: 0,
          });
        }
      } else if (msg.recipient && msg.sender) {
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
    }

    res.json({ success: true, threads: Array.from(map.values()) });
  } catch (err) { next(err); }
};

exports.getThreadMessages = async (req, res, next) => {
  try {
    const me = req.user._id;
    const { id } = req.params;

    const group = await ChatGroup.findById(id);
    let messages = [];

    if (group) {
      messages = await Message.find({ group: group._id })
        .populate('sender', 'name role avatar')
        .sort({ createdAt: 1 });
    } else {
      messages = await Message.find({
        $or: [
          { sender: me, recipient: id },
          { sender: id, recipient: me },
        ],
      })
        .populate('sender', 'name role avatar')
        .populate('recipient', 'name role avatar')
        .sort({ createdAt: 1 });

      await Message.updateMany(
        { sender: id, recipient: me, readAt: null },
        { $set: { readAt: new Date() } }
      );
    }

    res.json({ success: true, messages });
  } catch (err) { next(err); }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { recipientId, groupId, content } = req.body;
    if (!content?.trim() || (!recipientId && !groupId)) {
      return res.status(400).json({ success: false, message: 'Recipient or group and content are required' });
    }

    let message;
    if (groupId) {
      const group = await ChatGroup.findById(groupId);
      if (!group || !group.members.includes(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Not a member of this group' });
      }
      message = await Message.create({
        sender: req.user._id,
        group: groupId,
        content: content.trim(),
      });
      const hydrated = await Message.findById(message._id)
        .populate('sender', 'name role avatar')
        .populate('group', 'name avatar');

      group.members.forEach(memberId => {
        emitToUser(memberId, 'message:new', hydrated);
      });
      
      return res.status(201).json({ success: true, message: hydrated });
    } else {
      const recipient = await User.findById(recipientId).select('_id name role');
      if (!recipient) return res.status(404).json({ success: false, message: 'Recipient not found' });

      if (req.user.role === 'client' && recipient.role === 'client') {
        return res.status(403).json({ success: false, message: 'Clients cannot message other clients' });
      }

      message = await Message.create({
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
    }
  } catch (err) { next(err); }
};

exports.createGroup = async (req, res, next) => {
  try {
    const { name, memberIds } = req.body;
    if (!name || !memberIds || memberIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Name and members are required' });
    }
    
    const members = new Set(memberIds);
    members.add(req.user._id.toString());
    
    const group = await ChatGroup.create({
      name,
      members: Array.from(members),
      admins: [req.user._id],
      createdBy: req.user._id,
    });
    
    res.status(201).json({ success: true, group });
  } catch (err) { next(err); }
};
