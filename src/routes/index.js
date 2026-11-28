import { Router } from 'express';
import authRoutes from './authRoutes.js';
import fileRoutes from './fileRoutes.js';
import auditRoutes from './auditRoutes.js';
import gameRoutes from './gameRoutes.js';
import genreRoutes from './genreRoutes.js';
import gameLogRoutes from './gameLogRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import { metrics } from '../utils/metrics.js';

const router = Router();

/**
 * @swagger
 * /api/metrics:
 *   get:
 *     summary: Метрики продуктивності сервера, кешу, черги та WebSocket
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Поточні метрики стану застосунку
 */
router.get('/metrics', (req, res) => {
  res.json(metrics.snapshot(req.app.get('io')));
});

router.use('/auth', authRoutes);
router.use('/files', fileRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/games', gameRoutes);
router.use('/genres', genreRoutes);
router.use('/logs', gameLogRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);

export default router;