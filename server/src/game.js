// Moteur de jeu : salons à code, tours, mots, indices, scores.
// Règle d'or anti-triche : le mot n'est JAMAIS envoyé à un joueur qui doit le deviner.
import crypto from 'node:crypto';
import { PACKS, PRESETS, PACK_LIST, PRESET_LIST, DEFAULT_PACKS, cleanPacks } from './words.js';
import { recordGame } from './store.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MAX_ROOMS = 300;
const CHOOSE_MS = 15_000;
const TURN_END_MS = 8_000; // laisse le temps de voter pour le dessin
const VOTE_POINTS = 25;     // par vote positif net, pour le dessinateur
const BEST_DRAWING_BONUS = 150;
const GAME_OVER_MS = 15_000;
const GRACE_MS = 60_000; // délai pour revenir après une déco sans perdre ses points
const EMPTY_ROOM_MS = 120_000;
const MAX_HISTORY = 40_000;
const CANVAS_W = 800;
const CANVAS_H = 600;
// Nombre de pièces par partie du perso (doit correspondre à web/public/avatar.js)
export const AVATAR_LIMITS = { s: 8, h: 12, e: 10, m: 10, a: 10 };
const HINT_THRESHOLDS = [0.45, 0.65, 0.82];

const rooms = new Map();

// ---------- utilitaires ----------
const rand = (n) => crypto.randomInt(n);
const clampInt = (v, min, max, def) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};
export function normalizeAvatar(av, fallback = { s: 0, h: 0, e: 0, m: 0, a: 0 }) {
  const src = av && typeof av === 'object' ? av : {};
  const out = {};
  for (const [k, n] of Object.entries(AVATAR_LIMITS)) out[k] = clampInt(src[k], 0, n - 1, fallback[k] ?? 0);
  return out;
}
const isLetter = (ch) => /[\p{L}\p{N}]/u.test(ch);

export function cleanText(s, max) {
  return String(s ?? '')
    .replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, '')
    .trim()
    .slice(0, max);
}

export function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

class Bucket {
  constructor(rate, burst) {
    this.rate = rate;
    this.burst = burst;
    this.tokens = burst;
    this.last = Date.now();
  }
  take() {
    const now = Date.now();
    this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 1000) * this.rate);
    this.last = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}

function genCode() {
  for (let i = 0; i < 100; i++) {
    let c = '';
    for (let j = 0; j < 4; j++) c += CODE_ALPHABET[rand(CODE_ALPHABET.length)];
    if (!rooms.has(c)) return c;
  }
  return null;
}

const validColor = (c) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : null);
const validNum = (v, min, max) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : null);
function validCoords(arr, n) {
  if (!Array.isArray(arr) || arr.length !== n) return null;
  const out = [];
  for (let i = 0; i < n; i++) {
    const v = validNum(arr[i], 0, i % 2 === 0 ? CANVAS_W : CANVAS_H);
    if (v === null) return null;
    out.push(Math.round(v * 10) / 10);
  }
  return out;
}

// ---------- salon ----------
class Room {
  constructor(io, code) {
    this.io = io;
    this.code = code;
    this.players = new Map();
    this.hostId = null;
    this.kicked = new Set();
    this.settings = { preset: 'normal', packs: [...DEFAULT_PACKS], rounds: 3, drawTime: 80, maxPlayers: 10, hints: true, customOnly: false, customWords: [] };
    this.turnLog = [];
    this.best = null;
    this.voteSettled = 0;
    this.emptySince = null;
    this.turnId = 0;
    this.podium = null;
    this.toLobby();
  }

  toLobby() {
    this.state = 'lobby';
    this.round = 0;
    this.order = [];
    this.turnIndex = -1;
    this.usedWords = new Set();
    this.clearTurn();
  }

  clearTurn() {
    this.drawerId = null;
    this.word = null;
    this.choices = [];
    this.revealed = new Set();
    this.hintsGiven = 0;
    this.maxHints = 0;
    this.history = [];
    this.deadline = 0;
    this.turnStart = 0;
    this.guessOrder = [];
    this.reactions = new Map();
  }

