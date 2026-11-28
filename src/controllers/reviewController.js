import {
  findAllReviews,
  findReviewById,
  createReviewRecord,
  updateReviewRecord,
  deleteReviewRecord,
} from '../models/reviewModel.js';
import { cache } from '../utils/cache.js';
import { logAudit } from '../utils/audit.js';
import { emitRealtimeEvent } from '../services/notificationService.js';

export const getReviews = async (req, res, next) => {
  try {
    const result = await findAllReviews(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getReviewById = async (req, res, next) => {
  try {
    const review = await findReviewById(Number(req.params.id));
    if (!review) {
      return res.status(404).json({ error: 'Рецензію не знайдено' });
    }
    res.json({ data: review });
  } catch (err) {
    next(err);
  }
};

export const createReview = async (req, res, next) => {
  try {
    const userId = req.user.userId ?? req.user.id;
    const review = await createReviewRecord({ ...req.body, userId });
    const io = req.app.get('io');

    cache.invalidatePrefix('games:');

    await logAudit({
      userId,
      action: 'REVIEW_CREATED',
      entity: 'Review',
      entityId: review.id,
      details: { gameId: review.gameId, rating: review.rating },
      req,
    });

    await Promise.all([
      emitRealtimeEvent(io, 'catalog', 'review:created', { review }),
      emitRealtimeEvent(io, `game:${review.gameId}`, 'review:created', { review }),
    ]);

    res.status(201).json({ message: 'Рецензію опубліковано', data: review });
  } catch (err) {
    next(err);
  }
};

export const updateReview = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await findReviewById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Рецензію не знайдено' });
    }

    const userId = req.user.userId ?? req.user.id;
    if (existing.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Недостатньо прав для редагування цієї рецензії' });
    }

    const review = await updateReviewRecord(id, req.body);
    const io = req.app.get('io');

    cache.invalidatePrefix('games:');

    await emitRealtimeEvent(io, `game:${review.gameId}`, 'review:updated', { review });

    res.json({ message: 'Рецензію оновлено', data: review });
  } catch (err) {
    next(err);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await findReviewById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Рецензію не знайдено' });
    }

    const userId = req.user.userId ?? req.user.id;
    if (existing.userId !== userId && !['ADMIN', 'MODERATOR'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостатньо прав для видалення цієї рецензії' });
    }

    await deleteReviewRecord(id);
    const io = req.app.get('io');

    cache.invalidatePrefix('games:');

    await emitRealtimeEvent(io, `game:${existing.gameId}`, 'review:deleted', {
      id: existing.id,
      gameId: existing.gameId,
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const getAllReviews = getReviews;