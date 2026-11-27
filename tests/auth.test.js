import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import request from 'supertest';

process.env.NODE_ENV = 'test';

const { default: app } = await import('../src/app.js');
const { prisma } = await import('../src/db.js');

const testUser = {
  email: 'lab2_tester@example.com',
  username: 'lab2_tester',
  password: 'StrongPassword123',
  bio: 'Тестовий акаунт для перевірки JWT та Argon2id',
};

describe('1. Authentication & Security API', () => {
  let accessToken;
  let refreshToken;

  before(async () => {
    await prisma.user.deleteMany({
      where: { OR: [{ email: testUser.email }, { username: testUser.username }] },
    });
  });

  after(async () => {
    await prisma.user.deleteMany({
      where: { OR: [{ email: testUser.email }, { username: testUser.username }] },
    });
  });

  test('реєструє нового користувача та хешує пароль (201)', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);

    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, testUser.email);
    assert.equal(res.body.user.username, testUser.username);
    assert.equal(res.body.user.password, undefined);
    assert.ok(res.body.tokens.accessToken);
    assert.ok(res.body.tokens.refreshToken);
  });

  test('відхиляє повторну реєстрацію з існуючим email (409)', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    assert.equal(res.status, 409);
  });

  test('відхиляє реєстрацію з коротким паролем (400)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'short_pass@example.com',
      username: 'short_pass_user',
      password: '123',
    });
    assert.equal(res.status, 400);
  });

  test('виконує вхід із правильними даними (200)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    assert.equal(res.status, 200);
    accessToken = res.body.tokens.accessToken;
    refreshToken = res.body.tokens.refreshToken;
    assert.ok(accessToken);
    assert.ok(refreshToken);
  });

  test('відхиляє вхід із хибним паролем (401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword999' });
    assert.equal(res.status, 401);
  });

  test('повертає профіль поточного користувача за Bearer токеном (200)', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, testUser.email);
  });

  test('refresh: виконує ротацію токена та блокує повторне використання старого', async () => {
    const firstRefresh = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    assert.equal(firstRefresh.status, 200);
    const rotatedToken = firstRefresh.body.tokens.refreshToken;
    assert.notEqual(rotatedToken, refreshToken);

    // Спроба повторно використати вже відкликаний старий токен
    const reuseOld = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });
    assert.equal(reuseOld.status, 401);

    // Через компрометацію старого токена новий теж має бути анульований
    const useRotatedAfterCompromise = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: rotatedToken });
    assert.equal(useRotatedAfterCompromise.status, 401);
  });

  test('відновлює пароль через forgot-password та reset-password', async () => {
    const forgot = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email });

    assert.equal(forgot.status, 200);
    assert.ok(forgot.body.resetToken);

    const newPassword = 'RecoveredPassword456';
    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: forgot.body.resetToken, newPassword });

    assert.equal(reset.status, 200);

    const loginNew = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: newPassword });
    assert.equal(loginNew.status, 200);

    // Logout відкликає токен
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: loginNew.body.tokens.refreshToken });
    assert.equal(logoutRes.status, 204);
  });
});

describe('2. RBAC Authorization, Search, Pagination & Audit Logs', () => {
  const regularUser = {
    email: 'rbac_user@example.com',
    username: 'rbac_user',
    password: 'StrongPassword123',
  };
  let userToken;
  let adminToken;
  let createdGenreId;
  let createdGameId;

  before(async () => {
    await prisma.game.deleteMany({ where: { slug: 'test-rbac-game' } });
    await prisma.genre.deleteMany({ where: { slug: 'test-rbac-genre' } });
    await prisma.user.deleteMany({ where: { email: regularUser.email } });

    const genre = await prisma.genre.create({
      data: { name: 'Test RBAC Genre', slug: 'test-rbac-genre' },
    });
    createdGenreId = genre.id;

    const reg = await request(app).post('/api/auth/register').send(regularUser);
    userToken = reg.body.tokens.accessToken;

    // Підвищуємо роль користувача до ADMIN для перевірки адміністративних маршрутів
    await prisma.user.update({
      where: { email: regularUser.email },
      data: { role: 'ADMIN' },
    });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: regularUser.email, password: regularUser.password });
    adminToken = adminLogin.body.tokens.accessToken;
  });

  after(async () => {
    if (createdGameId) {
      await prisma.game.deleteMany({ where: { id: createdGameId } });
    }
    if (createdGenreId) {
      await prisma.genre.deleteMany({ where: { id: createdGenreId } });
    }
    await prisma.user.deleteMany({ where: { email: regularUser.email } });
  });

  test('забороняє звичайному USER створювати гру (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/games')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test RBAC Game',
        slug: 'test-rbac-game',
        developer: 'FairInteractive',
        releaseYear: 2026,
        genreId: createdGenreId,
      });

    assert.equal(res.status, 403);
  });

  test('дозволяє ADMIN створити гру (201), знайти її з пагінацією (200) та переглянути AuditLog', async () => {
    const createRes = await request(app)
      .post('/api/games')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test RBAC Game',
        slug: 'test-rbac-game',
        developer: 'FairInteractive',
        releaseYear: 2026,
        genreId: createdGenreId,
      });

    assert.equal(createRes.status, 201);
    createdGameId = createRes.body.data.id;

    const searchRes = await request(app).get('/api/games?page=1&limit=5&search=Test%20RBAC');
    assert.equal(searchRes.status, 200);
    assert.equal(searchRes.body.data.length, 1);
    assert.equal(searchRes.body.pagination.page, 1);
    assert.equal(searchRes.body.pagination.total, 1);

    const auditRes = await request(app)
      .get('/api/audit-logs?action=GAME_CREATED')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(auditRes.status, 200);
    assert.ok(auditRes.body.data.length >= 1);
  });
});

