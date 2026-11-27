import { Router } from 'express';
import {
  getAllGameLogs,
  getGameLogById,
  createGameLog,
  updateGameLog,
  deleteGameLog,
} from '../controllers/gameLogController.js';
import { validate } from '../middleware/validate.js';
import { createGameLogSchema, updateGameLogSchema, gameLogIdSchema } from '../schemas/gameLog.schema.js';

const router = Router();

router.get('/', getAllGameLogs);
router.get('/:id', validate(gameLogIdSchema), getGameLogById);
router.post('/', validate(createGameLogSchema), createGameLog);
router.put('/:id', validate(updateGameLogSchema), updateGameLog);
router.delete('/:id', validate(gameLogIdSchema), deleteGameLog);

export default router;