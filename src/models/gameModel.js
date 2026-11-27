import { prisma } from '../db.js';

const SORTABLE_FIELDS = ['createdAt', 'title', 'releaseYear'];

export async function findAllGames({
  page = 1,
  limit = 10,
  search,
  genreId,
  minYear,
  maxYear,
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
      { developer: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (genreId) {
    where.genreId = Number(genreId);
  }

  if (minYear || maxYear) {
    where.releaseYear = {};
    if (minYear) where.releaseYear.gte = Number(minYear);
    if (maxYear) where.releaseYear.lte = Number(maxYear);
  }

  const orderField = SORTABLE_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
  const orderDirection = order === 'asc' ? 'asc' : 'desc';

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      skip,
      take,
      orderBy: { [orderField]: orderDirection },
      include: {
        genre: { select: { id: true, name: true, slug: true } },
        _count: { select: { logs: true, reviews: true } },
      },
    }),
    prisma.game.count({ where }),
  ]);

  return {
    data: games,
    pagination: {
      page: pageNumber,
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
      hasMore: skip + games.length < total,
    },
  };
}

export function findGameById(id) {
  return prisma.game.findUnique({
    where: { id },
    include: {
      genre: true,
      reviews: {
        include: { user: { select: { id: true, username: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { logs: true, reviews: true } },
    },
  });
}

export function createGameRecord(data) {
  return prisma.game.create({
    data,
    include: { genre: { select: { id: true, name: true, slug: true } } },
  });
}

export function updateGameRecord(id, data) {
  return prisma.game.update({
    where: { id },
    data,
    include: { genre: { select: { id: true, name: true, slug: true } } },
  });
}

export function deleteGameRecord(id) {
  return prisma.game.delete({ where: { id } });
}