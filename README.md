# Game Tracker API

Серверна частина вебдодатку для обліку проходження відеоігор, оцінювання та написання рецензій у реальному часі (Node.js, Express 5, PostgreSQL, Prisma 7, Socket.io 4, Zod).

## Розгортання в продакшні (Render)

- **URL застосунку:** https://game-tracker-api-bv16.onrender.com
- **Health Check:** https://game-tracker-api-bv16.onrender.com/health
- **Документація REST API (Swagger):** https://game-tracker-api-bv16.onrender.com/api-docs
- **Документація WebSocket API:** [`docs/websocket.md`](docs/websocket.md)

### Обмеження безкоштовного тарифу Render (Free)
1. **Засинання (Spin-down):** після ~15 хвилин без вхідних запитів сервіс переходить у режим сну; перший запит після паузи може тривати до 50–60 секунд.
2. **Тимчасова файлова система (Ephemeral Disk):** локально завантажені файли в папці `uploads/` очищаються під час перезапуску або повторного деплою контейнера.
3. **Обмежений термін дії безкоштовної БД:** безкоштовна PostgreSQL на Render має фіксований строк дії, після завершення якого база видаляється без переходу на платний тариф.

## Локальний запуск проєкту

1. Встановити залежності:
   ```bash
   npm install