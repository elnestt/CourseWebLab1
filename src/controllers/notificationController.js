import { prisma } from '../db.js';
import { sendBatchNotifications } from '../services/notificationService.js';

export const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId ?? req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const where = { userId };
    if (req.query.isRead === 'true') where.isRead = true;
    if (req.query.isRead === 'false') where.isRead = false;
    if (req.query.priority) where.priority = req.query.priority;

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    res.json({
      data: items,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const markNotificationAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId ?? req.user.id;
    const id = parseInt(req.params.id, 10);

    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Сповіщення не знайдено' });
    }
    if (existing.userId !== userId) {
      return res.status(403).json({ error: 'Немає доступу до цього сповіщення' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

export const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId ?? req.user.id;
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.json({
      message: 'Усі сповіщення позначено як прочитані',
      updatedCount: result.count,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.userId ?? req.user.id;
    const id = parseInt(req.params.id, 10);

    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Сповіщення не знайдено' });
    }
    if (existing.userId !== userId) {
      return res.status(403).json({ error: 'Немає доступу до цього сповіщення' });
    }

    await prisma.notification.delete({ where: { id } });
    res.json({ message: 'Сповіщення видалено' });
  } catch (err) {
    next(err);
  }
};

export const broadcastNotification = async (req, res, next) => {
  try {
    const { title, message, type = 'SYSTEM_ALERT', priority = 'HIGH', userIds } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Поля title та message є обовʼязковими' });
    }

    let targetIds = userIds;
    if (!Array.isArray(targetIds) || targetIds.length === 0) {
      const users = await prisma.user.findMany({ select: { id: true } });
      targetIds = users.map((u) => u.id);
    }

    sendBatchNotifications(req.app.get('io'), targetIds, {
      type,
      priority,
      title,
      message,
    });

    res.status(202).json({
      message: 'Розсилку сповіщень поставлено у фонову чергу',
      recipientsCount: targetIds.length,
    });
  } catch (err) {
    next(err);
  }
};