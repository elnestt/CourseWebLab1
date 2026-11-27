import { Router } from 'express';
import genreRoutes from './genreRoutes.js';
import gameRoutes from './gameRoutes.js';
import gameLogRoutes from './gameLogRoutes.js';
import reviewRoutes from './reviewRoutes.js';

const router = Router();

router.use('/genres', genreRoutes);
router.use('/games', gameRoutes);
router.use('/logs', gameLogRoutes);
router.use('/reviews', reviewRoutes);

export default router;