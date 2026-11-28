# WebSocket API та архітектура реального часу (Game Tracker)

## 1. Підключення та автентифікація

Сервер використовує **Socket.io v4**, ініціалізований поверх HTTP-сервера Express (`src/socket/index.js`).

- **URL підключення:** `ws://localhost:3000` (локально) або `wss://<your-app>.onrender.com` (production)
- **Автентифікація:** обов'язкова передача чинного JWT `accessToken` під час рукостискання (`handshake`):

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: '<YOUR_JWT_ACCESS_TOKEN>',
  },
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});
```

Якщо токен відсутній, прострочений або невалідний, сервер відхиляє з'єднання з подією `connect_error` (`message: "unauthorized"`). Коли `accessToken` спливає під час активної сесії, клієнт оновлює пару токенів через `POST /api/auth/refresh` і перепідключається з новим `auth.token`.

---

## 2. Система кімнат (Rooms)

| Кімната | Призначення | Доступ |
| :--- | :--- | :--- |
| `user:{userId}` | Персональні сповіщення та оновлення щоденника проходжень | Автоматично при вході (лише власник або `ADMIN`) |
| `catalog` | Глобальні оновлення каталогу ігор, нових рецензій та онлайн-статусів | Автоматично при вході |
| `game:{gameId}` | Оновлення конкретної гри, її рецензій та активності гравців | За запитом `room:join` |

---

## 3. Події WebSocket

### Клієнт → Сервер (Client Events)

| Подія | Параметри (Payload) | Відповідь (Ack) | Опис |
| :--- | :--- | :--- | :--- |
| `room:join` | `'game:5'` (рядок) | `{ ok: true, room: 'game:5' }` | Підписка на кімнату сутності |
| `room:leave` | `'game:5'` (рядок) | `{ ok: true, room: 'game:5' }` | Відписка від кімнати |
| `presence:list` | — | `{ ok: true, onlineUsers: [1, 2] }` | Отримання списку ID користувачів онлайн |
| `events:sync` | `{ lastEventId: 42, rooms: ['catalog', 'game:5'] }` | `{ ok: true, events: [...] }` | Відновлення пропущених подій після втрати зв'язку |

### Сервер → Клієнт (Server Events)

| Подія | Кімната | Приклад Payload | Коли виникає |
| :--- | :--- | :--- | :--- |
| `game:created` | `catalog` | `{ game: {...}, _eventId: 10, _timestamp: '...' }` | Додано нову гру |
| `game:updated` | `catalog`, `game:{id}` | `{ game: {...}, _eventId: 11, _timestamp: '...' }` | Оновлено дані гри |
| `game:deleted` | `catalog`, `game:{id}` | `{ id: 5, _eventId: 12, _timestamp: '...' }` | Видалено гру |
| `review:created` | `catalog`, `game:{gameId}` | `{ review: {...}, _eventId: 13 }` | Опубліковано нову рецензію |
| `review:updated` | `game:{gameId}` | `{ review: {...}, _eventId: 14 }` | Відредаговано рецензію |
| `review:deleted` | `game:{gameId}` | `{ id: 3, gameId: 5, _eventId: 15 }` | Видалено рецензію |
| `gamelog:created` | `user:{userId}`, `game:{gameId}` | `{ log: {...}, _eventId: 16 }` | Додано запис у щоденник проходжень |
| `gamelog:updated` | `user:{userId}`, `game:{gameId}` | `{ log: {...}, _eventId: 17 }` | Оновлено статус/прогрес проходження |
| `gamelog:deleted` | `user:{userId}`, `game:{gameId}` | `{ id: 8, _eventId: 18 }` | Видалено запис зі щоденника |
| `notification:new` | `user:{userId}` | `{ id, type, priority, title, message, isRead }` | Персональне сповіщення (наприклад, `LOG_MILESTONE`) |
| `notification:batch` | `user:{userId}` | `{ type, priority, title, message, data }` | Масова фонова розсилка сповіщень |
| `presence:online` | `catalog` | `{ userId: 2, onlineUsers: [1, 2] }` | Користувач підключився |
| `presence:offline` | `catalog` | `{ userId: 2, onlineUsers: [1] }` | Користувач відключився |
| `error:ws` | конкретний `socket` | `{ code: 'RATE_LIMITED', message: '...' }` | Помилка валідації або перевищення ліміту подій |

---

## 4. Відновлення після розриву зв'язку (Reconnection Recovery)

1. Кожна важлива подія зберігається в таблицю `SocketEvent` з автоінкрементним порядковим номером `_eventId`.
2. Клієнт зберігає останній отриманий `_eventId`.
3. При повторному підключенні (`socket.on('connect', ...)`) клієнт викликає:

```javascript
socket.emit('events:sync', { lastEventId, rooms: ['catalog', 'game:5'] }, (res) => {
  if (res.ok) {
    res.events.forEach((ev) => applyMissedEvent(ev));
  }
});
```

---

## 5. Захист, масштабування та моніторинг

- **Rate Limiting:** обмеження 30 вхідних WebSocket-подій за 10 секунд на одне з'єднання; при перевищенні надсилається `error:ws` з кодом `RATE_LIMITED`.
- **Горизонтальне масштабування (Redis Adapter):** при заданій змінній `REDIS_URL` підключається `@socket.io/redis-adapter` (Pub/Sub між екземплярами сервера). Для роботи кількох інстансів за балансувальником навантаження вмикаються sticky sessions (прив'язка клієнта за cookie/IP під час HTTP polling handshake).
- **Налаштування авто-масштабування на Render:** безкоштовний тариф (`Free`) підтримує 1 екземпляр без авто-масштабування. На тарифах `Starter` / `Standard` у панелі **Settings → Scaling** вмикається **Autoscaling** із заданням мінімальної та максимальної кількості інстансів (наприклад, `1–3`) і порогів завантаження CPU (70%) та RAM (80%).