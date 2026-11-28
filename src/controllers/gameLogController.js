import {
  findAllGameLogs,
  findGameLogById,
  createGameLogRecord,
  updateGameLogRecord,
  deleteGameLogRecord,
} from '../models/gameLogModel.js';
import { cache } from '../utils/cache.js';
import { logAudit } from '../utils/audit.js';
import { createNotification, emitRealtimeEvent } from '../services/notificationService.js';

export const getGameLogs = async (req, res, next) => {
  try {
    const result = await findAllGameLogs(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getGameLogById = async (req, res, next) => {
  try {
    const log = await findGameLogById(Number(req.params.id));
    if (!log) {
      return res.status(404).json({ error: 'Запис у щоденнику не знайдено' });
    }
    res.json({ data: log });
  } catch (err) {
    next(err);
  }
};

export const createGameLog = async (req, res, next) => {
  try {
    const userId = req.user.userId ?? req.user.id;
    const log = await createGameLogRecord({ ...req.body, userId });
    const io = req.app.get('io');

    cache.invalidatePrefix('games:');

    await logAudit({
      userId,
      action: 'GAMELOG_CREATED',
      entity: 'GameLog',
      entityId: log.id,
      details: { gameId: log.gameId, status: log.status },
      req,
    });

    await Promise.all([
      emitRealtimeEvent(io, `user:${userId}`, 'gamelog:created', { log }),
      emitRealtimeEvent(io, `game:${log.gameId}`, 'gamelog:created', { log }),
    ]);

    if (log.status === 'COMPLETED') {
      await createNotification(io, {
        userId,
        type: 'LOG_MILESTONE',
        priority: 'HIGH',
        title: 'Гру пройдено!',
        message: `Вітаємо із завершенням проходження гри (ID #${log.gameId})!`,
        data: { logId: log.id, gameId: log.gameId },
      });
    }

    res.status(201).json({ message: 'Гру додано до щоденника', data: log });
  } catch (err) {
    next(err);
  }
};

export const updateGameLog = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await findGameLogById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Запис у щоденнику не знайдено' });
    }

    const userId = req.user.userId ?? req.user.id;
    if (existing.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Недостатньо прав для редагування цього запису' });
    }

    const log = await updateGameLogRecord(id, req.body);
    const io = req.app.get('io');

    cache.invalidatePrefix('games:');

    await Promise.all([
      emitRealtimeEvent(io, `user:${userId}`, 'gamelog:updated', { log }),
      emitRealtimeEvent(io, `game:${log.gameId}`, 'gamelog:updated', { log }),
    ]);

    if (existing.status !== 'COMPLETED' && log.status === 'COMPLETED') {
      await createNotification(io, {
        userId,
        type: 'LOG_MILESTONE',
        priority: 'HIGH',
        title: 'Нове досягнення: проходження завершено!',
        message: `Статус гри (ID #${log.gameId}) змінено на COMPLETED.`,
        data: { logId: log.id, gameId: log.gameId },
      });
    }

    res.json({ message: 'Запис у щоденнику оновлено', data: log });
  } catch (err) {
    next(err);
  }
};

export const deleteGameLog = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await findGameLogById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Запис у щоденнику не знайдено' });
    }

    const userId = req.user.userId ?? req.user.id;
    if (existing.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Недостатньо прав для видалення цього запису' });
    }

    await deleteGameLogRecord(id);
    const io = req.app.get('io');

    cache.invalidatePrefix('games:');

    await Promise.all([
      emitRealtimeEvent(io, `user:${userId}`, 'gamelog:deleted', { id: existing.id }),
      emitRealtimeEvent(io, `game:${existing.gameId}`, 'gamelog:deleted', { id: existing.id }),
    ]);

    res.json({ message: 'Запис у щоденнику видалено' });
  } catch (err) {
    next(err);
  }
};

export const getAllLogs = getGameLogs;
export const getLogById = getGameLogById;
export const createLog = createGameLog;
export const updateLog = updateGameLog;
export const deleteLog = deleteGameLog;