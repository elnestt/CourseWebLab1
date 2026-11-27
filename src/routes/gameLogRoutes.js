import { Router } from 'express';
import {
  getGameLogs,
  getGameLogById,
  createGameLog,
  updateGameLog,
  deleteGameLog,
} from '../controllers/gameLogController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createGameLogSchema, updateGameLogSchema } from '../schemas/gameLog.schema.js';

const router = Router();

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Отримання записів ігрового щоденника з фільтрацією та пагінацією
 *     tags: [GameLogs]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
 *       - { in: query, name: status, schema: { type: string, enum: [PLAYING, COMPLETED, BACKLOG, DROPPED, WISHLIST] } }
 *       - { in: query, name: platform, schema: { type: string, example: "PC" } }
 *       - { in: query, name: minRating, schema: { type: number, example: 8.5 } }
 *       - { in: query, name: userId, schema: { type: integer } }
 *       - { in: query, name: gameId, schema: { type: integer } }
 *     responses:
 *       200: { description: Список записів щоденника }
 */
router.get('/', getGameLogs);

/**
 * @swagger
 * /api/logs/{id}:
 *   get:
 *     summary: Отримання запису щоденника за ID
 *     tags: [GameLogs]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Запис щоденника }
 *       404: { description: Запис не знайдено }
 */
router.get('/:id', getGameLogById);

/**
 * @swagger
 * /api/logs:
 *   post:
 *     summary: Додавання гри до щоденника автентифікованого користувача
 *     tags: [GameLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Запис додано }
 *       401: { description: Необхідна аутентифікація }
 */
router.post('/', authenticate, validate(createGameLogSchema), createGameLog);

/**
 * @swagger
 * /api/logs/{id}:
 *   put:
 *     summary: Оновлення запису щоденника (власник або ADMIN)
 *     tags: [GameLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Запис оновлено }
 *       403: { description: Недостатньо прав }
 */
router.put('/:id', authenticate, validate(updateGameLogSchema), updateGameLog);

/**
 * @swagger
 * /api/logs/{id}:
 *   delete:
 *     summary: Видалення запису зі щоденника (власник або ADMIN)
 *     tags: [GameLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       204: { description: Запис видалено }
 *       403: { description: Недостатньо прав }
 */
router.delete('/:id', authenticate, deleteGameLog);

export default router;