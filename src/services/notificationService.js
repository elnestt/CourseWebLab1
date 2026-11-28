import { prisma } from '../db.js';
import { metrics } from '../utils/metrics.js';
import { jobQueue } from '../utils/queue.js';

/**
 * Зберігає подію в історію SocketEvent (для відновлення після reconnect)
 * та розсилає її клієнтам у вказану кімнату.
 */
export async function emitRealtimeEvent(io, room, event, payload) {
  let savedEvent = null;

  try {
    savedEvent = await prisma.socketEvent.create({
      data: {
        room,
        event,
        payload,
      },
    });
  } catch (err) {
    console.error('[SocketEvent Persist Error]:', err.message);
  }

  if (io) {
    const message =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? {
            ...payload,
            _eventId: savedEvent?.id ?? null,
            _timestamp: savedEvent?.createdAt ?? new Date().toISOString(),
          }
        : payload;

    io.to(room).emit(event, message);
    metrics.wsEventsEmitted += 1;
  }

  return savedEvent;
}

/**
 * Створює персональне сповіщення в БД і миттєво надсилає його користувачу по WebSocket.
 */
export async function createNotification(
  io,
  { userId, type = 'SYSTEM_ALERT', priority = 'NORMAL', title, message, data = null }
) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      priority,
      title,
      message,
      data,
    },
  });

  await emitRealtimeEvent(io, `user:${userId}`, 'notification:new', notification);
  return notification;
}

/**
 * Групове (batch) надсилання сповіщень списку користувачів через фонову чергу задач.
 */
export function sendBatchNotifications(
  io,
  userIds,
  { type = 'SYSTEM_ALERT', priority = 'NORMAL', title, message, data = null }
) {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  if (uniqueIds.length === 0) return;

  jobQueue.enqueue(`batch-notify-${uniqueIds.length}-users`, async () => {
    await prisma.notification.createMany({
      data: uniqueIds.map((userId) => ({
        userId,
        type,
        priority,
        title,
        message,
        data,
      })),
    });

    for (const userId of uniqueIds) {
      await emitRealtimeEvent(io, `user:${userId}`, 'notification:batch', {
        type,
        priority,
        title,
        message,
        data,
      });
    }
  });
}