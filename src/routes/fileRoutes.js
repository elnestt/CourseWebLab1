import { Router } from 'express';
import {
  uploadFile,
  uploadMultipleFiles,
  getFiles,
  getFile,
  updateFile,
  deleteFile,
} from '../controllers/fileController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: Отримання списку завантажених файлів із пагінацією
 *     tags: [Files]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10 } }
 *       - { in: query, name: uploadedBy, schema: { type: integer } }
 *       - { in: query, name: mimetype, schema: { type: string, example: "image/" } }
 *     responses:
 *       200: { description: Список файлів }
 */
router.get('/', getFiles);

/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     summary: Завантаження одного файлу (обкладинка, аватар, скріншот)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary }
 *               description: { type: string, example: "Обкладинка гри Blood of Dawn" }
 *     responses:
 *       201: { description: Файл успішно завантажено }
 *       400: { description: Файл не надано, непідтримуваний тип або перевищено 5 МБ }
 *       401: { description: Необхідна аутентифікація }
 */
router.post('/upload', authenticate, upload.single('file'), uploadFile);

/**
 * @swagger
 * /api/files/upload-multiple:
 *   post:
 *     summary: Пакетне завантаження до 5 файлів одночасно
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [files]
 *             properties:
 *               files:
 *                 type: array
 *                 items: { type: string, format: binary }
 *               description: { type: string, example: "Скріншоти бос-файту" }
 *     responses:
 *       201: { description: Файли успішно завантажено }
 *       400: { description: Помилка валідації файлів }
 *       401: { description: Необхідна аутентифікація }
 */
router.post('/upload-multiple', authenticate, upload.array('files', 5), uploadMultipleFiles);

/**
 * @swagger
 * /api/files/{id}:
 *   get:
 *     summary: Отримання (перегляд/завантаження) файлу за ID
 *     tags: [Files]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Вміст файлу }
 *       404: { description: Файл не знайдено }
 */
router.get('/:id', getFile);

/**
 * @swagger
 * /api/files/{id}:
 *   put:
 *     summary: Оновлення опису або заміна файлу
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *               description: { type: string, example: "Оновлений опис скріншоту" }
 *     responses:
 *       200: { description: Файл успішно оновлено }
 *       403: { description: Недостатньо прав }
 *       404: { description: Файл не знайдено }
 */
router.put('/:id', authenticate, upload.single('file'), updateFile);

/**
 * @swagger
 * /api/files/{id}:
 *   delete:
 *     summary: Видалення файлу (власник або ADMIN)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Файл успішно видалено }
 *       403: { description: Недостатньо прав }
 *       404: { description: Файл не знайдено }
 */
router.delete('/:id', authenticate, deleteFile);

export default router;