import { genreModel } from '../models/genreModel.js';
import { AppError } from '../utils/AppError.js';

export async function getAllGenres(_req, res) {
  const genres = await genreModel.findAll();
  res.json({ data: genres });
}

export async function getGenreById(req, res) {
  const genre = await genreModel.findById(req.validated.params.id);
  if (!genre) throw new AppError('Жанр не знайдено', 404);
  res.json({ data: genre });
}

export async function createGenre(req, res) {
  const genre = await genreModel.create(req.validated.body);
  res.status(201).json({ message: 'Жанр створено', data: genre });
}

export async function updateGenre(req, res) {
  const genre = await genreModel.update(req.validated.params.id, req.validated.body);
  res.json({ message: 'Жанр оновлено', data: genre });
}

export async function deleteGenre(req, res) {
  await genreModel.remove(req.validated.params.id);
  res.status(204).end();
}