import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { Server } from 'socket.io';
import { attach, stats } from './game.js';
import { readFileSync } from 'node:fs';
import { initStore, getLeaderboard } from './store.js';

const { version: VERSION } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.disable('x-powered-by');

app.get('/api/health', (_req, res) => res.json({ ok: true, version: VERSION, ...stats() }));

app.get('/api/leaderboard', async (_req, res) => {
  try {
    res.json(await getLeaderboard());
  } catch {
    res.json({ available: false });
  }
});

// En dev sans Docker : le serveur Node sert aussi le front
if (process.env.STATIC_DIR) {
  app.use(express.static(path.resolve(process.env.STATIC_DIR)));
}

const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 64 * 1024,
  pingInterval: 10000,
  pingTimeout: 8000,
});

initStore(process.env.REDIS_URL);
attach(io);

server.listen(PORT, () => console.log(`Gribouille ${VERSION} prêt sur le port ${PORT}`));

const shutdown = () => {
  io.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
