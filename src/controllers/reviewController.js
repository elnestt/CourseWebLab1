import {
  findAllReviews,
  findReviewById,
  createReviewRecord,
  updateReviewRecord,
  deleteReviewRecord,
} from '../models/reviewModel.js';

export async function getReviews(req, res) {
  const result = await findAllReviews(req.query);
  res.json(result);
}

export async function getReviewById(req, res) {
  const review = await findReviewById(Number(req.params.id));
  if (!review) {
    return res.status(404).json({ error: 'Рецензію не знайдено' });
  }
  res.json({ data: review });
}

export async function createReview(req, res) {
  const userId = req.user?.userId ?? req.body.userId;
  const review = await createReviewRecord({ ...req.body, userId });
  res.status(201).json({ message: 'Рецензію опубліковано', data: review });
}

export async function updateReview(req, res) {
  const id = Number(req.params.id);
  const existing = await findReviewById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Рецензію не знайдено' });
  }

  if (req.user && existing.userId !== req.user.userId && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Недостатньо прав для редагування цієї рецензії' });
  }

  const review = await updateReviewRecord(id, req.body);
  res.json({ message: 'Рецензію оновлено', data: review });
}

export async function deleteReview(req, res) {
  const id = Number(req.params.id);
  const existing = await findReviewById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Рецензію не знайдено' });
  }

  if (req.user && existing.userId !== req.user.userId && req.user.role !== 'ADMIN' && req.user.role !== 'MODERATOR') {
    return res.status(403).json({ error: 'Недостатньо прав для видалення цієї рецензії' });
  }

  await deleteReviewRecord(id);
  res.status(204).end();
}