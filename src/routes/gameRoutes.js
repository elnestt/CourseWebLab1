import { Router } from 'express';
import {
  getAllGames,
  getGameById,
  createGame,
  updateGame,
  deleteGame,
} from '../controllers/gameController.js';
import { validate } from '../middleware/validate.js';
import { createGameSchema, updateGameSchema, gameIdSchema } from '../schemas/game.schema.js';

const router = Router();

router.get('/', getAllGames);
router.get('/:id', validate(gameIdSchema), getGameById);
router.post('/', validate(createGameSchema), createGame);
router.put('/:id', validate(updateGameSchema), updateGame);
router.delete('/:id', validate(gameIdSchema), deleteGame);

export default router;