import { Router } from 'express';
import {
  register,
  login,
  getMe,
  refresh,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/auth.schema.js';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Реєстрація нового користувача
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, username, password]
 *             properties:
 *               email: { type: string, format: email, example: "gamer@example.com" }
 *               username: { type: string, minLength: 3, example: "dark_knight" }
 *               password: { type: string, minLength: 8, example: "StrongPass123" }
 *               bio: { type: string, example: "Фанат Souls-like ігор" }
 *     responses:
 *       201: { description: Користувача успішно зареєстровано }
 *       400: { description: Помилка валідації вхідних даних }
 *       409: { description: Користувач із таким email або нікнеймом вже існує }
 */
router.post('/register', validate(registerSchema), register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вхід користувача та отримання пари JWT токенів
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: "gamer@example.com" }
 *               password: { type: string, example: "StrongPass123" }
 *     responses:
 *       200: { description: Успішний вхід }
 *       400: { description: Помилка валідації }
 *       401: { description: Невірний email або пароль }
 */
router.post('/login', validate(loginSchema), login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Отримання профілю поточного автентифікованого користувача
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Дані профілю користувача }
 *       401: { description: Токен відсутній або недійсний }
 */
router.get('/me', authenticate, getMe);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Оновлення пари токенів (ротація refresh токена)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Токени успішно оновлено }
 *       401: { description: Недійсний або відкликаний refresh токен }
 */
router.post('/refresh', validate(refreshSchema), refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Вихід із системи (відкликання refresh токена)
 *     tags: [Authentication]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       204: { description: Сесію завершено, токен відкликано }
 */
router.post('/logout', logout);

/**
 * @swagger
 * /api/auth/change-password:
 *   patch:
 *     summary: Зміна пароля поточного користувача
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, example: "StrongPass123" }
 *               newPassword: { type: string, minLength: 8, example: "NewStrongPass456" }
 *     responses:
 *       200: { description: Пароль успішно змінено }
 *       401: { description: Невірний поточний пароль або токен }
 */
router.patch('/change-password', authenticate, validate(changePasswordSchema), changePassword);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Запит на відновлення забутого пароля
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email, example: "gamer@example.com" }
 *     responses:
 *       200: { description: Запит оброблено }
 */
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Встановлення нового пароля за токеном відновлення
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string, minLength: 8, example: "RecoveredPass789" }
 *     responses:
 *       200: { description: Пароль успішно відновлено }
 *       400: { description: Недійсний або прострочений токен відновлення }
 */
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

export default router;