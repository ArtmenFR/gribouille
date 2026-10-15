// Test d'intégration : de vrais clients Socket.io jouent une partie complète.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import { attach } from '../src/game.js';

let httpServer;
let stop;
let url;
const clients = [];

before(async () => {
  httpServer = http.createServer();
  const io = new Server(httpServer);
  stop = attach(io);
  await new Promise((r) => httpServer.listen(0, r));
  url = `http://127.0.0.1:${httpServer.address().port}`;
});

after(() => {
  clients.forEach((c) => c.close());
  stop();
  httpServer.close();
});

function connect() {
  const c = Client(url, { transports: ['websocket'], forceNew: true });
  c.states = [];
  c.chats = [];
  c.draws = [];
  c.on('state', (s) => c.states.push(s));
  c.on('chat', (m) => c.chats.push(m));
  c.on('draw', (op) => c.draws.push(op));
  clients.push(c);
  return new Promise((r) => c.on('connect', () => r(c)));
}
const call = (c, ev, data) => new Promise((r) => c.emit(ev, data, r));
const last = (c) => c.states.at(-1);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 3000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (fn()) return;
    await wait(20);
  }
  throw new Error('timeout');
}

test('une partie complète : créer, rejoindre, dessiner, deviner', async () => {
  const alice = await connect();
  const bob = await connect();
  const carl = await connect();

  // Création et arrivée des joueurs avec le code
  const created = await call(alice, 'room:create', { name: 'Alice', avatar: { e: 1, c: 2 }, token: 'a'.repeat(32) });
  assert.ok(created.ok);
  assert.match(created.code, /^[A-Z]{4}$/);
  assert.ok((await call(bob, 'room:join', { name: 'Bob', code: created.code, token: 'b'.repeat(32) })).ok);
  assert.ok((await call(carl, 'room:join', { name: 'Carl', code: created.code.toLowerCase(), token: 'c'.repeat(32) })).ok);
  const ghost = await connect();
  assert.equal((await call(ghost, 'room:join', { name: 'X', code: 'ZZZZ' })).error, 'Aucune partie avec ce code.');

  await until(() => last(alice)?.players.length === 3);
  assert.equal(last(alice).hostId, last(alice).me);

  // Seul l'hôte peut lancer
  assert.ok((await call(bob, 'game:start')).error);
  alice.emit('room:settings', { rounds: 1, drawTime: 60, customWords: 'kebab, prof de réseau', customOnly: false });
  await until(() => last(alice)?.settings.rounds === 1);
  assert.deepEqual(last(alice).settings.customWords, ['kebab', 'prof de réseau']);
  await until(() => last(bob)?.settings.customCount === 2);
  assert.equal(last(bob).settings.customWords, null, 'les mots perso restent secrets');

  alice.emit('game:start');
  const all = [alice, bob, carl];
  await until(() => all.every((c) => last(c)?.state === 'choosing'));

  // Le dessinateur reçoit 3 choix, les autres rien
  const drawer = all.find((c) => last(c).drawerId === last(c).me);
  const guessers = all.filter((c) => c !== drawer);
  assert.equal(last(drawer).choices.length, 3);
  guessers.forEach((g) => assert.equal(last(g).choices, null));

  drawer.emit('word:choose', 0);
  await until(() => all.every((c) => last(c).state === 'drawing'));
  const word = last(drawer).word;
  assert.ok(word);

  // ANTI-TRICHE : le mot ne fuite jamais chez ceux qui devinent
  for (const g of guessers) {
    assert.equal(last(g).word, null);
    assert.ok(!JSON.stringify(g.states).includes(`"${word}"`) || word.length < 3);
    assert.equal(last(g).hint.replace(/[^_]/g, '').length > 0, true);
  }

  // Dessin relayé, un non-dessinateur ne peut pas dessiner
  drawer.emit('draw', { t: 'l', s: 'x-1', c: '#FF0000', w: 10, p: [10, 10, 9999, -5] });
  await until(() => guessers.every((g) => g.draws.length === 1));
  assert.deepEqual(guessers[0].draws[0].p, [10, 10, 800, 0], 'coordonnées bornées par le serveur');
  assert.equal(guessers[0].draws[0].c, '#ff0000');
  guessers[0].emit('draw', { t: 'c', s: 'hack' });
  drawer.emit('draw', { t: 'l', s: 'x-1', c: 'red;drop', w: 10, p: [1, 1, 2, 2] });
  await wait(150);
  assert.equal(guessers[1].draws.length, 1, 'ops invalides ou non autorisées ignorées');

  // Une mauvaise réponse est publique
  guessers[0].emit('chat', 'zzzzzz');
  await until(() => guessers[1].chats.some((m) => m.text === 'zzzzzz'));

  // Une réponse proche reste privée
  const w = word.normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (w.replace(/[^a-z]/gi, '').length >= 5 && !w.includes(' ')) {
    const typo = `${w}x`;
    guessers[0].emit('chat', typo);
    await until(() => guessers[0].chats.some((m) => m.kind === 'close'));
    await wait(100);
    assert.ok(!guessers[1].chats.some((m) => m.text === typo), 'le "presque" ne fuite pas');
  }

  // Bonne réponse en majuscules et sans accents
  guessers[0].emit('chat', w.toUpperCase());
  await until(() => guessers[0].chats.some((m) => m.kind === 'success-me'));
  await until(() => last(guessers[0]).word === word);
  assert.equal(last(guessers[1]).word, null, 'toujours caché pour celui qui cherche');
  const g0 = last(alice).players.find((p) => p.id === last(guessers[0]).me);
  assert.ok(g0.score >= 100);

  // Chat secret entre ceux qui ont trouvé
  guessers[0].emit('chat', 'psst');
  await until(() => drawer.chats.some((m) => m.kind === 'secret' && m.text === 'psst'));
  await wait(100);
  assert.ok(!guessers[1].chats.some((m) => m.text === 'psst'), 'le chat secret ne fuite pas');

  // Le dernier trouve -> fin du tour
  guessers[1].emit('chat', `c'est ${w} non ?`);
  await until(() => all.every((c) => last(c).state === 'turnEnd'));
  assert.equal(last(guessers[1]).word, word);
  const drawerScore = last(alice).players.find((p) => p.id === last(drawer).me).score;
  assert.ok(drawerScore > 0, 'le dessinateur marque aussi');
});

