import { Router } from 'express';
import {
  getGenres,
  getGenreById,
  createGenre,
  updateGenre,
  deleteGenre,
} from '../controllers/genreController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createGenreSchema, updateGenreSchema } from '../schemas/genre.schema.js';

const router = Router();

/**
 * @swagger
 * /api/genres:
 *   get:
 *     summary: Отримання списку жанрів із пошуком та пагінацією
 *     tags: [Genres]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses:
 *       200: { description: Список жанрів }
 */
router.get('/', getGenres);

/**
 * @swagger
 * /api/genres/{id}:
 *   get:
 *     summary: Отримання жанру за ID
 *     tags: [Genres]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Дані жанру }
 *       404: { description: Жанр не знайдено }
 */
router.get('/:id', getGenreById);

/**
 * @swagger
 * /api/genres:
 *   post:
 *     summary: Створення нового жанру (ADMIN або MODERATOR)
 *     tags: [Genres]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Жанр створено }
 *       403: { description: Недостатньо прав }
 */
router.post('/', authenticate, authorize('ADMIN', 'MODERATOR'), validate(createGenreSchema), createGenre);

/**
 * @swagger
 * /api/genres/{id}:
 *   put:
 *     summary: Оновлення жанру (ADMIN або MODERATOR)
 *     tags: [Genres]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Жанр оновлено }
 */
router.put('/:id', authenticate, authorize('ADMIN', 'MODERATOR'), validate(updateGenreSchema), updateGenre);

/**
 * @swagger
 * /api/genres/{id}:
 *   delete:
 *     summary: Видалення жанру (лише ADMIN)
 *     tags: [Genres]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       204: { description: Жанр видалено }
 */
router.delete('/:id', authenticate, authorize('ADMIN'), deleteGenre);

export default router;