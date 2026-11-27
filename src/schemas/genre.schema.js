import { z } from 'zod';

const idParam = z.object({
  id: z.coerce.number().int().positive('ID має бути додатним цілим числом'),
});

export const createGenreSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Назва жанру має містити мінімум 2 символи').max(80),
    slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, 'Slug може містити лише малі латинські літери, цифри та дефіс'),
    description: z.string().max(500).optional(),
  }),
});

export const updateGenreSchema = z.object({
  params: idParam,
  body: createGenreSchema.shape.body.partial().refine(
    (data) => Object.keys(data).length > 0,
    { message: 'Потрібно передати хоча б одне поле для оновлення' }
  ),
});

export const genreIdSchema = z.object({ params: idParam });