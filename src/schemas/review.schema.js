import { z } from 'zod';

const idParam = z.object({
  id: z.coerce.number().int().positive('ID рецензії має бути додатним цілим числом'),
});

export const createReviewSchema = z.object({
  body: z.object({
    userId: z.coerce.number().int().positive(),
    gameId: z.coerce.number().int().positive(),
    title: z.string().min(3, 'Заголовок рецензії має містити мінімум 3 символи').max(150),
    content: z.string().min(10, 'Текст рецензії має містити мінімум 10 символів').max(5000),
    rating: z.coerce.number().min(0).max(10),
    containsSpoilers: z.boolean().default(false),
  }),
});

export const updateReviewSchema = z.object({
  params: idParam,
  body: createReviewSchema.shape.body
    .omit({ userId: true, gameId: true })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Потрібно передати хоча б одне поле для оновлення',
    }),
});

export const reviewIdSchema = z.object({ params: idParam });