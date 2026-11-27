import { prisma } from '../db.js';

export async function getAuditLogs(req, res) {
  const { page = 1, limit = 20, action, entity, userId } = req.query;

  const pageNumber = Math.max(Number(page) || 1, 1);
  const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (pageNumber - 1) * take;

  const where = {};
  if (action) where.action = { contains: action, mode: 'insensitive' };
  if (entity) where.entity = { contains: entity, mode: 'insensitive' };
  if (userId) where.userId = Number(userId);

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, email: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({
    data: logs,
    pagination: {
      page: pageNumber,
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
      hasMore: skip + logs.length < total,
    },
  });
}