describe('3. Files API (Multer 2.x Validation & CRUD)', () => {
  const fileUser = {
    email: 'files_tester@example.com',
    username: 'files_tester',
    password: 'StrongPassword123',
  };
  let token;
  const uploadedPaths = [];
  const pngBuffer = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

  before(async () => {
    await prisma.user.deleteMany({ where: { email: fileUser.email } });
    const res = await request(app).post('/api/auth/register').send(fileUser);
    token = res.body.tokens.accessToken;
  });

  after(async () => {
    for (const filePath of uploadedPaths) {
      await fs.unlink(filePath).catch(() => {});
    }
    await prisma.user.deleteMany({ where: { email: fileUser.email } });
    await prisma.$disconnect();
  });

  test('відхиляє завантаження без JWT токена (401)', async () => {
    const res = await request(app).post('/api/files/upload');
    assert.equal(res.status, 401);
  });

  test('завантажує валідний PNG, відхиляє .exe та файл > 5 МБ, оновлює і видаляє файл', async () => {
    const auth = { Authorization: `Bearer ${token}` };

    // 1. Успішне завантаження PNG (201)
    const uploadOk = await request(app)
      .post('/api/files/upload')
      .set(auth)
      .field('description', 'Скріншот боса')
      .attach('file', pngBuffer, { filename: 'boss.png', contentType: 'image/png' });

    assert.equal(uploadOk.status, 201);
    const fileId = uploadOk.body.file.id;
    uploadedPaths.push(uploadOk.body.file.path);

    // 2. Відхилення небезпечного розширення .exe (400)
    const uploadBadExt = await request(app)
      .post('/api/files/upload')
      .set(auth)
      .attach('file', pngBuffer, { filename: 'virus.exe', contentType: 'application/x-msdownload' });
    assert.equal(uploadBadExt.status, 400);

    // 3. Відхилення файлу понад 5 МБ (400)
    const uploadTooBig = await request(app)
      .post('/api/files/upload')
      .set(auth)
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'huge.png',
        contentType: 'image/png',
      });
    assert.equal(uploadTooBig.status, 400);
    assert.equal(uploadTooBig.body.error, 'Файл занадто великий');

    // 4. Отримання файлу за ID (200)
    const getRes = await request(app).get(`/api/files/${fileId}`);
    assert.equal(getRes.status, 200);

    // 5. Оновлення опису файлу (200)
    const updateRes = await request(app)
      .put(`/api/files/${fileId}`)
      .set(auth)
      .field('description', 'Оновлений опис скріншоту');
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.file.description, 'Оновлений опис скріншоту');

    // 6. Пакетне завантаження декількох файлів (201)
    const multiRes = await request(app)
      .post('/api/files/upload-multiple')
      .set(auth)
      .attach('files', pngBuffer, { filename: 'shot1.png', contentType: 'image/png' })
      .attach('files', pngBuffer, { filename: 'shot2.png', contentType: 'image/png' });
    assert.equal(multiRes.status, 201);
    assert.equal(multiRes.body.files.length, 2);
    for (const f of multiRes.body.files) {
      uploadedPaths.push(f.path);
    }

    // 7. Видалення файлу (200)
    const delRes = await request(app).delete(`/api/files/${fileId}`).set(auth);
    assert.equal(delRes.status, 200);
  });
});