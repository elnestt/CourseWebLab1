import { prisma } from '../db.js';

export async function logAudit({ userId = null, action, entity = null, entityId = null, details = null, req = null }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: details ?? undefined,
        ipAddress: req?.ip || req?.socket?.remoteAddress || null,
      },
    });
  } catch (err) {
    console.error('Помилка запису в AuditLog:', err.message);
  }
}