  get connected() {
    return [...this.players.values()].filter((p) => p.connected);
  }

  inGame() {
    return this.state === 'choosing' || this.state === 'drawing' || this.state === 'turnEnd';
  }

  socketOf(p) {
    return p?.socketId ? this.io.sockets.sockets.get(p.socketId) : null;
  }

  emitTo(p, ev, data) {
    if (p?.connected && p.socketId) this.io.to(p.socketId).emit(ev, data);
  }

  chat(msg) {
    this.io.to(this.code).emit('chat', msg);
  }

  sys(text, kind = 'system') {
    this.chat({ kind, text });
  }

  hint() {
    if (!this.word) return '';
    return [...this.word].map((ch, i) => (isLetter(ch) && !this.revealed.has(i) ? '_' : ch)).join('');
  }

  reactionCounts() {
    let up = 0;
    let down = 0;
    for (const v of this.reactions.values()) v > 0 ? up++ : down++;
    return { up, down };
  }

  stateFor(p) {
    const isHost = p.id === this.hostId;
    const isDrawer = p.id === this.drawerId;
    const showWord = Boolean(this.word) && (isDrawer || p.guessed || this.state === 'turnEnd');
    const { customWords, ...publicSettings } = this.settings;
    return {
      code: this.code,
      me: p.id,
      hostId: this.hostId,
      state: this.state,
      round: this.round,
      turnId: this.turnId,
      timeLeft: this.deadline ? Math.max(0, this.deadline - Date.now()) : 0,
      settings: {
        ...publicSettings,
        customCount: customWords.length,
        // Seul l'hôte voit la liste : sinon les autres connaîtraient les mots à l'avance
        customWords: isHost ? customWords : null,
      },
      players: [...this.players.values()].map((q) => ({
        id: q.id,
        name: q.name,
        avatar: q.avatar,
        score: q.score,
        guessed: q.guessed,
        connected: q.connected,
        lastGain: q.lastGain,
      })),
      drawerId: this.drawerId,
      hint: this.hint(),
      word: showWord ? this.word : null,
      choices: isDrawer && this.state === 'choosing' ? this.choices : null,
      reactions: this.reactionCounts(),
      myReaction: this.reactions.get(p.id) ?? 0,
      podium: this.state === 'gameOver' ? this.podium : null,
      best: this.state === 'gameOver' ? this.best : null,
      catalog: this.state === 'lobby' || this.state === 'gameOver' ? { packs: PACK_LIST, presets: PRESET_LIST } : null,
    };
  }

  broadcast() {
    for (const p of this.players.values()) if (p.connected) this.emitTo(p, 'state', this.stateFor(p));
  }

  // ----- joueurs -----
  addPlayer(socket, data) {
    const token = typeof data.token === 'string' && /^[\w-]{16,64}$/.test(data.token) ? data.token : null;
    if (token && this.kicked.has(token)) return { error: 'Tu as été exclu de cette partie.' };
    const avatar = normalizeAvatar(data.avatar);
    let name = cleanText(data.name, 16);

    let p = token ? [...this.players.values()].find((q) => q.token === token) : null;
    if (p) {
      // Reconnexion : on récupère son score et sa place
      const oldSocket = p.socketId;
      p.socketId = socket.id;
      p.connected = true;
      p.disconnectedAt = null;
      p.avatar = avatar;
      if (oldSocket && oldSocket !== socket.id) this.io.sockets.sockets.get(oldSocket)?.disconnect(true);
      this.sys(`${p.name} est de retour`, 'join');
    } else {
      if (!name) return { error: 'Choisis un pseudo.' };
      if (this.connected.length >= this.settings.maxPlayers) return { error: 'La partie est pleine.' };
      const base = name;
      let k = 2;
      while ([...this.players.values()].some((q) => q.name.toLowerCase() === name.toLowerCase())) {
        name = `${base.slice(0, 14)}${k++}`;
      }
      p = {
        id: crypto.randomBytes(4).toString('hex'),
        token: token ?? crypto.randomBytes(16).toString('hex'),
        socketId: socket.id,
        name,
        avatar,
        score: 0,
        guessed: false,
        lastGain: 0,
        connected: true,
        disconnectedAt: null,
      };
      this.players.set(p.id, p);
      if (this.inGame() && !this.order.includes(p.id)) this.order.push(p.id);
      this.sys(`${p.name} a rejoint la partie`, 'join');
    }

    if (!this.hostId || !this.players.get(this.hostId)?.connected) this.hostId = p.id;
    socket.join(this.code);
    this.broadcast();
    if (this.state === 'drawing') this.emitTo(p, 'history', this.history);
    return { player: p };
  }

