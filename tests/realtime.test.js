import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { io as connect } from 'socket.io-client';
import request from 'supertest';

process.env.NODE_ENV = 'test';

const { default: app } = await import('../src/app.js');
const { prisma } = await import('../src/db.js');
const { initSocket } = await import('../src/socket/index.js');
const { cache } = await import('../src/utils/cache.js');

const httpServer = createServer(app);
const io = await initSocket(httpServer);
app.set('io', io);

httpServer.listen(0);
await once(httpServer, 'listening');
const wsUrl = `http://localhost:${httpServer.address().port}`;

const clients = [];
function createClient(token, opts = {}) {
  const socket = connect(wsUrl, {
    auth: token ? { token } : {},
    reconnection: false,
    ...opts,
  });
  clients.push(socket);
  return socket;
}

describe('Lab 3: WebSocket, Real-Time, Notifications, Cache & Metrics', () => {
  const aliceData = {
    email: 'ws_alice@example.com',
    username: 'ws_alice',
    password: 'StrongPassword123',
  };
  const bobData = {
    email: 'ws_bob@example.com',
    username: 'ws_bob',
    password: 'StrongPassword123',
  };

  let aliceToken;
  let aliceId;
  let bobToken;
  let bobId;
  let genreId;
  let gameId;
  let lastSeenEventId = 0;

  before(async () => {
    cache.clear();
    await prisma.game.deleteMany({ where: { slug: 'ws-test-game' } });
    await prisma.genre.deleteMany({ where: { slug: 'ws-test-genre' } });
    await prisma.user.deleteMany({
      where: { email: { in: [aliceData.email, bobData.email] } },
    });

    const genre = await prisma.genre.create({
      data: { name: 'WS Test Genre', slug: 'ws-test-genre' },
    });
    genreId = genre.id;

    // Реєструємо Alice та підвищуємо до ADMIN для створення ігор
    const regAlice = await request(app).post('/api/auth/register').send(aliceData);
    aliceId = regAlice.body.user.id;
    await prisma.user.update({
      where: { id: aliceId },
      data: { role: 'ADMIN' },
    });
    const loginAlice = await request(app)
      .post('/api/auth/login')
      .send({ email: aliceData.email, password: aliceData.password });
    aliceToken = loginAlice.body.tokens.accessToken;

    // Реєструємо Bob зі стандартною роллю USER
    const regBob = await request(app).post('/api/auth/register').send(bobData);
    bobId = regBob.body.user.id;
    bobToken = regBob.body.tokens.accessToken;
  });

  after(async () => {
    for (const c of clients) {
      if (c.connected) c.close();
    }
    io.close();
    httpServer.close();

    if (gameId) {
      await prisma.game.deleteMany({ where: { id: gameId } });
    }
    if (genreId) {
      await prisma.genre.deleteMany({ where: { id: genreId } });
    }
    await prisma.user.deleteMany({
      where: { email: { in: [aliceData.email, bobData.email] } },
    });
    await prisma.$disconnect();
  });

  test('1. WebSocket автентифікація: відхиляє підключення без токена та з невалідним JWT', async () => {
    const noTokenClient = createClient(null);
    const [errNoToken] = await once(noTokenClient, 'connect_error');
    assert.equal(errNoToken.message, 'unauthorized');

    const badTokenClient = createClient('invalid.jwt.token');
    const [errBadToken] = await once(badTokenClient, 'connect_error');
    assert.equal(errBadToken.message, 'unauthorized');
  });

  test('2. Кімнати (rooms), приватність та онлайн-статуси користувачів', async () => {
    const alice = createClient(aliceToken);
    await once(alice, 'connect');

    // Коли підключається Bob, Alice в кімнаті catalog має отримати подію presence:online
    const onlinePromise = once(alice, 'presence:online');
    const bob = createClient(bobToken);
    await once(bob, 'connect');

    const [onlinePayload] = await onlinePromise;
    assert.equal(onlinePayload.userId, bobId);
    assert.ok(onlinePayload.onlineUsers.includes(aliceId));
    assert.ok(onlinePayload.onlineUsers.includes(bobId));

    // Alice приєднується до кімнати game:777
    const joinRes = await alice.emitWithAck('room:join', 'game:777');
    assert.equal(joinRes.ok, true);

    // Спроба увійти в чужу приватну кімнату відхиляється
    const forbiddenJoin = await bob.emitWithAck('room:join', `user:${aliceId}`);
    assert.equal(forbiddenJoin.ok, false);

    // Подія в кімнату game:777 надходить лише Alice
    let bobReceivedRoomEvent = false;
    bob.on('custom:ping', () => {
      bobReceivedRoomEvent = true;
    });

    const aliceRoomEvent = once(alice, 'custom:ping');
    io.to('game:777').emit('custom:ping', { status: 'ok' });
    const [roomData] = await aliceRoomEvent;
    assert.deepEqual(roomData, { status: 'ok' });
    assert.equal(bobReceivedRoomEvent, false);

    // Перевірка відключення Bob та оновлення presence:offline
    const offlinePromise = once(alice, 'presence:offline');
    bob.close();
    const [offlinePayload] = await offlinePromise;
    assert.equal(offlinePayload.userId, bobId);
    assert.equal(offlinePayload.onlineUsers.includes(bobId), false);

    alice.close();
  });

  test('3. Оновлення в реальному часі для сутностей (Game, GameLog) та система сповіщень', async () => {
    const alice = createClient(aliceToken);
    const bob = createClient(bobToken);
    await Promise.all([once(alice, 'connect'), once(bob, 'connect')]);

    // Bob слухає каталог у реальному часі
    const gameCreatedPromise = once(bob, 'game:created');

    const createGameRes = await request(app)
      .post('/api/games')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        title: 'WS Test Game',
        slug: 'ws-test-game',
        developer: 'FairInteractive',
        releaseYear: 2026,
        genreId,
      });

    assert.equal(createGameRes.status, 201);
    gameId = createGameRes.body.data.id;

    const [wsGamePayload] = await gameCreatedPromise;
    assert.equal(wsGamePayload.game.title, 'WS Test Game');
    assert.ok(wsGamePayload._eventId);
    lastSeenEventId = wsGamePayload._eventId;

    // Bob створює запис проходження зі статусом COMPLETED -> отримує gamelog:created і notification:new
    const logCreatedPromise = once(bob, 'gamelog:created');
    const notifPromise = once(bob, 'notification:new');

    const logRes = await request(app)
      .post('/api/logs')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({
        userId: bobId,
        gameId,
        status: 'COMPLETED',
        hoursPlayed: 25,
        rating: 9,
      });

    assert.equal(logRes.status, 201);

    const [logEvent] = await logCreatedPromise;
    assert.equal(logEvent.log.status, 'COMPLETED');

    const [notifEvent] = await notifPromise;
    assert.equal(notifEvent.type, 'LOG_MILESTONE');
    assert.equal(notifEvent.priority, 'HIGH');

    // Перевірка REST API сповіщень Bob
    const listNotifs = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${bobToken}`);
    assert.equal(listNotifs.status, 200);
    assert.ok(listNotifs.body.unreadCount >= 1);

    const markAll = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${bobToken}`);
    assert.equal(markAll.status, 200);

    alice.close();
    bob.close();
  });

  test('4. Reconnection recovery: відновлення пропущених подій через events:sync', async () => {
    const bob = createClient(bobToken);
    await once(bob, 'connect');

    // Імітуємо обрив зʼєднання у Bob
    bob.close();
    await new Promise((r) => setTimeout(r, 50));

    // Поки Bob офлайн, Alice оновлює гру
    const updateRes = await request(app)
      .put(`/api/games/${gameId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'WS Test Game Updated' });
    assert.equal(updateRes.status, 200);

    // Bob перепідключається і запитує пропущені події після lastSeenEventId
    const bobReconnected = createClient(bobToken);
    await once(bobReconnected, 'connect');

    const syncRes = await bobReconnected.emitWithAck('events:sync', {
      lastEventId: lastSeenEventId,
      rooms: ['catalog'],
    });

    assert.equal(syncRes.ok, true);
    assert.ok(syncRes.events.some((e) => e.event === 'game:updated'));

    bobReconnected.close();
  });

  test('5. WebSocket Rate Limiting, кешування, /health та /api/metrics', async () => {
    const bob = createClient(bobToken);
    await once(bob, 'connect');

    // Перевірка Rate Limiter на події сокета (> 30 подій за 10 сек)
    const rateLimitPromise = once(bob, 'error:ws');
    for (let i = 0; i < 33; i += 1) {
      bob.emit('room:leave', `temp:${i}`);
    }
    const [wsErr] = await rateLimitPromise;
    assert.equal(wsErr.code, 'RATE_LIMITED');
    bob.close();

    // Перевірка кешування GET /api/games
    cache.clear();
    await request(app).get('/api/games?page=1&limit=5');
    await request(app).get('/api/games?page=1&limit=5');
    assert.ok(cache.stats().hits >= 1);

    // Перевірка /health та /api/metrics
    const healthRes = await request(app).get('/health');
    assert.equal(healthRes.status, 200);
    assert.equal(healthRes.body.status, 'ok');

    const metricsRes = await request(app).get('/api/metrics');
    assert.equal(metricsRes.status, 200);
    assert.ok(metricsRes.body.database);
    assert.ok(metricsRes.body.websocket);
    assert.ok(metricsRes.body.cache);
    assert.ok(metricsRes.body.queue);
  });
});