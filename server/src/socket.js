const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

let io;
const userSocketMap = new Map();

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.CLIENT_URL || 'https://manage.raxwo.net',
        'http://localhost:5173',
        'http://localhost:3000',
      ],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id role isActive');
      if (!user || !user.isActive) return next(new Error('Unauthorized'));
      socket.user = { id: String(user._id), role: user.role };
      return next();
    } catch (error) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    userSocketMap.set(socket.user.id, socket.id);
    socket.join(`user:${socket.user.id}`);

    socket.on('disconnect', () => {
      userSocketMap.delete(socket.user.id);
    });
  });

  return io;
}

function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${String(userId)}`).emit(event, payload);
}

module.exports = { initSocket, emitToUser };
