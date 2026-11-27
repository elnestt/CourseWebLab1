import { Router } from 'express';
import {
  getAllReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
} from '../controllers/reviewController.js';
import { validate } from '../middleware/validate.js';
import { createReviewSchema, updateReviewSchema, reviewIdSchema } from '../schemas/review.schema.js';

const router = Router();

router.get('/', getAllReviews);
router.get('/:id', validate(reviewIdSchema), getReviewById);
router.post('/', validate(createReviewSchema), createReview);
router.put('/:id', validate(updateReviewSchema), updateReview);
router.delete('/:id', validate(reviewIdSchema), deleteReview);

export default router;