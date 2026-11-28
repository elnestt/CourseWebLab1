import 'dotenv/config';
import { createServer } from 'node:http';
import app from './app.js';
import { initSocket } from './socket/index.js';

const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);

const io = await initSocket(httpServer);
app.set('io', io);

httpServer.listen(PORT, () => {
  console.log(`Сервер запущено на порту ${PORT}`);
  console.log(`Документація Swagger: http://localhost:${PORT}/api-docs`);
});