  handleDisconnect(p, socketId) {
    if (!p || p.socketId !== socketId || !this.players.has(p.id)) return;
    p.connected = false;
    p.disconnectedAt = Date.now();
    this.sys(`${p.name} s'est déconnecté`, 'leave');
    this.afterLeave(p);
  }

  removePlayer(p, msg) {
    if (!this.players.has(p.id)) return;
    this.players.delete(p.id);
    p.connected = false;
    this.socketOf(p)?.leave(this.code);
    this.sys(msg ?? `${p.name} a quitté la partie`, 'leave');
    this.afterLeave(p);
  }

  afterLeave(p) {
    if (this.hostId === p.id) {
      const next = this.connected[0];
      this.hostId = next ? next.id : null;
      if (next) this.sys(`${next.name} devient l'hôte`);
    }
    if (this.inGame() && this.connected.length < 2) {
      this.sys('Pas assez de joueurs, retour au salon.');
      this.toLobby();
      this.turnId++;
    } else if (this.drawerId === p.id && (this.state === 'choosing' || this.state === 'drawing')) {
      this.endTurn(`${p.name} est parti, tour terminé.`);
      return;
    } else if (this.state === 'drawing' && this.checkAllGuessed()) {
      return;
    }
    this.broadcast();
  }

  updateProfile(p, data) {
    let changed = false;
    if (data.avatar && typeof data.avatar === 'object') {
      p.avatar = normalizeAvatar(data.avatar, p.avatar);
      changed = true;
    }
    if ('name' in data) {
      const name = cleanText(data.name, 16);
      if (!name) return 'Le pseudo ne peut pas être vide.';
      const taken = [...this.players.values()].some((q) => q !== p && q.name.toLowerCase() === name.toLowerCase());
      if (taken) return 'Ce pseudo est déjà pris dans la partie.';
      if (name !== p.name) {
        this.sys(`${p.name} s'appelle maintenant ${name}`);
        p.name = name;
        changed = true;
      }
    }
    if (changed) this.broadcast();
    return null;
  }

  kick(by, targetId) {
    if (by.id !== this.hostId || targetId === by.id) return;
    const t = this.players.get(targetId);
    if (!t) return;
    this.kicked.add(t.token);
    this.emitTo(t, 'kicked');
    this.removePlayer(t, `${t.name} a été exclu`);
  }

