import { Router } from 'express';
import {
  getGames,
  getGameById,
  createGame,
  updateGame,
  deleteGame,
} from '../controllers/gameController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createGameSchema, updateGameSchema } from '../schemas/game.schema.js';

const router = Router();

/**
 * @swagger
 * /api/games:
 *   get:
 *     summary: Отримання каталогу ігор із пошуком, фільтрацією та пагінацією
 *     tags: [Games]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
 *       - { in: query, name: search, schema: { type: string, example: "Blood" } }
 *       - { in: query, name: genreId, schema: { type: integer } }
 *       - { in: query, name: minYear, schema: { type: integer, example: 2015 } }
 *       - { in: query, name: maxYear, schema: { type: integer, example: 2026 } }
 *       - { in: query, name: sortBy, schema: { type: string, enum: [createdAt, title, releaseYear] } }
 *       - { in: query, name: order, schema: { type: string, enum: [asc, desc] } }
 *     responses:
 *       200: { description: Список ігор та метадані пагінації }
 */
router.get('/', getGames);

/**
 * @swagger
 * /api/games/{id}:
 *   get:
 *     summary: Отримання детальної картки гри за ID
 *     tags: [Games]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Детальна інформація про гру }
 *       404: { description: Гру не знайдено }
 */
router.get('/:id', getGameById);

/**
 * @swagger
 * /api/games:
 *   post:
 *     summary: Додавання нової гри до каталогу (ADMIN або MODERATOR)
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, slug, developer, releaseYear, genreId]
 *             properties:
 *               title: { type: string, example: "Dark Souls III" }
 *               slug: { type: string, example: "dark-souls-3" }
 *               developer: { type: string, example: "FromSoftware" }
 *               releaseYear: { type: integer, example: 2016 }
 *               genreId: { type: integer, example: 1 }
 *               description: { type: string }
 *     responses:
 *       201: { description: Гру додано }
 *       401: { description: Необхідна аутентифікація }
 *       403: { description: Недостатньо прав }
 */
router.post('/', authenticate, authorize('ADMIN', 'MODERATOR'), validate(createGameSchema), createGame);

/**
 * @swagger
 * /api/games/{id}:
 *   put:
 *     summary: Оновлення даних гри (ADMIN або MODERATOR)
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Дані гри оновлено }
 *       403: { description: Недостатньо прав }
 *       404: { description: Гру не знайдено }
 */
router.put('/:id', authenticate, authorize('ADMIN', 'MODERATOR'), validate(updateGameSchema), updateGame);

/**
 * @swagger
 * /api/games/{id}:
 *   delete:
 *     summary: Видалення гри з каталогу (лише ADMIN)
 *     tags: [Games]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       204: { description: Гру видалено }
 *       403: { description: Недостатньо прав }
 *       404: { description: Гру не знайдено }
 */
router.delete('/:id', authenticate, authorize('ADMIN'), deleteGame);

export default router;