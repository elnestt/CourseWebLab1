import { Router } from 'express';
import {
  getReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
} from '../controllers/reviewController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createReviewSchema, updateReviewSchema } from '../schemas/review.schema.js';

const router = Router();

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: Отримання списку рецензій із пошуком, фільтрацією та пагінацією
 *     tags: [Reviews]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: gameId, schema: { type: integer } }
 *       - { in: query, name: userId, schema: { type: integer } }
 *       - { in: query, name: minRating, schema: { type: number } }
 *       - { in: query, name: containsSpoilers, schema: { type: boolean } }
 *     responses:
 *       200: { description: Список рецензій }
 */
router.get('/', getReviews);

/**
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     summary: Отримання рецензії за ID
 *     tags: [Reviews]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Детальна рецензія }
 *       404: { description: Рецензію не знайдено }
 */
router.get('/:id', getReviewById);

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Публікація рецензії автентифікованим користувачем
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Рецензію опубліковано }
 *       401: { description: Необхідна аутентифікація }
 */
router.post('/', authenticate, validate(createReviewSchema), createReview);

/**
 * @swagger
 * /api/reviews/{id}:
 *   put:
 *     summary: Редагування рецензії (власник або ADMIN)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Рецензію оновлено }
 */
router.put('/:id', authenticate, validate(updateReviewSchema), updateReview);

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Видалення рецензії (власник, MODERATOR або ADMIN)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       204: { description: Рецензію видалено }
 */
router.delete('/:id', authenticate, deleteReview);

export default router;