  updateSettings(by, s) {
    if (by.id !== this.hostId || (this.state !== 'lobby' && this.state !== 'gameOver')) return;
    const st = this.settings;
    if (typeof s.preset === 'string' && Object.hasOwn(PRESETS, s.preset)) {
      // Un mode préréglé règle tout d'un coup
      const pr = PRESETS[s.preset];
      Object.assign(st, { preset: s.preset, packs: [...pr.packs], rounds: pr.rounds, drawTime: pr.drawTime, hints: pr.hints });
    } else {
      // Un réglage changé à la main fait passer en mode « Perso »
      const before = `${st.packs.join()}|${st.rounds}|${st.drawTime}|${st.hints}`;
      if (Array.isArray(s.packs)) st.packs = cleanPacks(s.packs);
      else if (typeof s.pack === 'string') st.packs = cleanPacks([s.pack]); // ancien format
      if ('rounds' in s) st.rounds = clampInt(s.rounds, 1, 10, st.rounds);
      if ('drawTime' in s) st.drawTime = clampInt(s.drawTime, 30, 240, st.drawTime);
      if (typeof s.hints === 'boolean') st.hints = s.hints;
      if (`${st.packs.join()}|${st.rounds}|${st.drawTime}|${st.hints}` !== before) st.preset = 'perso';
    }
    if ('maxPlayers' in s) st.maxPlayers = clampInt(s.maxPlayers, 2, 16, st.maxPlayers);
    if (typeof s.customOnly === 'boolean') st.customOnly = s.customOnly;
    if ('customWords' in s) {
      const raw = Array.isArray(s.customWords) ? s.customWords.join(',') : String(s.customWords ?? '');
      st.customWords = [...new Set(raw.split(/[,;\n]/).map((w) => cleanText(w, 30)).filter((w) => w.length >= 2))].slice(0, 300);
    }
    this.broadcast();
  }

  // ----- déroulement -----
  startGame(by) {
    if (by.id !== this.hostId) return 'Seul l\'hôte peut lancer la partie.';
    if (this.state !== 'lobby' && this.state !== 'gameOver') return null;
    if (this.connected.length < 2) return 'Il faut au moins 2 joueurs.';
    for (const p of [...this.players.values()]) {
      if (!p.connected) this.players.delete(p.id);
      p.score = 0;
      p.lastGain = 0;
      p.guessed = false;
    }
    this.toLobby();
    this.podium = null;
    this.turnLog = [];
    this.best = null;
    this.sys('La partie commence !', 'round');
    this.nextTurn();
    return null;
  }

  nextTurn() {
    this.settleVotes();
    this.turnIndex++;
    for (;;) {
      if (this.turnIndex >= this.order.length) {
        this.round++;
        if (this.round > this.settings.rounds) return this.gameOver();
        this.order = this.connected.map((p) => p.id);
        this.turnIndex = 0;
        this.sys(`Manche ${this.round} / ${this.settings.rounds}`, 'round');
      }
      if (this.players.get(this.order[this.turnIndex])?.connected) break;
      this.turnIndex++;
    }
    const drawer = this.players.get(this.order[this.turnIndex]);
    this.clearTurn();
    for (const q of this.players.values()) {
      q.guessed = false;
      q.lastGain = 0;
    }
    this.turnId++;
    this.drawerId = drawer.id;
    this.choices = this.pickWords(3);
    this.state = 'choosing';
    this.deadline = Date.now() + CHOOSE_MS;
    this.broadcast();
  }

  pickWords(n) {
    const custom = this.settings.customWords;
    const base = [...new Set(cleanPacks(this.settings.packs).flatMap((id) => PACKS[id].words))];
    const pool = this.settings.customOnly && custom.length >= n ? custom : [...base, ...custom, ...custom];
    let avail = [...new Set(pool.filter((w) => !this.usedWords.has(w)))];
    if (avail.length < n) {
      this.usedWords.clear();
      avail = [...new Set(pool)];
    }
    const out = [];
    while (out.length < n && avail.length) out.push(avail.splice(rand(avail.length), 1)[0]);
    return out;
  }

  chooseWord(p, idx) {
    if (this.state !== 'choosing' || p.id !== this.drawerId || !this.choices.length) return;
    this.word = this.choices[clampInt(idx, 0, this.choices.length - 1, 0)];
    this.usedWords.add(this.word);
    this.state = 'drawing';
    this.turnStart = Date.now();
    this.deadline = this.turnStart + this.settings.drawTime * 1000;
    const letters = [...this.word].filter(isLetter).length;
    this.maxHints = this.settings.hints ? Math.min(3, Math.max(0, Math.floor((letters - 1) / 2))) : 0;
    this.sys(`${p.name} dessine`, 'turn');
    this.broadcast();
  }

