import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';
import { logAudit } from '../utils/audit.js';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

// Створює пару токенів і зберігає SHA-256 хеш refresh токена в БД для ротації та відкликання
async function issueTokens(user) {
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);
  const { exp } = verifyRefreshToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      tokenHash: sha256(refreshToken),
      userId: user.id,
      expiresAt: new Date(exp * 1000),
    },
  });

  return { accessToken, refreshToken };
}

export async function register(req, res) {
  const { email, username, password, bio } = req.body;

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existingUser) {
    const field = existingUser.email === email ? 'email' : 'нікнеймом';
    return res.status(409).json({ error: `Користувач з таким ${field} вже існує` });
  }

  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: await hashPassword(password),
      bio: bio || null,
    },
    select: {
      id: true,
      email: true,
      username: true,
      bio: true,
      avatar: true,
      role: true,
      createdAt: true,
    },
  });

  const tokens = await issueTokens(user);

  await logAudit({
    userId: user.id,
    action: 'USER_REGISTERED',
    entity: 'User',
    entityId: user.id,
    details: { email: user.email, username: user.username },
    req,
  });

  res.status(201).json({
    message: 'Користувача успішно зареєстровано',
    user,
    tokens,
  });
}

export async function login(req, res) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  // Однакова відповідь для неіснуючого email і хибного пароля (захист від перебору акаунтів)
  if (!user || !(await comparePassword(password, user.password))) {
    return res.status(401).json({ error: 'Невірний email або пароль' });
  }

  const { password: _password, ...userWithoutPassword } = user;
  const tokens = await issueTokens(user);

  await logAudit({
    userId: user.id,
    action: 'USER_LOGIN',
    entity: 'User',
    entityId: user.id,
    req,
  });

  res.json({
    message: 'Успішний вхід',
    user: userWithoutPassword,
    tokens,
  });
}

export async function getMe(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      email: true,
      username: true,
      bio: true,
      avatar: true,
      role: true,
      createdAt: true,
      _count: {
        select: { gameLogs: true, reviews: true, collections: true, files: true },
      },
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'Користувача не знайдено' });
  }

  res.json({ user });
}

export async function refresh(req, res) {
  const { refreshToken } = req.body;

  try {
    verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ error: 'Недійсний refresh токен' });
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(refreshToken) },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    // Повторне використання відкликаного токена: скасовуємо всі активні сесії користувача
    if (stored) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return res.status(401).json({ error: 'Недійсний refresh токен' });
  }

  // Ротація: відкликаємо старий токен і видаємо нову пару
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  res.json({ tokens: await issueTokens(stored.user) });
}

export async function logout(req, res) {
  const { refreshToken } = req.body ?? {};

  if (refreshToken) {
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
    });

    if (stored && !stored.revokedAt) {
      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      await logAudit({
        userId: stored.userId,
        action: 'USER_LOGOUT',
        entity: 'User',
        entityId: stored.userId,
        req,
      });
    }
  }

  res.status(204).end();
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  if (!user) {
    return res.status(404).json({ error: 'Користувача не знайдено' });
  }

  const isValid = await comparePassword(currentPassword, user.password);
  if (!isValid) {
    return res.status(401).json({ error: 'Поточний пароль введено невірно' });
  }

  const newHashedPassword = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: newHashedPassword },
    }),
    // Відкликаємо всі активні сесії після зміни пароля
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await logAudit({
    userId: user.id,
    action: 'PASSWORD_CHANGED',
    entity: 'User',
    entityId: user.id,
    req,
  });

  res.json({ message: 'Пароль успішно змінено. Увійдіть знову з новим паролем.' });
}

export async function forgotPassword(req, res) {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  // Завжди повертаємо 200 OK, щоб не розкривати існування email у базі
  if (!user) {
    return res.json({
      message: 'Якщо обліковий запис із таким email існує, інструкції надіслано',
    });
  }

  const rawResetToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 хвилин

  await prisma.passwordResetToken.create({
    data: {
      tokenHash: sha256(rawResetToken),
      userId: user.id,
      expiresAt,
    },
  });

  await logAudit({
    userId: user.id,
    action: 'PASSWORD_RESET_REQUESTED',
    entity: 'User',
    entityId: user.id,
    req,
  });

  res.json({
    message: 'Токен відновлення пароля згенеровано (дійсний 15 хвилин)',
    // У режимі розробки повертаємо токен у відповіді для зручного тестування без SMTP
    ...(process.env.NODE_ENV !== 'production' && { resetToken: rawResetToken }),
  });
}

export async function resetPassword(req, res) {
  const { token, newPassword } = req.body;

  const storedToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(token) },
  });

  if (!storedToken || storedToken.usedAt || storedToken.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Недійсний або прострочений токен відновлення пароля' });
  }

  const newHashedPassword = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: storedToken.userId },
      data: { password: newHashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: storedToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: storedToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await logAudit({
    userId: storedToken.userId,
    action: 'PASSWORD_RESET_COMPLETED',
    entity: 'User',
    entityId: storedToken.userId,
    req,
  });

  res.json({ message: 'Пароль успішно відновлено' });
}