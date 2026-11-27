# Документація REST API — Game Tracker

Базовий URL: `http://localhost:3000/api`  
Формат даних: `application/json`

## Службовий маршрут
- `GET /health` — перевірка стану сервера (`200 OK`).

## 1. Жанри (`/api/genres`)
- `GET /api/genres` — отримати список усіх жанрів із кількістю ігор.
- `GET /api/genres/:id` — отримати жанр за ID разом зі списком ігор.
- `POST /api/genres` — створити новий жанр (`201 Created`).
  - Body: `{ "name": "Metroidvania", "slug": "metroidvania", "description": "..." }`
- `PUT /api/genres/:id` — оновити дані жанру (`200 OK`).
- `DELETE /api/genres/:id` — видалити жанр (`204 No Content`).

## 2. Каталог ігор (`/api/games`)
- `GET /api/games` — отримати каталог ігор із жанрами та лічильниками записів.
- `GET /api/games/:id` — отримати детальну картку гри з рецензіями.
- `POST /api/games` — додати нову гру (`201 Created`).
  - Body: `{ "title": "Dark Souls II", "slug": "dark-souls-2", "developer": "FromSoftware", "releaseYear": 2014, "genreId": 1 }`
- `PUT /api/games/:id` — оновити інформацію про гру (`200 OK`).
- `DELETE /api/games/:id` — видалити гру (`204 No Content`).

## 3. Щоденник проходжень (`/api/logs`)
- `GET /api/logs` — отримати всі записи ігрового щоденника.
- `GET /api/logs/:id` — отримати конкретний запис за ID.
- `POST /api/logs` — додати гру до щоденника користувача (`201 Created`).
  - Body: `{ "userId": 1, "gameId": 1, "status": "PLAYING", "hoursPlayed": 24, "platform": "PC", "optimizationTag": "60 FPS High" }`
  - Доступні статуси: `PLAYING`, `COMPLETED`, `BACKLOG`, `DROPPED`, `WISHLIST`.
- `PUT /api/logs/:id` — оновити статус, оцінку (`0–10`) або награні години (`200 OK`).
- `DELETE /api/logs/:id` — видалити запис із щоденника (`204 No Content`).

## 4. Рецензії (`/api/reviews`)
- `GET /api/reviews` — отримати всі рецензії користувачів.
- `GET /api/reviews/:id` — отримати рецензію за ID.
- `POST /api/reviews` — опублікувати рецензію (`201 Created`).
  - Body: `{ "userId": 1, "gameId": 1, "title": "Чудовий арт-дизайн", "content": "Детальний розбір бойової системи...", "rating": 9.4, "containsSpoilers": false }`
- `PUT /api/reviews/:id` — відредагувати рецензію (`200 OK`).
- `DELETE /api/reviews/:id` — видалити рецензію (`204 No Content`).

## Коди відповідей та помилок
- `200 OK` — успішне отримання або оновлення даних.
- `201 Created` — ресурс успішно створено.
- `204 No Content` — ресурс успішно видалено.
- `400 Bad Request` — помилка валідації вхідних даних (Zod) або порушення цілісності зв’язків БД.
- `404 Not Found` — маршрут або запис у базі даних не знайдено.
- `409 Conflict` — дублювання унікального значення (`slug`, `email` або повторний запис гри у щоденнику).