  revealHint() {
    const hidden = [...this.word].map((ch, i) => i).filter((i) => isLetter(this.word[i]) && !this.revealed.has(i));
    this.hintsGiven++;
    if (hidden.length <= 1) return;
    this.revealed.add(hidden[rand(hidden.length)]);
    this.broadcast();
  }

  checkAllGuessed() {
    const guessers = this.connected.filter((p) => p.id !== this.drawerId);
    if (guessers.length > 0 && guessers.every((g) => g.guessed)) {
      this.endTurn('Tout le monde a trouvé !');
      return true;
    }
    return false;
  }

  endTurn(msg) {
    if (this.state !== 'drawing' && this.state !== 'choosing') return;
    if (msg) this.sys(msg);
    if (this.word) this.sys(`Le mot était « ${this.word} »`, 'reveal');
    this.state = 'turnEnd';
    this.deadline = Date.now() + TURN_END_MS;
    this.broadcast();
  }

  // Votes sur le dessin du tour : des points bonus pour le dessinateur
  settleVotes() {
    if (this.state !== 'turnEnd' || !this.word || this.voteSettled === this.turnId) return;
    this.voteSettled = this.turnId;
    const { up, down } = this.reactionCounts();
    const drawer = this.players.get(this.drawerId);
    const bonus = Math.max(0, up - down) * VOTE_POINTS;
    if (drawer && bonus) {
      drawer.score += bonus;
      this.sys(`${drawer.name} gagne +${bonus} grâce à vos votes`, 'success');
    }
    this.turnLog.push({ drawerId: this.drawerId, by: drawer?.name ?? '', word: this.word, up, down });
  }

