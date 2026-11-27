import { z } from 'zod';

const idParam = z.object({
  id: z.coerce.number().int().positive('ID запису щоденника має бути додатним цілим числом'),
});

export const createGameLogSchema = z.object({
  body: z.object({
    userId: z.coerce.number().int().positive(),
    gameId: z.coerce.number().int().positive(),
    status: z.enum(['PLAYING', 'COMPLETED', 'BACKLOG', 'DROPPED', 'WISHLIST']).default('BACKLOG'),
    rating: z.coerce.number().min(0).max(10).optional(),
    hoursPlayed: z.coerce.number().int().min(0).default(0),
    platform: z.string().min(2).max(50).default('PC'),
    optimizationTag: z.string().max(100).optional(),
  }),
});

export const updateGameLogSchema = z.object({
  params: idParam,
  body: createGameLogSchema.shape.body
    .omit({ userId: true, gameId: true })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Потрібно передати хоча б одне поле для оновлення',
    }),
});

export const gameLogIdSchema = z.object({ params: idParam });