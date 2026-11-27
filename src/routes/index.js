import { Router } from 'express';
import authRoutes from './authRoutes.js';
import fileRoutes from './fileRoutes.js';
import auditRoutes from './auditRoutes.js';
import genreRoutes from './genreRoutes.js';
import gameRoutes from './gameRoutes.js';
import gameLogRoutes from './gameLogRoutes.js';
import reviewRoutes from './reviewRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/files', fileRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/genres', genreRoutes);
router.use('/games', gameRoutes);
router.use('/logs', gameLogRoutes);
router.use('/reviews', reviewRoutes);

export default router;