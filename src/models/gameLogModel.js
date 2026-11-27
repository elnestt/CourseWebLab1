import { prisma } from '../db.js';

const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'rating', 'hoursPlayed'];

export async function findAllGameLogs({
  page = 1,
  limit = 10,
  status,
  platform,
  userId,
  gameId,
  minRating,
  sortBy = 'createdAt',
  order = 'desc',
} = {}) {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const take = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (pageNumber - 1) * take;

  const where = {};

  if (status) where.status = status;
  if (platform) where.platform = { contains: platform, mode: 'insensitive' };
  if (userId) where.userId = Number(userId);
  if (gameId) where.gameId = Number(gameId);
  if (minRating) where.rating = { gte: Number(minRating) };

  const orderField = SORTABLE_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
  const orderDirection = order === 'asc' ? 'asc' : 'desc';

  const [logs, total] = await Promise.all([
    prisma.gameLog.findMany({
      where,
      skip,
      take,
      orderBy: { [orderField]: orderDirection },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        game: { select: { id: true, title: true, slug: true, coverUrl: true } },
      },
    }),
    prisma.gameLog.count({ where }),
  ]);

  return {
    data: logs,
    pagination: {
      page: pageNumber,
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
      hasMore: skip + logs.length < total,
    },
  };
}

export function findGameLogById(id) {
  return prisma.gameLog.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      game: true,
    },
  });
}

export function createGameLogRecord(data) {
  return prisma.gameLog.create({
    data,
    include: {
      user: { select: { id: true, username: true } },
      game: { select: { id: true, title: true } },
    },
  });
}

export function updateGameLogRecord(id, data) {
  return prisma.gameLog.update({
    where: { id },
    data,
    include: {
      user: { select: { id: true, username: true } },
      game: { select: { id: true, title: true } },
    },
  });
}

export function deleteGameLogRecord(id) {
  return prisma.gameLog.delete({ where: { id } });
}