  gameOver() {
    // Meilleur dessin de la partie : le plus de votes positifs nets
    const top = this.turnLog.filter((t) => t.up > 0).sort((a, b) => (b.up - b.down) - (a.up - a.down) || b.up - a.up)[0];
    this.best = null;
    if (top) {
      const artist = this.players.get(top.drawerId);
      if (artist) artist.score += BEST_DRAWING_BONUS;
      this.best = { word: top.word, by: top.by, up: top.up, bonus: BEST_DRAWING_BONUS };
      this.sys(`Meilleur dessin : « ${top.word} » par ${top.by} (+${BEST_DRAWING_BONUS})`, 'win');
    }
    this.state = 'gameOver';
    this.turnId++; // efface le dernier dessin chez tout le monde
    this.drawerId = null;
    this.word = null;
    this.deadline = Date.now() + GAME_OVER_MS;
    const ranked = [...this.players.values()].sort((a, b) => b.score - a.score);
    this.podium = ranked.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score }));
    if (ranked[0]) this.sys(`${ranked[0].name} remporte la partie !`, 'win');
    recordGame(this.podium).catch(() => {});
    this.broadcast();
  }

  tick(now) {
    if (this.state === 'choosing' && now >= this.deadline) {
      const d = this.players.get(this.drawerId);
      if (d) this.chooseWord(d, rand(this.choices.length || 1));
      else this.nextTurn();
    } else if (this.state === 'drawing') {
      if (now >= this.deadline) {
        this.endTurn('Temps écoulé !');
      } else if (this.hintsGiven < this.maxHints) {
        const frac = (now - this.turnStart) / (this.deadline - this.turnStart);
        if (frac >= HINT_THRESHOLDS[this.hintsGiven]) this.revealHint();
      }
    } else if (this.state === 'turnEnd' && now >= this.deadline) {
      this.nextTurn();
    } else if (this.state === 'gameOver' && now >= this.deadline) {
      this.toLobby();
      this.turnId++;
      this.broadcast();
    }
    for (const p of [...this.players.values()]) {
      if (!p.connected && p.disconnectedAt && now - p.disconnectedAt > GRACE_MS) this.players.delete(p.id);
    }
  }

  // ----- chat et devinettes -----
  handleChat(p, raw) {
    const text = cleanText(raw, 100);
    if (!text) return;
    const msg = { kind: 'chat', from: { id: p.id, name: p.name, avatar: p.avatar }, text };

    if (this.state === 'drawing') {
      // Le dessinateur et ceux qui ont trouvé parlent dans un canal secret
      if (p.id === this.drawerId || p.guessed) return this.secretChat(msg);
      const g = normalize(text);
      const w = normalize(this.word);
      if (g === w || ` ${g} `.includes(` ${w} `)) return this.correctGuess(p);
      if (w.length >= 4 && levenshtein(g, w) <= 1) {
        // "Presque" : visible uniquement par l'auteur, pour ne pas souffler la réponse aux autres
        this.emitTo(p, 'chat', msg);
        this.emitTo(p, 'chat', { kind: 'close', text: `« ${text} » : tu chauffes !` });
        return;
      }
    }
    this.chat(msg);
  }

  secretChat(msg) {
    msg.kind = 'secret';
    for (const q of this.players.values()) {
      if (q.connected && (q.guessed || q.id === this.drawerId)) this.emitTo(q, 'chat', msg);
    }
  }

  correctGuess(p) {
    const total = this.deadline - this.turnStart;
    const remaining = Math.max(0, this.deadline - Date.now()) / total;
    const first = this.guessOrder.length === 0;
    const pts = Math.round(100 + 400 * remaining) + (first ? 50 : 0);
    p.score += pts;
    p.lastGain = pts;
    p.guessed = true;
    this.guessOrder.push(p.id);
    const drawer = this.players.get(this.drawerId);
    if (drawer) {
      const dp = Math.round(50 + 50 * remaining);
      drawer.score += dp;
      drawer.lastGain += dp;
    }
    this.sys(first ? `${p.name} a trouvé en premier !` : `${p.name} a trouvé !`, 'success');
    this.emitTo(p, 'chat', { kind: 'success-me', text: `Bien vu ! C'était « ${this.word} » (+${pts})` });
    this.io.to(this.code).emit('sfx', 'guess');
    if (!this.checkAllGuessed()) this.broadcast();
  }

  react(p, v) {
    if ((this.state !== 'drawing' && this.state !== 'turnEnd') || p.id === this.drawerId) return;
    this.reactions.set(p.id, v > 0 ? 1 : -1);
    this.io.to(this.code).emit('reactions', this.reactionCounts());
  }

  // ----- dessin -----
  draw(p, op) {
    if (this.state !== 'drawing' || p.id !== this.drawerId || !op || typeof op !== 'object') return;
    if (this.history.length >= MAX_HISTORY) return;
    const s = typeof op.s === 'string' && /^[\w-]{1,32}$/.test(op.s) ? op.s : null;
    if (!s) return;
    let clean = null;
    if (op.t === 'l') {
      const c = validColor(op.c);
      const w = validNum(op.w, 1, 80);
      const pts = validCoords(op.p, 4);
      if (c && w && pts) clean = { t: 'l', s, c, w, p: pts };
    } else if (op.t === 'f') {
      const c = validColor(op.c);
      const pts = validCoords(op.p, 2);
      if (c && pts) clean = { t: 'f', s, c, p: pts.map(Math.floor) };
    } else if (op.t === 'c') {
      clean = { t: 'c', s };
    }
    if (!clean) return;
    this.history.push(clean);
    this.socketOf(p)?.to(this.code).emit('draw', clean);
  }

  undo(p) {
    if (this.state !== 'drawing' || p.id !== this.drawerId || !this.history.length) return;
    const s = this.history[this.history.length - 1].s;
    while (this.history.length && this.history[this.history.length - 1].s === s) this.history.pop();
    this.io.to(this.code).emit('undo', { s });
  }
}

// ---------- branchement Socket.io ----------
export function stats() {
  let players = 0;
  for (const r of rooms.values()) players += r.connected.length;
  return { rooms: rooms.size, players };
}

