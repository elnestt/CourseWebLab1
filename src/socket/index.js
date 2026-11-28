import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { verifyAccessToken } from '../utils/jwt.js';
import { prisma } from '../db.js';
import { metrics } from '../utils/metrics.js';

// Відстеження активних сокетів кожного користувача: userId -> Set<socketId>
const onlineUsers = new Map();

export function getOnlineUserIds() {
  return Array.from(onlineUsers.keys());
}

export async function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Горизонтальне масштабування через Redis-адаптер (якщо вказано REDIS_URL)
  if (process.env.REDIS_URL) {
    try {
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      console.log('Socket.io: підключено Redis-адаптер для горизонтального масштабування');
    } catch (err) {
      console.warn('Socket.io: не вдалося підключити Redis, використовується локальний адаптер:', err.message);
    }
  }

  // Middleware автентифікації WebSocket через JWT accessToken
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        return next(new Error('unauthorized'));
      }

      const decoded = verifyAccessToken(token);
      socket.user = {
        userId: decoded.userId ?? decoded.id,
        role: decoded.role || 'USER',
      };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId, role } = socket.user;

    // Rate limiting на вхідні події сокета (30 подій / 10 сек)
    let eventCounter = 0;
    let windowStart = Date.now();
    socket.use(([eventName], next) => {
      const now = Date.now();
      if (now - windowStart > 10000) {
        windowStart = now;
        eventCounter = 0;
      }
      eventCounter += 1;
      if (eventCounter > 30) {
        metrics.wsRateLimitHits += 1;
        socket.emit('error:ws', {
          code: 'RATE_LIMITED',
          message: `Перевищено ліміт частоти подій (${eventName})`,
        });
        return;
      }
      next();
    });

    // Автоматичне приєднання до персональної кімнати та глобального каталогу
    socket.join(`user:${userId}`);
    socket.join('catalog');

    // Реєстрація онлайн-статусу
    const wasOffline = !onlineUsers.has(userId);
    if (wasOffline) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    if (wasOffline) {
      io.to('catalog').emit('presence:online', {
        userId,
        onlineUsers: getOnlineUserIds(),
      });
    }

    // Приєднання до кімнати (наприклад, game:1, reviews, project:7)
    socket.on('room:join', (room, ack) => {
      try {
        if (typeof room !== 'string' || !/^[a-zA-Z0-9:_-]{1,64}$/.test(room)) {
          const errObj = { ok: false, error: 'Некоректна назва кімнати' };
          socket.emit('error:ws', { code: 'INVALID_ROOM', message: errObj.error });
          return ack?.(errObj);
        }

        // Забороняємо підписку на чужі приватні кімнати user:*
        if (room.startsWith('user:') && room !== `user:${userId}` && role !== 'ADMIN') {
          const errObj = { ok: false, error: 'Доступ до чужої приватної кімнати заборонено' };
          socket.emit('error:ws', { code: 'FORBIDDEN_ROOM', message: errObj.error });
          return ack?.(errObj);
        }

        socket.join(room);
        ack?.({ ok: true, room });
      } catch (err) {
        socket.emit('error:ws', { code: 'ROOM_JOIN_ERROR', message: err.message });
        ack?.({ ok: false, error: err.message });
      }
    });

    // Вихід із кімнати
    socket.on('room:leave', (room, ack) => {
      if (typeof room === 'string' && room !== `user:${userId}`) {
        socket.leave(room);
      }
      ack?.({ ok: true, room });
    });

    // Отримання списку користувачів онлайн
    socket.on('presence:list', (ack) => {
      ack?.({ ok: true, onlineUsers: getOnlineUserIds() });
    });

    // Відновлення пропущених подій після перепідключення (reconnection recovery)
    socket.on('events:sync', async ({ lastEventId = 0, rooms = [] } = {}, ack) => {
      try {
        const sinceId = Math.max(0, parseInt(lastEventId, 10) || 0);
        const allowedRooms = new Set([`user:${userId}`, 'catalog']);

        if (Array.isArray(rooms)) {
          for (const r of rooms) {
            if (typeof r === 'string' && (!r.startsWith('user:') || r === `user:${userId}`)) {
              allowedRooms.add(r);
            }
          }
        }

        const missedEvents = await prisma.socketEvent.findMany({
          where: {
            id: { gt: sinceId },
            room: { in: Array.from(allowedRooms) },
          },
          orderBy: { id: 'asc' },
          take: 100,
        });

        ack?.({ ok: true, events: missedEvents });
      } catch (err) {
        socket.emit('error:ws', { code: 'SYNC_ERROR', message: err.message });
        ack?.({ ok: false, error: err.message });
      }
    });

    // Відключення сокета та оновлення онлайн-статусу
    socket.on('disconnect', () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.to('catalog').emit('presence:offline', {
            userId,
            onlineUsers: getOnlineUserIds(),
          });
        }
      }
    });
  });

  return io;
}