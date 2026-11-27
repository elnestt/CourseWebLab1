import { AppError } from '../utils/AppError.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError(`Маршрут ${req.method} ${req.originalUrl} не знайдено`, 404));
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err.code === 'P2002') {
    const target = err.meta?.target?.join(', ') || 'поле';
    return res.status(409).json({ error: `Запис із таким значенням (${target}) вже існує` });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Запитуваний запис не знайдено в базі даних' });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({ error: 'Порушення цілісності зв’язків (невірний ID пов’язаної сутності)' });
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Некоректний формат JSON у тілі запиту' });
  }

  console.error('Непередбачена помилка сервера:', err);
  res.status(500).json({ error: 'Внутрішня помилка сервера' });
}