import { prisma } from '../db.js';

export const gameModel = {
  findAll: () =>
    prisma.game.findMany({
      include: {
        genre: { select: { id: true, name: true, slug: true } },
        _count: { select: { logs: true, reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),

  findById: (id) =>
    prisma.game.findUnique({
      where: { id },
      include: {
        genre: true,
        reviews: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    }),

  create: (data) =>
    prisma.game.create({
      data,
      include: { genre: true },
    }),

  update: (id, data) =>
    prisma.game.update({
      where: { id },
      data,
      include: { genre: true },
    }),

  remove: (id) => prisma.game.delete({ where: { id } }),
};