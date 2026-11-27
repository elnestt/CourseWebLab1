import { Router } from 'express';
import {
  getAllGenres,
  getGenreById,
  createGenre,
  updateGenre,
  deleteGenre,
} from '../controllers/genreController.js';
import { validate } from '../middleware/validate.js';
import { createGenreSchema, updateGenreSchema, genreIdSchema } from '../schemas/genre.schema.js';

const router = Router();

router.get('/', getAllGenres);
router.get('/:id', validate(genreIdSchema), getGenreById);
router.post('/', validate(createGenreSchema), createGenre);
router.put('/:id', validate(updateGenreSchema), updateGenre);
router.delete('/:id', validate(genreIdSchema), deleteGenre);

export default router;