import { prisma } from '../db.js';

export const genreModel = {
  findAll: () =>
    prisma.genre.findMany({
      include: { _count: { select: { games: true } } },
      orderBy: { id: 'asc' },
    }),

  findById: (id) =>
    prisma.genre.findUnique({
      where: { id },
      include: { games: true },
    }),

  create: (data) => prisma.genre.create({ data }),

  update: (id, data) => prisma.genre.update({ where: { id }, data }),

  remove: (id) => prisma.genre.delete({ where: { id } }),
};