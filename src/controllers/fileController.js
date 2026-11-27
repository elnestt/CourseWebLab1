import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../db.js';
import { logAudit } from '../utils/audit.js';

export async function uploadFile(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не надано' });
  }

  try {
    const file = await prisma.file.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        description: req.body?.description || null,
        uploadedBy: req.user.userId,
      },
    });

    await logAudit({
      userId: req.user.userId,
      action: 'FILE_UPLOADED',
      entity: 'File',
      entityId: file.id,
      details: { originalName: file.originalName, size: file.size },
      req,
    });

    res.status(201).json({ message: 'Файл успішно завантажено', file });
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => {});
    throw error;
  }
}

export async function uploadMultipleFiles(req, res) {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Файли не надано' });
  }

  try {
    const createdFiles = await prisma.$transaction(
      req.files.map((f) =>
        prisma.file.create({
          data: {
            filename: f.filename,
            originalName: f.originalname,
            mimetype: f.mimetype,
            size: f.size,
            path: f.path,
            description: req.body?.description || null,
            uploadedBy: req.user.userId,
          },
        })
      )
    );

    await logAudit({
      userId: req.user.userId,
      action: 'FILES_UPLOADED_MULTIPLE',
      entity: 'File',
      details: { count: createdFiles.length, filenames: createdFiles.map((f) => f.originalName) },
      req,
    });

    res.status(201).json({
      message: `Успішно завантажено файлів: ${createdFiles.length}`,
      files: createdFiles,
    });
  } catch (error) {
    await Promise.all(req.files.map((f) => fs.unlink(f.path).catch(() => {})));
    throw error;
  }
}

export async function getFiles(req, res) {
  const { page = 1, limit = 10, uploadedBy, mimetype } = req.query;

  const pageNumber = Math.max(Number(page) || 1, 1);
  const take = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (pageNumber - 1) * take;

  const where = {};
  if (uploadedBy) where.uploadedBy = Number(uploadedBy);
  if (mimetype) where.mimetype = { contains: mimetype, mode: 'insensitive' };

  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true } },
      },
    }),
    prisma.file.count({ where }),
  ]);

  res.json({
    data: files,
    pagination: {
      page: pageNumber,
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
      hasMore: skip + files.length < total,
    },
  });
}

export async function getFile(req, res) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Некоректний ID файлу' });
  }

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) {
    return res.status(404).json({ error: 'Файл не знайдено' });
  }

  res.sendFile(path.resolve(file.path));
}

export async function updateFile(req, res) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ error: 'Некоректний ID файлу' });
  }

  const existing = await prisma.file.findUnique({ where: { id } });
  if (!existing) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    return res.status(404).json({ error: 'Файл не знайдено' });
  }

  if (existing.uploadedBy !== req.user.userId && req.user.role !== 'ADMIN') {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    return res.status(403).json({ error: 'Ви не маєте прав для оновлення цього файлу' });
  }

  const updateData = {};
  if (req.body?.description !== undefined) {
    updateData.description = req.body.description;
  }

  if (req.file) {
    updateData.filename = req.file.filename;
    updateData.originalName = req.file.originalname;
    updateData.mimetype = req.file.mimetype;
    updateData.size = req.file.size;
    updateData.path = req.file.path;
  }

  try {
    const updated = await prisma.file.update({
      where: { id },
      data: updateData,
    });

    // Якщо завантажено новий файл замість старого — видаляємо старий з диска
    if (req.file && existing.path !== req.file.path) {
      await fs.unlink(existing.path).catch(() => {});
    }

    await logAudit({
      userId: req.user.userId,
      action: 'FILE_UPDATED',
      entity: 'File',
      entityId: updated.id,
      details: { replacedFile: Boolean(req.file) },
      req,
    });

    res.json({ message: 'Файл успішно оновлено', file: updated });
  } catch (error) {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    throw error;
  }
}

export async function deleteFile(req, res) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Некоректний ID файлу' });
  }

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) {
    return res.status(404).json({ error: 'Файл не знайдено' });
  }

  if (file.uploadedBy !== req.user.userId && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Ви не маєте прав для видалення цього файлу' });
  }

  await prisma.file.delete({ where: { id: file.id } });
  await fs.unlink(file.path).catch(() => {});

  await logAudit({
    userId: req.user.userId,
    action: 'FILE_DELETED',
    entity: 'File',
    entityId: file.id,
    details: { originalName: file.originalName },
    req,
  });

  res.json({ message: 'Файл успішно видалено' });
}