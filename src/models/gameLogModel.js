import { prisma } from '../db.js';

export const gameLogModel = {
  findAll: () =>
    prisma.gameLog.findMany({
      include: {
        user: { select: { id: true, username: true } },
        game: { select: { id: true, title: true, slug: true, coverUrl: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),

  findById: (id) =>
    prisma.gameLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true } },
        game: true,
      },
    }),

  create: (data) =>
    prisma.gameLog.create({
      data: {
        ...data,
        ...(data.status === 'COMPLETED' ? { completedAt: new Date() } : {}),
      },
      include: {
        game: { select: { id: true, title: true } },
      },
    }),

  update: (id, data) =>
    prisma.gameLog.update({
      where: { id },
      data: {
        ...data,
        ...(data.status === 'COMPLETED' ? { completedAt: new Date() } : {}),
      },
      include: {
        game: { select: { id: true, title: true } },
      },
    }),

  remove: (id) => prisma.gameLog.delete({ where: { id } }),
};