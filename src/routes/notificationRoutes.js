import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  broadcastNotification,
} from '../controllers/notificationController.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Персональні та масові сповіщення в реальному часі
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Отримання списку сповіщень поточного користувача
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, NORMAL, HIGH, URGENT]
 *     responses:
 *       200:
 *         description: Список сповіщень та лічильник непрочитаних
 */
router.get('/', authenticate, getMyNotifications);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Позначити всі сповіщення як прочитані
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Усі сповіщення оновлено
 */
router.patch('/read-all', authenticate, markAllNotificationsAsRead);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Позначити конкретне сповіщення прочитаним
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Сповіщення оновлено
 */
router.patch('/:id/read', authenticate, markNotificationAsRead);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Видалити сповіщення
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Сповіщення видалено
 */
router.delete('/:id', authenticate, deleteNotification);

/**
 * @swagger
 * /api/notifications/broadcast:
 *   post:
 *     summary: Масова фонова розсилка сповіщень (ADMIN / MODERATOR)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Оновлення каталогу ігор
 *               message:
 *                 type: string
 *                 example: Додано нові релізи цього місяця!
 *               priority:
 *                 type: string
 *                 enum: [LOW, NORMAL, HIGH, URGENT]
 *                 default: HIGH
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       202:
 *         description: Розсилку додано в чергу
 */
router.post('/broadcast', authenticate, authorize('ADMIN', 'MODERATOR'), broadcastNotification);

export default router;