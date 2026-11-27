import { gameLogModel } from '../models/gameLogModel.js';
import { AppError } from '../utils/AppError.js';

export async function getAllGameLogs(_req, res) {
  const logs = await gameLogModel.findAll();
  res.json({ data: logs });
}

export async function getGameLogById(req, res) {
  const log = await gameLogModel.findById(req.validated.params.id);
  if (!log) throw new AppError('Запис у щоденнику не знайдено', 404);
  res.json({ data: log });
}

export async function createGameLog(req, res) {
  const log = await gameLogModel.create(req.validated.body);
  res.status(201).json({ message: 'Гру додано до щоденника', data: log });
}

export async function updateGameLog(req, res) {
  const log = await gameLogModel.update(req.validated.params.id, req.validated.body);
  res.json({ message: 'Статус гри оновлено', data: log });
}

export async function deleteGameLog(req, res) {
  await gameLogModel.remove(req.validated.params.id);
  res.status(204).end();
}