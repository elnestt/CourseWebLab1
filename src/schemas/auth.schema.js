import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Некоректний формат email').trim().toLowerCase(),
    username: z
      .string()
      .min(3, 'Нікнейм має містити мінімум 3 символи')
      .max(30, 'Нікнейм не може перевищувати 30 символів')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Нікнейм може містити лише латинські літери, цифри, _ та -')
      .trim(),
    password: z.string().min(8, 'Пароль має містити мінімум 8 символів').max(128),
    bio: z.string().max(300).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Некоректний формат email').trim().toLowerCase(),
    password: z.string().min(1, "Пароль є обов'язковим"),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh токен відсутній'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Поточний пароль є обов'язковим"),
    newPassword: z.string().min(8, 'Новий пароль має містити мінімум 8 символів').max(128),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Некоректний формат email').trim().toLowerCase(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Токен відновлення є обов'язковим"),
    newPassword: z.string().min(8, 'Новий пароль має містити мінімум 8 символів').max(128),
  }),
});