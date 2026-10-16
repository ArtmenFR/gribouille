// Classement global stocké dans Redis. Si Redis est absent, le jeu tourne quand même.
import { createClient } from 'redis';

let client = null;

export function initStore(url) {
  if (!url) {
    console.log('[redis] pas de REDIS_URL, classement désactivé');
    return;
  }
  client = createClient({ url, socket: { reconnectStrategy: (n) => Math.min(n * 500, 5000) } });
  client.on('error', (e) => console.warn('[redis]', e.message));
  client.on('ready', () => console.log('[redis] connecté'));
  client.connect().catch((e) => console.warn('[redis]', e.message));
}

const ready = () => Boolean(client?.isReady);

export async function recordGame(podium) {
  if (!ready() || !podium?.length) return;
  const m = client.multi().incr('stats:games');
  podium.forEach((p, i) => {
    if (p.score > 0) m.zIncrBy('lb:points', p.score, p.name);
    if (i === 0 && p.score > 0) m.zIncrBy('lb:wins', 1, p.name);
  });
  await m.exec();
}

export async function getLeaderboard() {
  if (!ready()) return { available: false };
  const [wins, points, games] = await Promise.all([
    client.zRangeWithScores('lb:wins', 0, 9, { REV: true }),
    client.zRangeWithScores('lb:points', 0, 9, { REV: true }),
    client.get('stats:games'),
  ]);
  const fmt = (arr) => arr.map((x) => ({ name: x.value, score: x.score }));
  return { available: true, games: Number(games) || 0, wins: fmt(wins), points: fmt(points) };
}

// Derniers mots joués, pour ne pas retomber sur les mêmes d'une partie à l'autre.
const RECENT_KEY = 'words:recent';
const RECENT_KEEP = 400;

export async function rememberWords(words) {
  if (!ready() || !words?.length) return;
  await client.multi().lPush(RECENT_KEY, words).lTrim(RECENT_KEY, 0, RECENT_KEEP - 1).exec();
}

// Appelé au démarrage : attend que Redis soit prêt (au plus 10 s), du plus ancien au plus récent.
export async function loadRecentWords() {
  if (!client) return [];
  if (!ready()) {
    await new Promise((resolve) => {
      const t = setTimeout(resolve, 10_000);
      client.once('ready', () => { clearTimeout(t); resolve(); });
    });
  }
  if (!ready()) return [];
  return (await client.lRange(RECENT_KEY, 0, RECENT_KEEP - 1)).reverse();
}
