import {
  findAllGames,
  findGameById,
  createGameRecord,
  updateGameRecord,
  deleteGameRecord,
} from '../models/gameModel.js';
import { logAudit } from '../utils/audit.js';

export async function getGames(req, res) {
  const result = await findAllGames(req.query);
  res.json(result);
}

export async function getGameById(req, res) {
  const game = await findGameById(Number(req.params.id));
  if (!game) {
    return res.status(404).json({ error: 'Гру не знайдено' });
  }
  res.json({ data: game });
}

export async function createGame(req, res) {
  const game = await createGameRecord(req.body);

  await logAudit({
    userId: req.user?.userId,
    action: 'GAME_CREATED',
    entity: 'Game',
    entityId: game.id,
    details: { title: game.title },
    req,
  });

  res.status(201).json({ message: 'Гру успішно додано', data: game });
}

export async function updateGame(req, res) {
  const id = Number(req.params.id);
  const existing = await findGameById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Гру не знайдено' });
  }

  const game = await updateGameRecord(id, req.body);

  await logAudit({
    userId: req.user?.userId,
    action: 'GAME_UPDATED',
    entity: 'Game',
    entityId: game.id,
    req,
  });

  res.json({ message: 'Дані гри оновлено', data: game });
}

export async function deleteGame(req, res) {
  const id = Number(req.params.id);
  const existing = await findGameById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Гру не знайдено' });
  }

  await deleteGameRecord(id);

  await logAudit({
    userId: req.user?.userId,
    action: 'GAME_DELETED',
    entity: 'Game',
    entityId: id,
    details: { title: existing.title },
    req,
  });

  res.status(204).end();
}