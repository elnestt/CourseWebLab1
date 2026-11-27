export function errorHandler(err, _req, res, _next) {
  if (err.name === 'MulterError') {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Файл занадто великий'
        : err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Перевищено ліміт кількості файлів або некоректне поле'
          : 'Помилка завантаження файлу';
    return res.status(400).json({ error: message });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Запис із такими унікальними даними вже існує' });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Запис не знайдено' });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({ error: 'Порушення зв’язку зовнішнього ключа в базі даних' });
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    error: status >= 500 ? 'Внутрішня помилка сервера' : err.message,
  });
}