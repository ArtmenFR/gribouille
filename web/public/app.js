(() => {
  'use strict';

  // ---------- constantes ----------
  const AVATARS = ['🐱', '🐶', '🦊', '🐼', '🐸', '🐵', '🦁', '🐯', '🐨', '🐷', '🐙', '🦄', '🐧', '🦉', '🐢', '🐳', '🦖', '👾', '🤖', '👻', '🎃', '🍕', '🌵', '⭐'];
  const AV_COLORS = ['#ffd43b', '#ff8787', '#ffa94d', '#69db7c', '#63e6be', '#74c0fc', '#91a7ff', '#b197fc', '#f783ac', '#c0eb75', '#e9ecef', '#ffc9c9'];
  const PALETTE = ['#000000', '#495057', '#adb5bd', '#ffffff', '#e03131', '#f76707', '#f59f00', '#ffd43b',
    '#2f9e44', '#8ce99a', '#1971c2', '#74c0fc', '#6741d9', '#da77f2', '#c2255c', '#8d5524'];
  const SIZES = [4, 10, 20, 40];
  const W = 800;
  const H = 600;

  // ---------- helpers ----------
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indispo */ } },
  };
  const randToken = () => {
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  };
  function avatarEl(av, big) {
    const a = el('div', big ? 'avatar big' : 'avatar', AVATARS[av?.e] ?? AVATARS[0]);
    a.style.setProperty('--av', AV_COLORS[av?.c] ?? AV_COLORS[0]);
    return a;
  }
  let toastTimer = null;
  function toast(text, ms = 2200) {
    const t = $('#toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  // ---------- sons (WebAudio, pas de fichiers) ----------
  let muted = store.get('gb_muted', false);
  let actx = null;
  function tone(f, d, type = 'sine', v = 0.07, delay = 0) {
    if (muted) return;
    try {
      actx ??= new AudioContext();
      const t = actx.currentTime + delay;
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(actx.destination);
      o.start(t);
      o.stop(t + d);
    } catch { /* audio indispo */ }
  }
  const sfx = {
    guess: () => { tone(660, 0.12); tone(880, 0.16, 'sine', 0.07, 0.1); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.08, i * 0.09)),
    tick: () => tone(1100, 0.05, 'square', 0.025),
    turn: () => { tone(440, 0.12); tone(660, 0.2, 'sine', 0.07, 0.12); },
    close: () => tone(300, 0.18, 'sawtooth', 0.035),
    end: () => { tone(520, 0.15, 'triangle'); tone(390, 0.25, 'triangle', 0.07, 0.14); },
  };
  function renderMute() { $('#btn-mute').textContent = muted ? '🔇' : '🔊'; }
  $('#btn-mute').addEventListener('click', () => { muted = !muted; store.set('gb_muted', muted); renderMute(); });
  renderMute();

  // ---------- état local ----------
  let token = store.get('gb_token', null);
  if (typeof token !== 'string' || token.length < 16) { token = randToken(); store.set('gb_token', token); }
  const profile = store.get('gb_profile', { name: '', avatar: { e: Math.floor(Math.random() * AVATARS.length), c: Math.floor(Math.random() * AV_COLORS.length) } });

  const params = new URLSearchParams(location.search);
  let currentCode = (params.get('room') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || null;
  if (currentCode && !profile.name) { $('#join-code').value = currentCode; currentCode = null; }

  let S = null;            // dernier état reçu du serveur
  let ops = [];            // historique du dessin du tour en cours
  let lastTurnId = null;
  let lastState = null;
  let deadline = 0;
  let lastSecond = null;
  let tool = 'pen';
  let color = '#000000';
  let size = 10;
  let strokeN = 0;
  let drawing = false;
  let lastPt = null;
  let strokeId = null;

  const socket = io({ transports: ['websocket', 'polling'] });

  // ---------- écrans ----------
  function showScreen(name) {
    for (const s of ['home', 'lobby', 'game']) $(`#screen-${s}`).hidden = s !== name;
    const slot = name === 'lobby' ? $('#lobby-chat-slot') : name === 'game' ? $('#game-chat-slot') : null;
    const chat = $('#chat');
    if (slot && chat.parentElement !== slot) slot.append(chat);
    chat.hidden = !slot;
  }

  // ---------- accueil ----------
  function renderAvatarPicker() {
    const prev = $('#av-preview');
    prev.textContent = AVATARS[profile.avatar.e];
    prev.style.setProperty('--av', AV_COLORS[profile.avatar.c]);
    const sw = $('#av-colors');
    sw.replaceChildren(...AV_COLORS.map((c, i) => {
      const b = el('button', 'swatch');
      b.type = 'button';
      b.style.background = c;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(i === profile.avatar.c));
      b.setAttribute('aria-label', `Couleur ${i + 1}`);
      b.addEventListener('click', () => { profile.avatar.c = i; saveProfile(); renderAvatarPicker(); });
      return b;
    }));
    document.querySelectorAll('.av-opt').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.i) === profile.avatar.e)));
  }
  function saveProfile() { store.set('gb_profile', profile); }
  $('#av-grid').replaceChildren(...AVATARS.map((emo, i) => {
    const b = el('button', 'av-opt', emo);
    b.type = 'button';
    b.dataset.i = i;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', `Avatar ${emo}`);
    b.addEventListener('click', () => { profile.avatar.e = i; saveProfile(); renderAvatarPicker(); });
    return b;
  }));
  $('#name').value = profile.name || '';
  $('#name').addEventListener('input', (e) => { profile.name = e.target.value.trim(); saveProfile(); });
  $('#join-code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); });

  function homeError(msg) { $('#home-error').textContent = msg || ''; }

  function enter(kind) {
    const name = $('#name').value.trim();
    if (!name) { homeError('Choisis un pseudo 🙂'); $('#name').focus(); return; }
    const code = $('#join-code').value.trim();
    if (kind === 'join' && code.length !== 4) { homeError('Le code fait 4 lettres.'); return; }
    profile.name = name;
    saveProfile();
    homeError('');
    joinRoom(kind, code);
  }

  function joinRoom(kind, code, silent) {
    const payload = { name: profile.name, avatar: profile.avatar, token, code };
    socket.emit(kind === 'create' ? 'room:create' : 'room:join', payload, (res) => {
      if (!res || res.error) {
        currentCode = null;
        if (!silent || !S) { S = null; showScreen('home'); }
        homeError(res?.error || 'Erreur de connexion.');
        window.history.replaceState(null, '', location.pathname);
        return;
      }
      if (res.token && res.token !== token) { token = res.token; store.set('gb_token', token); }
      currentCode = res.code;
      window.history.replaceState(null, '', `?room=${res.code}`);
    });
  }

  $('#btn-create').addEventListener('click', () => enter('create'));
  $('#join-form').addEventListener('submit', (e) => { e.preventDefault(); enter('join'); });
  $('#name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') enter($('#join-code').value.length === 4 ? 'join' : 'create');
  });

  async function loadHof() {
    const box = $('#hof');
    try {
      const r = await fetch('/api/leaderboard');
      const data = await r.json();
      if (!data.available) { box.replaceChildren(el('p', 'muted', 'Classement indisponible pour le moment.')); return; }
      if (!data.wins.length) { box.replaceChildren(el('p', 'muted', 'Aucune partie terminée. Sois le premier !')); return; }
      const medals = ['🥇', '🥈', '🥉'];
      const rows = data.wins.map((w, i) => {
        const row = el('div', 'hof-row');
        row.append(el('span', 'rank', medals[i] ?? String(i + 1)), el('span', 'n', w.name), el('span', 'muted', `${w.score} victoire${w.score > 1 ? 's' : ''}`));
        return row;
      });
      box.replaceChildren(...rows, el('p', 'muted small', `${data.games} partie${data.games > 1 ? 's' : ''} jouée${data.games > 1 ? 's' : ''} au total`));
    } catch {
      box.replaceChildren(el('p', 'muted', 'Classement indisponible.'));
    }
  }

  // ---------- salon ----------
  const opt = (sel, values, fmt) => {
    $(sel).replaceChildren(...values.map((v) => { const o = el('option', null, fmt(v)); o.value = v; return o; }));
  };
  opt('#set-rounds', [1, 2, 3, 4, 5, 6, 8, 10], (v) => `${v}`);
  opt('#set-time', [30, 45, 60, 80, 100, 120, 150, 180], (v) => `${v} s`);
  opt('#set-max', [2, 3, 4, 5, 6, 8, 10, 12, 16], (v) => `${v}`);

  const sendSettings = (patch) => socket.emit('room:settings', patch);
  $('#set-rounds').addEventListener('change', (e) => sendSettings({ rounds: Number(e.target.value) }));
  $('#set-time').addEventListener('change', (e) => sendSettings({ drawTime: Number(e.target.value) }));
  $('#set-max').addEventListener('change', (e) => sendSettings({ maxPlayers: Number(e.target.value) }));
  $('#set-hints').addEventListener('change', (e) => sendSettings({ hints: e.target.checked }));
  $('#set-custom-only').addEventListener('change', (e) => sendSettings({ customOnly: e.target.checked }));
  $('#set-words').addEventListener('change', (e) => sendSettings({ customWords: e.target.value }));

  $('#btn-start').addEventListener('click', () => {
    socket.emit('game:start', null, (res) => { if (res?.error) toast(res.error); });
  });
  $('#btn-copy').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}?room=${S?.code}`;
    try { await navigator.clipboard.writeText(url); toast('Lien copié ! Envoie-le à tes potes 🚀'); } catch { toast(url, 6000); }
  });
  function leave() {
    socket.emit('room:leave');
    S = null;
    currentCode = null;
    lastTurnId = null;
    window.history.replaceState(null, '', location.pathname);
    $('#chat-log').replaceChildren();
    showScreen('home');
    loadHof();
  }
  $('#btn-leave').addEventListener('click', leave);
  $('#btn-leave-game').addEventListener('click', () => { if (confirm('Quitter la partie ?')) leave(); });

  // Changer de pseudo / d'avatar depuis le salon
  function updateProfile(patch, okMsg) {
    socket.emit('player:update', patch, (res) => {
      if (res?.error) { toast(res.error); return; }
      if (patch.name) { profile.name = res.name; $('#name').value = res.name; }
      if (patch.avatar) profile.avatar = patch.avatar;
      saveProfile();
      if (okMsg) toast(okMsg);
    });
  }
  $('#rename-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#me-name').value.trim();
    if (!name) { toast('Le pseudo ne peut pas être vide.'); return; }
    if (name === meP()?.name) return;
    updateProfile({ name }, `C'est noté, tu t'appelles ${name} !`);
    $('#me-name').blur();
  });
  $('#me-avatar').addEventListener('click', () => {
    const cur = meP()?.avatar ?? profile.avatar;
    const next = { e: (cur.e + 1) % AVATARS.length, c: (cur.c + (cur.e + 1 === AVATARS.length ? 1 : 0)) % AV_COLORS.length };
    updateProfile({ avatar: next });
  });
  $('#me-avatar').addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const cur = meP()?.avatar ?? profile.avatar;
    updateProfile({ avatar: { e: cur.e, c: (cur.c + 1) % AV_COLORS.length } });
  });

  function setSelect(sel, v) {
    const s = $(sel);
    if (![...s.options].some((o) => Number(o.value) === v)) { const o = el('option', null, String(v)); o.value = v; s.append(o); }
    s.value = String(v);
  }

  function renderLobby() {
    const isHost = S.me === S.hostId;
    $('#lobby-code').textContent = S.code;
    const online = S.players.filter((p) => p.connected);
    $('#lobby-count').textContent = `${online.length}/${S.settings.maxPlayers}`;
    const showScores = S.players.some((p) => p.score > 0);
    const list = [...S.players].sort((a, b) => (showScores ? b.score - a.score : 0));
    $('#lobby-players').replaceChildren(...list.map((p) => {
      const li = el('li', [p.id === S.me && 'me', !p.connected && 'off'].filter(Boolean).join(' '));
      const n = el('span', 'n', p.name + (p.id === S.me ? ' (toi)' : ''));
      li.append(avatarEl(p.avatar), n);
      if (showScores) li.append(el('span', 'pts', `${p.score} pts`));
      if (p.id === S.hostId) li.append(el('span', null, '👑'));
      if (isHost && p.id !== S.me) {
        const k = el('button', 'kick', '✕');
        k.type = 'button';
        k.title = `Exclure ${p.name}`;
        k.addEventListener('click', () => { if (confirm(`Exclure ${p.name} ?`)) socket.emit('room:kick', p.id); });
        li.append(k);
      }
      return li;
    }));

    const mine = meP();
    if (mine) {
      if (document.activeElement !== $('#me-name')) $('#me-name').value = mine.name;
      const ma = $('#me-avatar');
      ma.textContent = AVATARS[mine.avatar.e];
      ma.style.setProperty('--av', AV_COLORS[mine.avatar.c]);
    }

    const st = S.settings;
    for (const id of ['#set-rounds', '#set-time', '#set-max', '#set-hints', '#set-custom-only', '#set-words']) $(id).disabled = !isHost;
    setSelect('#set-rounds', st.rounds);
    setSelect('#set-time', st.drawTime);
    setSelect('#set-max', st.maxPlayers);
    $('#set-hints').checked = st.hints;
    $('#set-custom-only').checked = st.customOnly;
    const ta = $('#set-words');
    if (isHost) {
      if (document.activeElement !== ta) ta.value = (st.customWords || []).join(', ');
      ta.placeholder = 'le prof de réseau, câble RJ45, la cafèt…';
    } else {
      ta.value = '';
      ta.placeholder = st.customCount ? `${st.customCount} mot${st.customCount > 1 ? 's' : ''} perso ajouté${st.customCount > 1 ? 's' : ''} par l'hôte (secret 🤫)` : 'Aucun mot perso';
    }
    const start = $('#btn-start');
    start.hidden = !isHost;
    start.disabled = online.length < 2;
    const host = S.players.find((p) => p.id === S.hostId);
    $('#settings-note').textContent = isHost
      ? (online.length < 2 ? 'Il faut au moins 2 joueurs. Partage le code ou le lien !' : 'Tout le monde est là ? Lance la partie !')
      : `En attente de ${host?.name ?? 'l\'hôte'} pour lancer la partie…`;
  }

  // ---------- jeu ----------
  const isDrawer = () => S && S.drawerId === S.me;
  const canDraw = () => S && S.state === 'drawing' && isDrawer();
  const meP = () => S?.players.find((p) => p.id === S.me);

  function renderHint() {
    const box = $('#g-hint');
    const label = $('#g-hint-label');
    box.replaceChildren();
    if (S.state === 'choosing') {
      label.textContent = '';
      box.append(el('span', 'muted', isDrawer() ? 'Choisis ton mot !' : 'Choix du mot…'));
      return;
    }
    if (S.state !== 'drawing' && S.state !== 'turnEnd') { label.textContent = ''; return; }
    if (S.word) {
      label.textContent = isDrawer() ? 'Ton mot à dessiner' : S.state === 'turnEnd' ? 'Le mot était' : 'Tu as trouvé';
      box.append(el('span', 'word', S.word));
      return;
    }
    label.textContent = 'Devine le mot';
    let letters = 0;
    for (const ch of S.hint) {
      if (ch === ' ') { box.append(el('span', 'gap')); continue; }
      if (ch === '_') { box.append(el('span', 'ch blank', ' ')); letters++; continue; }
      if (/[\p{L}\p{N}]/u.test(ch)) letters++;
      box.append(el('span', 'ch', ch));
    }
    box.append(el('span', 'count', `(${letters})`));
  }

  function renderPlayers() {
    const ranked = [...S.players].sort((a, b) => b.score - a.score);
    $('#g-players').replaceChildren(...ranked.map((p, i) => {
      const cls = [p.id === S.me && 'me', p.guessed && 'guessed', p.id === S.drawerId && 'drawing', !p.connected && 'off'].filter(Boolean).join(' ');
      const li = el('li', cls);
      const info = el('div', 'info');
      info.append(el('div', 'n', p.name + (p.id === S.me ? ' (toi)' : '')), el('div', 's', `${p.score} pts`));
      li.append(el('span', 'rank', `#${i + 1}`), avatarEl(p.avatar), info);
      if (p.id === S.drawerId) li.append(el('span', 'badge', '✏️'));
      else if (p.guessed) li.append(el('span', 'badge', '✅'));
      if (p.id === S.hostId) li.append(el('span', 'badge', '👑'));
      if (p.lastGain > 0 && (S.state === 'drawing' || S.state === 'turnEnd')) li.append(el('span', 'gain', `+${p.lastGain}`));
      return li;
    }));
  }

  function renderOverlay() {
    const ov = $('#overlay');
    const drawer = S.players.find((p) => p.id === S.drawerId);
    ov.replaceChildren();
    if (S.state === 'choosing') {
      if (isDrawer() && S.choices) {
        const box = el('div', 'choices');
        S.choices.forEach((w, i) => {
          const b = el('button', 'btn', w);
          b.type = 'button';
          b.addEventListener('click', () => socket.emit('word:choose', i));
          box.append(b);
        });
        ov.append(el('h3', null, 'À toi de dessiner ! Choisis un mot'), box);
      } else {
        ov.append(avatarEl(drawer?.avatar, true), el('h3', null, `${drawer?.name ?? '…'} choisit un mot…`));
      }
      ov.hidden = false;
    } else if (S.state === 'turnEnd') {
      ov.append(el('div', null, S.word ? 'Le mot était' : 'Tour terminé'));
      if (S.word) ov.append(el('div', 'big-word', S.word));
      const gains = el('ul', 'gains');
      [...S.players].sort((a, b) => b.lastGain - a.lastGain).forEach((p) => {
        const li = el('li');
        li.append(el('span', null, `${AVATARS[p.avatar.e]} ${p.name}`), el('span', p.lastGain > 0 ? 'plus' : 'zero', p.lastGain > 0 ? `+${p.lastGain}` : '+0'));
        gains.append(li);
      });
      ov.append(gains);
      ov.hidden = false;
    } else if (S.state === 'gameOver' && S.podium) {
      ov.append(el('h3', null, '🏆 Fin de la partie !'));
      const pod = el('div', 'podium');
      const order = [1, 0, 2];
      for (const idx of order) {
        const p = S.podium[idx];
        if (!p) continue;
        const step = el('div', `step p${idx + 1}`);
        step.append(avatarEl(p.avatar, idx === 0), el('div', 'pname', p.name), el('div', 'pscore', `${p.score} pts`), el('div', 'block', String(idx + 1)));
        pod.append(step);
      }
      ov.append(pod);
      if (S.podium.length > 3) {
        ov.append(el('div', 'muted', S.podium.slice(3).map((p, i) => `${i + 4}. ${p.name} (${p.score})`).join('   ')));
      }
      ov.append(el('div', 'muted small', 'Retour au salon dans quelques secondes…'));
      ov.hidden = false;
    } else {
      ov.hidden = true;
    }
  }

  function renderReactions() {
    if (!S) return;
    $('#r-up-n').textContent = S.reactions?.up ?? 0;
    $('#r-down-n').textContent = S.reactions?.down ?? 0;
    $('#r-up').classList.toggle('on', S.myReaction > 0);
    $('#r-down').classList.toggle('on', S.myReaction < 0);
  }

  function renderGame() {
    $('#g-round').textContent = S.round ? `Manche ${Math.min(S.round, S.settings.rounds)} / ${S.settings.rounds}` : '';
    renderHint();
    renderPlayers();
    renderOverlay();
    const drawingNow = canDraw();
    $('#toolbar').hidden = !drawingNow;
    $('#react').hidden = !(S.state === 'drawing');
    $('#r-up').disabled = $('#r-down').disabled = isDrawer();
    renderReactions();
    canvas.classList.toggle('can-draw', drawingNow && tool !== 'fill');
    canvas.classList.toggle('can-fill', drawingNow && tool === 'fill');
    const me = meP();
    $('#chat-input').placeholder = S.state === 'drawing'
      ? (isDrawer() || me?.guessed ? '🤫 Message secret (seuls ceux qui ont trouvé le voient)' : 'Tape ta réponse…')
      : 'Écris un message…';
  }

  function render() {
    if (!S) { showScreen('home'); return; }
    if (S.turnId !== lastTurnId) {
      lastTurnId = S.turnId;
      ops = [];
      redraw();
      if (S.state === 'choosing' && isDrawer()) sfx.turn();
    }
    if (lastState !== S.state) {
      if (S.state === 'turnEnd') sfx.end();
      if (S.state === 'gameOver') sfx.win();
      lastState = S.state;
    }
    deadline = Date.now() + S.timeLeft;
    if (S.state === 'lobby') { showScreen('lobby'); renderLobby(); } else { showScreen('game'); renderGame(); }
  }

  // ---------- chrono ----------
  setInterval(() => {
    if (!S || S.state === 'lobby') return;
    const secs = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    const t = $('#g-timer');
    t.textContent = String(secs);
    const urgent = S.state === 'drawing' && secs <= 10;
    t.classList.toggle('urgent', urgent);
    if (urgent && secs !== lastSecond && secs > 0) sfx.tick();
    lastSecond = secs;
  }, 200);

  // ---------- canvas ----------
  const canvas = $('#canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  function wipe() { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); }
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

  function applyOp(op) {
    if (op.t === 'l') {
      const [x0, y0, x1, y1] = op.p;
      if (x0 === x1 && y0 === y1) {
        ctx.fillStyle = op.c;
        ctx.beginPath();
        ctx.arc(x0, y0, op.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = op.c;
        ctx.lineWidth = op.w;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
    } else if (op.t === 'f') {
      floodFill(Math.floor(op.p[0]), Math.floor(op.p[1]), op.c);
    } else if (op.t === 'c') {
      wipe();
    }
  }
  function redraw() { wipe(); for (const op of ops) applyOp(op); }

  // Remplissage "pot de peinture" par balayage de lignes
  function floodFill(x, y, hex) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    const [r, g, b] = hexToRgb(hex);
    const i0 = (y * W + x) * 4;
    const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2];
    if (Math.abs(tr - r) < 6 && Math.abs(tg - g) < 6 && Math.abs(tb - b) < 6) return;
    const TOL = 70;
    const match = (i) => Math.abs(d[i] - tr) <= TOL && Math.abs(d[i + 1] - tg) <= TOL && Math.abs(d[i + 2] - tb) <= TOL;
    const seen = new Uint8Array(W * H);
    const stack = [[x, y]];
    while (stack.length) {
      let [cx, cy] = stack.pop();
      let p = cy * W + cx;
      while (cx >= 0 && !seen[p] && match(p * 4)) { cx--; p--; }
      cx++; p++;
      let up = false;
      let down = false;
      while (cx < W && !seen[p] && match(p * 4)) {
        seen[p] = 1;
        const i = p * 4;
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
        if (cy > 0) {
          const q = p - W;
          if (!seen[q] && match(q * 4)) { if (!up) { stack.push([cx, cy - 1]); up = true; } } else up = false;
        }
        if (cy < H - 1) {
          const q = p + W;
          if (!seen[q] && match(q * 4)) { if (!down) { stack.push([cx, cy + 1]); down = true; } } else down = false;
        }
        cx++; p++;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    const x = Math.min(W, Math.max(0, ((e.clientX - r.left) * W) / r.width));
    const y = Math.min(H, Math.max(0, ((e.clientY - r.top) * H) / r.height));
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  }
  const newSid = () => `${S.me}-${++strokeN}`;
  const curColor = () => (tool === 'eraser' ? '#ffffff' : color);
  function send(op) { ops.push(op); applyOp(op); socket.emit('draw', op); }

  canvas.addEventListener('pointerdown', (e) => {
    if (!canDraw() || e.button > 0) return;
    e.preventDefault();
    const [x, y] = toCanvas(e);
    if (tool === 'fill') { send({ t: 'f', s: newSid(), c: color, p: [Math.floor(x), Math.floor(y)] }); return; }
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    strokeId = newSid();
    lastPt = [x, y];
    send({ t: 'l', s: strokeId, c: curColor(), w: tool === 'eraser' ? Math.max(size, 20) : size, p: [x, y, x, y] });
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing || !canDraw()) return;
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of events.length ? events : [e]) {
      const [x, y] = toCanvas(ev);
      if (Math.hypot(x - lastPt[0], y - lastPt[1]) < 2) continue;
      send({ t: 'l', s: strokeId, c: curColor(), w: tool === 'eraser' ? Math.max(size, 20) : size, p: [lastPt[0], lastPt[1], x, y] });
      lastPt = [x, y];
    }
  });
  const stop = () => { drawing = false; lastPt = null; };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);

  // ---------- barre d'outils ----------
  $('#palette').replaceChildren(...PALETTE.map((c) => {
    const b = el('button', 'color');
    b.type = 'button';
    b.style.background = c;
    b.dataset.color = c;
    b.setAttribute('aria-label', `Couleur ${c}`);
    b.addEventListener('click', () => { color = c; if (tool === 'eraser') tool = 'pen'; renderTools(); });
    return b;
  }));
  $('#sizes').replaceChildren(...SIZES.map((s) => {
    const b = el('button', 'size');
    b.type = 'button';
    b.dataset.size = s;
    b.setAttribute('aria-label', `Taille ${s}`);
    const dot = el('i');
    const px = Math.max(4, Math.min(26, s * 0.6));
    dot.style.width = dot.style.height = `${px}px`;
    b.append(dot);
    b.addEventListener('click', () => { size = s; renderTools(); });
    return b;
  }));
  document.querySelectorAll('.tool[data-tool]').forEach((b) => b.addEventListener('click', () => { tool = b.dataset.tool; renderTools(); }));
  $('#t-undo').addEventListener('click', () => socket.emit('draw:undo'));
  $('#t-clear').addEventListener('click', () => { if (canDraw()) send({ t: 'c', s: newSid() }); });
  function renderTools() {
    document.querySelectorAll('.color').forEach((b) => b.classList.toggle('active', b.dataset.color === color && tool !== 'eraser'));
    document.querySelectorAll('.size').forEach((b) => b.classList.toggle('active', Number(b.dataset.size) === size));
    document.querySelectorAll('.tool[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === tool));
    if (S && S.state !== 'lobby') {
      canvas.classList.toggle('can-draw', canDraw() && tool !== 'fill');
      canvas.classList.toggle('can-fill', canDraw() && tool === 'fill');
    }
  }
  renderTools();

  document.addEventListener('keydown', (e) => {
    if (!canDraw()) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); socket.emit('draw:undo'); return; }
    if (document.activeElement === $('#chat-input')) return;
    const k = e.key.toLowerCase();
    if (k === 'b') tool = 'pen';
    else if (k === 'f') tool = 'fill';
    else if (k === 'e') tool = 'eraser';
    else return;
    renderTools();
  });

  // ---------- réactions ----------
  $('#r-up').addEventListener('click', () => socket.emit('react', 1));
  $('#r-down').addEventListener('click', () => socket.emit('react', -1));

  // ---------- chat ----------
  function addChat(m) {
    const log = $('#chat-log');
    const line = el('div', `msg ${m.kind || 'chat'}`);
    if (m.from) {
      line.append(el('span', 'who', `${AVATARS[m.from.avatar?.e] ?? ''} ${m.from.name}`), document.createTextNode(m.text));
    } else {
      line.textContent = m.text;
    }
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
    log.append(line);
    while (log.children.length > 250) log.firstChild.remove();
    if (atBottom) log.scrollTop = log.scrollHeight;
    if (m.kind === 'success-me') sfx.win();
    if (m.kind === 'close') sfx.close();
  }
  $('#chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#chat-input');
    const text = input.value.trim();
    if (!text) return;
    socket.emit('chat', text);
    input.value = '';
  });

  // ---------- réseau ----------
  socket.on('connect', () => {
    if (currentCode && profile.name) joinRoom('join', currentCode, true);
  });
  socket.on('disconnect', () => { if (S) toast('Connexion perdue, reconnexion…', 4000); });
  socket.on('state', (st) => { S = st; currentCode = st.code; render(); });
  socket.on('history', (h) => { ops = Array.isArray(h) ? h : []; redraw(); });
  socket.on('draw', (op) => { ops.push(op); applyOp(op); });
  socket.on('undo', ({ s }) => {
    while (ops.length && ops[ops.length - 1].s === s) ops.pop();
    redraw();
  });
  socket.on('chat', addChat);
  socket.on('sfx', (k) => { if (k === 'guess') sfx.guess(); });
  socket.on('reactions', (r) => { if (S) { S.reactions = r; renderReactions(); } });
  socket.on('kicked', () => {
    S = null;
    currentCode = null;
    window.history.replaceState(null, '', location.pathname);
    showScreen('home');
    homeError('Tu as été exclu de la partie.');
  });

  // ---------- démarrage ----------
  renderAvatarPicker();
  showScreen('home');
  wipe();
  loadHof();
  if (!currentCode) ($('#join-code').value ? $('#name') : $('#name')).focus();
})();