test('reconnexion avec le même jeton : on garde son score', async () => {
  const a = await connect();
  const b = await connect();
  const r = await call(a, 'room:create', { name: 'Hôte', token: 'h'.repeat(32) });
  await call(b, 'room:join', { name: 'Zoé', code: r.code, token: 'z'.repeat(32) });
  await until(() => last(a)?.players.length === 2);
  b.close();
  await until(() => last(a).players.find((p) => p.name === 'Zoé')?.connected === false);
  const b2 = await connect();
  const again = await call(b2, 'room:join', { name: 'Zoé', code: r.code, token: 'z'.repeat(32) });
  assert.ok(again.ok);
  await until(() => last(a).players.length === 2 && last(a).players.every((p) => p.connected));
});

test('l\'hôte peut exclure, et l\'exclu ne revient pas', async () => {
  const a = await connect();
  const b = await connect();
  const r = await call(a, 'room:create', { name: 'Boss', token: 'k'.repeat(32) });
  await call(b, 'room:join', { name: 'Relou', code: r.code, token: 'r'.repeat(32) });
  await until(() => last(a)?.players.length === 2);
  const kicked = new Promise((res) => b.once('kicked', res));
  a.emit('room:kick', last(a).players.find((p) => p.name === 'Relou').id);
  await kicked;
  const retry = await call(b, 'room:join', { name: 'Relou', code: r.code, token: 'r'.repeat(32) });
  assert.match(retry.error, /exclu/);
});

test('les pseudos sont nettoyés et dédoublonnés', async () => {
  const a = await connect();
  const b = await connect();
  const r = await call(a, 'room:create', { name: '<b>Max</b>', token: 'm'.repeat(32) });
  await call(b, 'room:join', { name: '<b>Max</b>', code: r.code, token: 'n'.repeat(32) });
  await until(() => last(a)?.players.length === 2);
  const names = last(a).players.map((p) => p.name);
  assert.deepEqual(names, ['<b>Max</b>', '<b>Max</b>2']);
  assert.ok((await call(a, 'room:create', { name: '   ' })).error);
});
