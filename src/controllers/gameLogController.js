import {
  findAllGameLogs,
  findGameLogById,
  createGameLogRecord,
  updateGameLogRecord,
  deleteGameLogRecord,
} from '../models/gameLogModel.js';

export async function getGameLogs(req, res) {
  const result = await findAllGameLogs(req.query);
  res.json(result);
}

export async function getGameLogById(req, res) {
  const log = await findGameLogById(Number(req.params.id));
  if (!log) {
    return res.status(404).json({ error: 'Запис у щоденнику не знайдено' });
  }
  res.json({ data: log });
}

export async function createGameLog(req, res) {
  const userId = req.user?.userId ?? req.body.userId;
  const log = await createGameLogRecord({ ...req.body, userId });
  res.status(201).json({ message: 'Гру додано до щоденника', data: log });
}

export async function updateGameLog(req, res) {
  const id = Number(req.params.id);
  const existing = await findGameLogById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Запис у щоденнику не знайдено' });
  }

  if (req.user && existing.userId !== req.user.userId && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Недостатньо прав для редагування цього запису' });
  }

  const log = await updateGameLogRecord(id, req.body);
  res.json({ message: 'Запис у щоденнику оновлено', data: log });
}

export async function deleteGameLog(req, res) {
  const id = Number(req.params.id);
  const existing = await findGameLogById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Запис у щоденнику не знайдено' });
  }

  if (req.user && existing.userId !== req.user.userId && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Недостатньо прав для видалення цього запису' });
  }

  await deleteGameLogRecord(id);
  res.status(204).end();
}