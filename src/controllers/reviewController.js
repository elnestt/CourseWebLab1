import { reviewModel } from '../models/reviewModel.js';
import { AppError } from '../utils/AppError.js';

export async function getAllReviews(_req, res) {
  const reviews = await reviewModel.findAll();
  res.json({ data: reviews });
}

export async function getReviewById(req, res) {
  const review = await reviewModel.findById(req.validated.params.id);
  if (!review) throw new AppError('Рецензію не знайдено', 404);
  res.json({ data: review });
}

export async function createReview(req, res) {
  const review = await reviewModel.create(req.validated.body);
  res.status(201).json({ message: 'Рецензію опубліковано', data: review });
}

export async function updateReview(req, res) {
  const review = await reviewModel.update(req.validated.params.id, req.validated.body);
  res.json({ message: 'Рецензію оновлено', data: review });
}

export async function deleteReview(req, res) {
  await reviewModel.remove(req.validated.params.id);
  res.status(204).end();
}