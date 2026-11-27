import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Перегляд журналу дій користувачів (лише ADMIN)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: action, schema: { type: string, example: "USER_LOGIN" } }
 *       - { in: query, name: entity, schema: { type: string, example: "Game" } }
 *       - { in: query, name: userId, schema: { type: integer } }
 *     responses:
 *       200: { description: Список записів аудиту }
 *       401: { description: Необхідна аутентифікація }
 *       403: { description: Доступ дозволено лише адміністраторам }
 */
router.get('/', authenticate, authorize('ADMIN'), getAuditLogs);

export default router;