export function attach(io) {
  const loop = setInterval(() => {
    const now = Date.now();
    for (const [code, r] of rooms) {
      try {
        r.tick(now);
      } catch (e) {
        console.error(`[room ${code}]`, e);
      }
      if (r.connected.length === 0) {
        r.emptySince ??= now;
        if (now - r.emptySince > EMPTY_ROOM_MS) rooms.delete(code);
      } else {
        r.emptySince = null;
      }
    }
  }, 250);

  io.on('connection', (socket) => {
    let room = null;
    let player = null;
    const chatLimit = new Bucket(1.5, 5);
    const drawLimit = new Bucket(240, 400);
    const actionLimit = new Bucket(4, 12);

    const me = () => (room && player && room.players.get(player.id) === player && player.socketId === socket.id ? player : null);
    const reply = (cb, data) => typeof cb === 'function' && cb(data);
    const obj = (d) => (d && typeof d === 'object' ? d : {});

    const leaveCurrent = () => {
      if (me()) room.removePlayer(player);
      room = null;
      player = null;
    };

    const enter = (r, data, cb) => {
      if (me()) leaveCurrent();
      const res = r.addPlayer(socket, data);
      if (res.error) return reply(cb, { error: res.error });
      room = r;
      player = res.player;
      reply(cb, { ok: true, code: r.code, token: player.token, id: player.id });
    };

    socket.on('room:create', (data, cb) => {
      data = obj(data);
      if (!actionLimit.take()) return reply(cb, { error: 'Trop de demandes, attends une seconde.' });
      if (!cleanText(data.name, 16)) return reply(cb, { error: 'Choisis un pseudo.' });
      const code = rooms.size < MAX_ROOMS ? genCode() : null;
      if (!code) return reply(cb, { error: 'Serveur plein, réessaie plus tard.' });
      const r = new Room(io, code);
      rooms.set(code, r);
      enter(r, data, cb);
    });

    socket.on('room:join', (data, cb) => {
      data = obj(data);
      if (!actionLimit.take()) return reply(cb, { error: 'Trop de demandes, attends une seconde.' });
      const code = String(data.code ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
      const r = rooms.get(code);
      if (!r) return reply(cb, { error: 'Aucune partie avec ce code.' });
      enter(r, data, cb);
    });

    socket.on('room:leave', () => leaveCurrent());
    socket.on('room:settings', (s) => me() && room.updateSettings(player, obj(s)));
    socket.on('room:kick', (id) => me() && room.kick(player, String(id)));
    socket.on('player:update', (data, cb) => {
      if (!me()) return reply(cb, { error: 'Tu n\'es dans aucune partie.' });
      if (!actionLimit.take()) return reply(cb, { error: 'Trop de demandes, attends une seconde.' });
      const err = room.updateProfile(player, obj(data));
      reply(cb, err ? { error: err } : { ok: true, name: player.name });
    });
    socket.on('game:start', (_d, cb) => {
      if (!me()) return;
      const err = room.startGame(player);
      if (err) reply(cb, { error: err });
    });
    socket.on('word:choose', (i) => me() && room.chooseWord(player, i));
    socket.on('chat', (text) => {
      if (!me()) return;
      if (!chatLimit.take()) return room.emitTo(player, 'chat', { kind: 'error', text: 'Tu écris trop vite, attends une seconde.' });
      room.handleChat(player, text);
    });
    socket.on('draw', (op) => me() && drawLimit.take() && room.draw(player, op));
    socket.on('draw:undo', () => me() && actionLimit.take() && room.undo(player));
    socket.on('react', (v) => me() && room.react(player, Number(v)));
    socket.on('disconnect', () => {
      if (room && player) room.handleDisconnect(player, socket.id);
    });
  });

  // Permet d'arrêter proprement la boucle (tests, arrêt du serveur)
  return () => {
    clearInterval(loop);
    rooms.clear();
  };
}
