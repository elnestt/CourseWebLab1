import { z } from 'zod';

const idParam = z.object({
  id: z.coerce.number().int().positive('ID гри має бути додатним цілим числом'),
});

export const createGameSchema = z.object({
  body: z.object({
    title: z.string().min(2, 'Назва гри має містити мінімум 2 символи').max(200),
    slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/, 'Slug може містити лише малі латинські літери, цифри та дефіс'),
    developer: z.string().min(2).max(120),
    releaseYear: z.coerce.number().int().min(1970).max(2030),
    coverUrl: z.string().url().optional(),
    description: z.string().max(3000).optional(),
    systemReqs: z.record(z.string(), z.any()).optional(),
    genreId: z.coerce.number().int().positive('Вкажіть коректний genreId'),
  }),
});

export const updateGameSchema = z.object({
  params: idParam,
  body: createGameSchema.shape.body.partial().refine(
    (data) => Object.keys(data).length > 0,
    { message: 'Потрібно передати хоча б одне поле для оновлення' }
  ),
});

export const gameIdSchema = z.object({ params: idParam });