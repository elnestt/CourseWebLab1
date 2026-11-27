import {
  findAllGenres,
  findGenreById,
  createGenreRecord,
  updateGenreRecord,
  deleteGenreRecord,
} from '../models/genreModel.js';
import { logAudit } from '../utils/audit.js';

export async function getGenres(req, res) {
  const result = await findAllGenres(req.query);
  res.json(result);
}

export async function getGenreById(req, res) {
  const genre = await findGenreById(Number(req.params.id));
  if (!genre) {
    return res.status(404).json({ error: 'Жанр не знайдено' });
  }
  res.json({ data: genre });
}

export async function createGenre(req, res) {
  const genre = await createGenreRecord(req.body);

  await logAudit({
    userId: req.user?.userId,
    action: 'GENRE_CREATED',
    entity: 'Genre',
    entityId: genre.id,
    details: { name: genre.name },
    req,
  });

  res.status(201).json({ message: 'Жанр створено', data: genre });
}

export async function updateGenre(req, res) {
  const id = Number(req.params.id);
  const existing = await findGenreById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Жанр не знайдено' });
  }

  const genre = await updateGenreRecord(id, req.body);
  res.json({ message: 'Жанр оновлено', data: genre });
}

export async function deleteGenre(req, res) {
  const id = Number(req.params.id);
  const existing = await findGenreById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Жанр не знайдено' });
  }

  await deleteGenreRecord(id);
  res.status(204).end();
}