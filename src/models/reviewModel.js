import { prisma } from '../db.js';

const SORTABLE_FIELDS = ['createdAt', 'rating', 'likesCount'];

export async function findAllReviews({
  page = 1,
  limit = 10,
  search,
  gameId,
  userId,
  minRating,
  containsSpoilers,
  sortBy = 'createdAt',
  order = 'desc',
} = {}) {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const take = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (pageNumber - 1) * take;

  const where = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (gameId) where.gameId = Number(gameId);
  if (userId) where.userId = Number(userId);
  if (minRating) where.rating = { gte: Number(minRating) };
  if (containsSpoilers !== undefined) {
    where.containsSpoilers = containsSpoilers === 'true' || containsSpoilers === true;
  }

  const orderField = SORTABLE_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
  const orderDirection = order === 'asc' ? 'asc' : 'desc';

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take,
      orderBy: { [orderField]: orderDirection },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        game: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return {
    data: reviews,
    pagination: {
      page: pageNumber,
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
      hasMore: skip + reviews.length < total,
    },
  };
}

export function findReviewById(id) {
  return prisma.review.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      game: { select: { id: true, title: true, slug: true } },
    },
  });
}

export function createReviewRecord(data) {
  return prisma.review.create({
    data,
    include: {
      user: { select: { id: true, username: true } },
      game: { select: { id: true, title: true } },
    },
  });
}

export function updateReviewRecord(id, data) {
  return prisma.review.update({
    where: { id },
    data,
    include: {
      user: { select: { id: true, username: true } },
      game: { select: { id: true, title: true } },
    },
  });
}

export function deleteReviewRecord(id) {
  return prisma.review.delete({ where: { id } });
}