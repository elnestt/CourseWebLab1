import { prisma } from '../db.js';

export async function findAllGenres({ page = 1, limit = 10, search } = {}) {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const take = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (pageNumber - 1) * take;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [genres, total] = await Promise.all([
    prisma.genre.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      include: { _count: { select: { games: true } } },
    }),
    prisma.genre.count({ where }),
  ]);

  return {
    data: genres,
    pagination: {
      page: pageNumber,
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
      hasMore: skip + genres.length < total,
    },
  };
}

export function findGenreById(id) {
  return prisma.genre.findUnique({
    where: { id },
    include: { games: true },
  });
}

export function createGenreRecord(data) {
  return prisma.genre.create({ data });
}

export function updateGenreRecord(id, data) {
  return prisma.genre.update({ where: { id }, data });
}

export function deleteGenreRecord(id) {
  return prisma.genre.delete({ where: { id } });
}