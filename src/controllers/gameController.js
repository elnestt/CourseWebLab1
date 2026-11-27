import { gameModel } from '../models/gameModel.js';
import { AppError } from '../utils/AppError.js';

export async function getAllGames(_req, res) {
  const games = await gameModel.findAll();
  res.json({ data: games });
}

export async function getGameById(req, res) {
  const game = await gameModel.findById(req.validated.params.id);
  if (!game) throw new AppError('Гру не знайдено', 404);
  res.json({ data: game });
}

export async function createGame(req, res) {
  const game = await gameModel.create(req.validated.body);
  res.status(201).json({ message: 'Гру додано до каталогу', data: game });
}

export async function updateGame(req, res) {
  const game = await gameModel.update(req.validated.params.id, req.validated.body);
  res.json({ message: 'Дані гри оновлено', data: game });
}

export async function deleteGame(req, res) {
  await gameModel.remove(req.validated.params.id);
  res.status(204).end();
}