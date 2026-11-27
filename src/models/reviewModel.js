import { prisma } from '../db.js';

export const reviewModel = {
  findAll: () =>
    prisma.review.findMany({
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        game: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),

  findById: (id) =>
    prisma.review.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        game: { select: { id: true, title: true, slug: true } },
      },
    }),

  create: (data) =>
    prisma.review.create({
      data,
      include: {
        user: { select: { id: true, username: true } },
        game: { select: { id: true, title: true } },
      },
    }),

  update: (id, data) =>
    prisma.review.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, username: true } },
        game: { select: { id: true, title: true } },
      },
    }),

  remove: (id) => prisma.review.delete({ where: { id } }),
};