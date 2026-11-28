import { gameModel } from '../models/gameModel.js';
import { logAudit } from '../utils/audit.js';
import { prisma } from '../db.js';
import { emitRealtimeEvent, sendBatchNotifications } from '../services/notificationService.js';

export const getAllGames = async (req, res, next) => {
  try {
    const result = await gameModel.findAll(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getGameById = async (req, res, next) => {
  try {
    const game = await gameModel.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Гру не знайдено' });
    }
    res.json({ data: game });
  } catch (err) {
    next(err);
  }
};

export const createGame = async (req, res, next) => {
  try {
    const game = await gameModel.create(req.body);
    const io = req.app.get('io');
    const actorId = req.user?.userId ?? req.user?.id;

    await logAudit({
      userId: actorId,
      action: 'GAME_CREATED',
      entity: 'Game',
      entityId: game.id,
      details: { title: game.title },
      req,
    });

    // Оновлення в реальному часі для всіх, хто переглядає каталог
    await emitRealtimeEvent(io, 'catalog', 'game:created', { game });

    // Групове фонове сповіщення користувачів про нову гру (пропускаємо в test-режимі, щоб не смітити тестовими даними)
    if (process.env.NODE_ENV !== 'test') {
      const users = await prisma.user.findMany({
        where: actorId ? { id: { not: actorId } } : undefined,
        select: { id: true },
        take: 100,
      });

      sendBatchNotifications(
        io,
        users.map((u) => u.id),
        {
          type: 'GAME_ADDED',
          priority: 'NORMAL',
          title: 'Нова гра в каталозі',
          message: `Додано гру «${game.title}» (${game.developer})`,
          data: { gameId: game.id, slug: game.slug },
        }
      );
    }

    res.status(201).json({ data: game });
  } catch (err) {
    next(err);
  }
};

export const updateGame = async (req, res, next) => {
  try {
    const game = await gameModel.update(req.params.id, req.body);
    const io = req.app.get('io');
    const actorId = req.user?.userId ?? req.user?.id;

    await logAudit({
      userId: actorId,
      action: 'GAME_UPDATED',
      entity: 'Game',
      entityId: game.id,
      details: req.body,
      req,
    });

    await Promise.all([
      emitRealtimeEvent(io, 'catalog', 'game:updated', { game }),
      emitRealtimeEvent(io, `game:${game.id}`, 'game:updated', { game }),
    ]);

    res.json({ data: game });
  } catch (err) {
    next(err);
  }
};

export const deleteGame = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await gameModel.delete(id);
    const io = req.app.get('io');
    const actorId = req.user?.userId ?? req.user?.id;

    await logAudit({
      userId: actorId,
      action: 'GAME_DELETED',
      entity: 'Game',
      entityId: id,
      req,
    });

    await Promise.all([
      emitRealtimeEvent(io, 'catalog', 'game:deleted', { id }),
      emitRealtimeEvent(io, `game:${id}`, 'game:deleted', { id }),
    ]);

    res.json({ message: 'Гру видалено' });
  } catch (err) {
    next(err);
  }

};

export const getGames = getAllGames;