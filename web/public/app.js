// Gribouille · client
// Écrans : accueil → salon → jeu. Tout l'état vient du serveur via l'événement "state".
(() => {
  'use strict';

  const AV = window.GribAvatar;
  const IC = window.GribIcons;

  // ---------- constantes ----------
  const PALETTE = ['#1C1F1E', '#59605C', '#B8BDB9', '#FFFFFF', '#E5484D', '#F2665A', '#FF9F43', '#F5C431',
    '#3DBE7A', '#2EC4B6', '#4C8DF6', '#1F4FA8', '#8E6CF0', '#F28AB2', '#8D5524', '#F1D3A8'];
  const SIZES = [4, 10, 20, 40];
  const W = 800;
  const H = 600;
  const CHAT_ICONS = { success: 'check', 'success-me': 'check', close: 'flame', secret: 'lock', win: 'trophy', turn: 'pencil', join: 'user', leave: 'exit', reveal: 'eye' };

  // ---------- helpers ----------
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const iconEl = (name, cls = '') => {
    const s = el('span', cls);
    s.innerHTML = IC.svg(name); // icône prédéfinie, aucune donnée joueur
    return s;
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
  };
  const randToken = () => {
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  };
  function avatarEl(av, size) {
    const a = el('div', `avatar ${size || ''}`.trim());
    a.innerHTML = AV.svg(av); // SVG construit uniquement à partir de pièces prédéfinies
    return a;
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let toastTimer = null;
  function toast(text, { error = false, ms = 2400 } = {}) {
    const t = $('#toast');
    t.replaceChildren(iconEl(error ? 'close' : 'check'), el('span', null, text));
    t.classList.toggle('err', error);
    t.hidden = false;
    t.style.animation = 'none';
    void t.offsetWidth;
    t.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  // ---------- sons (synthétisés, aucun fichier) ----------
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
    } catch { /* audio indisponible */ }
  }
  const sfx = {
    guess: () => { tone(660, 0.12); tone(880, 0.16, 'sine', 0.07, 0.1); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.08, i * 0.09)),
    tick: () => tone(1100, 0.05, 'square', 0.025),
    turn: () => { tone(440, 0.12); tone(660, 0.2, 'sine', 0.07, 0.12); },
    close: () => tone(300, 0.18, 'sawtooth', 0.035),
    end: () => { tone(520, 0.15, 'triangle'); tone(390, 0.25, 'triangle', 0.07, 0.14); },
    pop: () => tone(740, 0.06, 'triangle', 0.05),
  };
  function renderMute() {
    const b = $('#btn-mute');
    b.innerHTML = IC.svg(muted ? 'soundOff' : 'soundOn');
    b.setAttribute('aria-label', muted ? 'Activer le son' : 'Couper le son');
  }
  $('#btn-mute').addEventListener('click', () => { muted = !muted; store.set('gb_muted', muted); renderMute(); });

  // ---------- état local ----------
  let token = store.get('gb_token', null);
  if (typeof token !== 'string' || token.length < 16) { token = randToken(); store.set('gb_token', token); }
  const profile = store.get('gb_profile', { name: '', avatar: AV.random() });
  profile.avatar = AV.normalize(profile.avatar);

  const params = new URLSearchParams(location.search);
  let currentCode = (params.get('room') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || null;
  if (currentCode && !profile.name) { $('#join-code').value = currentCode; currentCode = null; }

  let S = null;              // dernier état reçu du serveur
  let ops = [];              // historique du dessin du tour en cours
  let lastTurnId = null;
  let lastState = null;
  let lastHint = '';
  let deadline = 0;
  let turnTotal = 1;
  let lastSecond = null;
  let tool = 'pen';
  let color = '#1C1F1E';
  let size = 10;
  let strokeN = 0;
  let drawing = false;
  let lastPt = null;
  let strokeId = null;
  let currentScreen = null;
  const shownScores = new Map();   // pour animer les scores
  const knownGuessed = new Set();  // pour faire clignoter ceux qui viennent de trouver
  let gallery = [];
  let bestDrawing = null;          // meilleur dessin de la dernière partie
  let hideWord = store.get('gb_hideword', false);               // dessins de la partie (en mémoire, pour la session)

  const socket = io({ transports: ['websocket', 'polling'] });

  // ---------- écrans ----------
  function showScreen(name) {
    for (const s of ['home', 'lobby', 'game']) $(`#screen-${s}`).hidden = s !== name;
    if (currentScreen !== name) {
      const sc = $(`#screen-${name}`);
      sc.classList.remove('enter');
      void sc.offsetWidth;
      sc.classList.add('enter');
      currentScreen = name;
    }
    const slot = name === 'lobby' ? $('#lobby-chat-slot') : name === 'game' ? $('#game-chat-slot') : null;
    const chat = $('#chat');
    if (slot && chat.parentElement !== slot) {
      slot.append(chat);
      const log = $('#chat-log');
      log.scrollTop = log.scrollHeight;
    }
    chat.hidden = !slot;
  }

  // ---------- éditeur de perso ----------
  // Monte un éditeur dans `root`. get() renvoie l'avatar courant, set(av) l'applique.
  function skinEditor(root, get, set) {
    const preview = el('div', 'skin-preview');
    const controls = el('div', 'skin-controls');
    const parts = [['e', 'Yeux'], ['m', 'Bouche'], ['a', 'Accessoire']];
    const labels = {};
    const wiggle = () => {
      if (reduceMotion) return;
      preview.classList.remove('wiggle');
      void preview.offsetWidth;
      preview.classList.add('wiggle');
    };
    const change = (k, delta) => {
      const av = { ...get() };
      av[k] = (av[k] + delta + AV.LIMITS[k]) % AV.LIMITS[k];
      set(av);
      refresh();
      wiggle();
    };
    for (const [k, label] of parts) {
      const row = el('div', 'skin-row');
      const prev = el('button', 'arrow');
      const next = el('button', 'arrow');
      prev.innerHTML = IC.svg('undo').replace('M9 6.5L4.5 11 9 15.5M4.5 11H15a4.5 4.5 0 0 1 0 9h-3', 'M14.5 6l-6 6 6 6');
      next.innerHTML = IC.svg('undo').replace('M9 6.5L4.5 11 9 15.5M4.5 11H15a4.5 4.5 0 0 1 0 9h-3', 'M9.5 6l6 6-6 6');
      prev.type = next.type = 'button';
      prev.setAttribute('aria-label', `${label} précédent`);
      next.setAttribute('aria-label', `${label} suivant`);
      prev.addEventListener('click', () => change(k, -1));
      next.addEventListener('click', () => change(k, 1));
      labels[k] = el('span', 'part-name');
      const mid = el('div', 'part');
      mid.append(el('span', 'part-label', label), labels[k]);
      row.append(prev, mid, next);
      controls.append(row);
    }
    const swatchRow = (k, label, colors) => {
      const row = el('div', 'skin-swatches');
      row.append(el('span', 'part-label', label));
      const box = el('div', 'swatches');
      box.setAttribute('role', 'radiogroup');
      box.setAttribute('aria-label', label);
      colors.forEach((c, i) => {
        const b = el('button', 'swatch');
        b.type = 'button';
        b.style.background = c;
        b.dataset.k = k;
        b.dataset.i = i;
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-label', `${label} ${i + 1}`);
        b.addEventListener('click', () => { set({ ...get(), [k]: i }); refresh(); });
        box.append(b);
      });
      row.append(box);
      controls.append(row);
    };
    swatchRow('s', 'Peau', AV.SKINS);
    swatchRow('h', 'Sweat', AV.HOODIES);
    const dice = el('button', 'btn btn-soft btn-sm dice');
    dice.type = 'button';
    dice.append(iconEl('dice'), el('span', null, 'Au hasard'));
    dice.addEventListener('click', () => { set(AV.random()); refresh(); wiggle(); sfx.pop(); });
    controls.append(dice);
    root.replaceChildren(preview, controls);
    function refresh() {
      const av = AV.normalize(get());
      preview.innerHTML = AV.svg(av);
      for (const [k] of parts) labels[k].textContent = AV.NAMES[k][av[k]];
      root.querySelectorAll('.swatch').forEach((b) => b.setAttribute('aria-checked', String(av[b.dataset.k] === Number(b.dataset.i))));
    }
    refresh();
    return { refresh };
  }

  // ---------- accueil ----------
  function saveProfile() { store.set('gb_profile', profile); }
  skinEditor($('#home-editor'), () => profile.avatar, (av) => { profile.avatar = av; saveProfile(); });
  $('#name').value = profile.name || '';
  $('#name').addEventListener('input', (e) => { profile.name = e.target.value.trim(); saveProfile(); });
  $('#join-code').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); });

  function homeError(msg) { $('#home-error').textContent = msg || ''; }

  function enter(kind) {
    const name = $('#name').value.trim();
    if (!name) { homeError('Choisis un pseudo pour commencer.'); $('#name').focus(); return; }
    const code = $('#join-code').value.trim();
    if (kind === 'join' && code.length !== 4) { homeError('Le code fait 4 lettres.'); $('#join-code').focus(); return; }
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
        homeError(res?.error || 'Connexion impossible, réessaie.');
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
      if (!data.wins.length) { box.replaceChildren(el('p', 'muted', 'Aucune partie terminée. La première victoire est à prendre.')); return; }
      const rows = data.wins.slice(0, 5).map((w, i) => {
        const row = el('div', 'hof-row');
        row.append(el('span', 'rank', String(i + 1)), el('span', 'n', w.name), el('span', 'w', `${w.score} victoire${w.score > 1 ? 's' : ''}`));
        return row;
      });
      box.replaceChildren(...rows, el('p', 'muted', `${data.games} partie${data.games > 1 ? 's' : ''} jouée${data.games > 1 ? 's' : ''} sur ce serveur`));
    } catch {
      box.replaceChildren(el('p', 'muted', 'Classement indisponible pour le moment.'));
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
  $('#set-preset').addEventListener('change', (e) => { if (e.target.value !== 'perso') sendSettings({ preset: e.target.value }); });
  // Thèmes cochables : on envoie la liste complète des thèmes cochés
  $('#set-packs').addEventListener('change', () => {
    const packs = [...document.querySelectorAll('#set-packs input:checked')].map((i) => i.value);
    if (!packs.length) { toast('Garde au moins un thème coché.', { error: true }); render(); return; }
    sendSettings({ packs });
  });
  $('#set-rounds').addEventListener('change', (e) => sendSettings({ rounds: Number(e.target.value) }));
  $('#set-time').addEventListener('change', (e) => sendSettings({ drawTime: Number(e.target.value) }));
  $('#set-max').addEventListener('change', (e) => sendSettings({ maxPlayers: Number(e.target.value) }));
  $('#set-hints').addEventListener('change', (e) => sendSettings({ hints: e.target.checked }));
  $('#set-custom-only').addEventListener('change', (e) => sendSettings({ customOnly: e.target.checked }));
  $('#set-words').addEventListener('change', (e) => sendSettings({ customWords: e.target.value }));

  const startGame = () => socket.emit('game:start', null, (res) => { if (res?.error) toast(res.error, { error: true }); });
  $('#btn-start').addEventListener('click', startGame);
  $('#btn-copy').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}?room=${S?.code}`;
    try { await navigator.clipboard.writeText(url); toast('Lien copié, envoie-le à tes potes.'); } catch { toast(url, { ms: 6000 }); }
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

  function updateProfile(patch, okMsg) {
    socket.emit('player:update', patch, (res) => {
      if (res?.error) { toast(res.error, { error: true }); return; }
      if (patch.name) { profile.name = res.name; $('#name').value = res.name; }
      if (patch.avatar) profile.avatar = patch.avatar;
      saveProfile();
      if (okMsg) toast(okMsg);
    });
  }
  $('#rename-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#me-name').value.trim();
    if (!name) { toast('Le pseudo ne peut pas être vide.', { error: true }); return; }
    if (name === meP()?.name) return;
    updateProfile({ name }, `Pseudo changé : ${name}`);
    $('#me-name').blur();
  });

  // Éditeur de perso du salon (fenêtre)
  let draftSkin = AV.normalize(profile.avatar);
  const lobbyEditor = skinEditor($('#dialog-editor'), () => draftSkin, (av) => { draftSkin = av; });
  const openSkin = () => {
    draftSkin = AV.normalize(meP()?.avatar ?? profile.avatar);
    lobbyEditor.refresh();
    $('#skin-dialog').showModal();
  };
  $('#me-avatar').addEventListener('click', openSkin);
  $('#btn-skin').addEventListener('click', openSkin);
  $('#skin-save').addEventListener('click', () => {
    updateProfile({ avatar: draftSkin }, 'Perso mis à jour');
    $('#skin-dialog').close();
  });
  $('#skin-cancel').addEventListener('click', () => $('#skin-dialog').close());

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
    const ul = $('#lobby-players');
    const before = new Set([...ul.children].map((li) => li.dataset.id));
    ul.replaceChildren(...list.map((p) => {
      const li = el('li', [p.id === S.me && 'me', !p.connected && 'off'].filter(Boolean).join(' '));
      li.dataset.id = p.id;
      if (before.has(p.id)) li.style.animation = 'none';
      const n = el('span', 'n', p.name);
      if (p.id === S.me) n.append(el('span', 'you', ' (toi)'));
      li.append(avatarEl(p.avatar), n);
      if (showScores) li.append(el('span', 'pts', `${p.score} pts`));
      if (p.id === S.hostId) {
        const crown = iconEl('crown', 'host-badge');
        crown.title = 'Hôte de la partie';
        li.append(crown);
      }
      if (isHost && p.id !== S.me) {
        const k = el('button', 'kick');
        k.type = 'button';
        k.innerHTML = IC.svg('close');
        k.title = `Exclure ${p.name}`;
        k.setAttribute('aria-label', `Exclure ${p.name}`);
        k.addEventListener('click', () => { if (confirm(`Exclure ${p.name} ?`)) socket.emit('room:kick', p.id); });
        li.append(k);
      }
      return li;
    }));

    const mine = meP();
    if (mine) {
      if (document.activeElement !== $('#me-name')) $('#me-name').value = mine.name;
      $('#me-avatar').innerHTML = AV.svg(mine.avatar);
    }

    const st = S.settings;
    if (S.catalog) {
      const presetSel = $('#set-preset');
      if (presetSel.options.length !== S.catalog.presets.length + 1) {
        opt('#set-preset', [...S.catalog.presets.map((p) => p.id), 'perso'], (id) => (id === 'perso' ? 'Perso' : S.catalog.presets.find((p) => p.id === id).label));
        $('#set-packs').replaceChildren(...S.catalog.packs.map((pk) => {
          const lab = el('label', pk.adult ? 'pack adult' : 'pack');
          const box = el('input');
          box.type = 'checkbox';
          box.value = pk.id;
          const txt = el('span', 'pack-name', pk.label);
          lab.append(box, txt, el('span', 'pack-count', String(pk.count)));
          if (pk.adult) lab.append(el('span', 'pack-adult', '+18'));
          return lab;
        }));
      }
      presetSel.value = st.preset;
      const chosen = new Set(st.packs);
      let total = 0;
      document.querySelectorAll('#set-packs input').forEach((box) => {
        box.checked = chosen.has(box.value);
        box.closest('.pack').classList.toggle('on', box.checked);
        if (box.checked) total += S.catalog.packs.find((p) => p.id === box.value)?.count ?? 0;
      });
      $('#packs-count').textContent = `${total} mots, sans compter les vôtres`;
      const pr = S.catalog.presets.find((p) => p.id === st.preset);
      $('#preset-desc').textContent = pr ? pr.desc : 'Réglages personnalisés.';
    }
    document.querySelectorAll('#set-packs input').forEach((box) => { box.disabled = !isHost; });
    for (const id of ['#set-preset', '#set-rounds', '#set-time', '#set-max', '#set-hints', '#set-custom-only', '#set-words']) $(id).disabled = !isHost;
    setSelect('#set-rounds', st.rounds);
    setSelect('#set-time', st.drawTime);
    setSelect('#set-max', st.maxPlayers);
    $('#set-hints').checked = st.hints;
    $('#set-custom-only').checked = st.customOnly;
    const ta = $('#set-words');
    if (isHost) {
      if (document.activeElement !== ta) ta.value = (st.customWords || []).join(', ');
      ta.placeholder = 'le prof de réseau, câble RJ45, la cafèt';
    } else {
      ta.value = '';
      ta.placeholder = st.customCount ? `${st.customCount} mot${st.customCount > 1 ? 's' : ''} ajouté${st.customCount > 1 ? 's' : ''} par l'hôte, gardés secrets` : 'Aucun mot ajouté';
    }
    const start = $('#btn-start');
    start.hidden = !isHost;
    start.disabled = online.length < 2;
    const host = S.players.find((p) => p.id === S.hostId);
    $('#settings-note').textContent = isHost
      ? (online.length < 2 ? 'Il faut au moins 2 joueurs. Partage le code ou le lien.' : 'Tout le monde est là ? Lance la partie.')
      : `En attente de ${host?.name ?? 'l\'hôte'} pour lancer la partie.`;
    renderGallery();
  }

  // ---------- galerie ----------
  function hasInk() {
    for (let i = 0; i < buf.length; i += 16) if (buf[i] < 250 || buf[i + 1] < 250 || buf[i + 2] < 250) return true;
    return false;
  }
  function captureTurn() {
    if (!S || !hasInk()) return;
    const drawer = S.players.find((p) => p.id === S.drawerId);
    // miniature 240x180 : moyenne de chaque bloc de pixels de la mémoire du dessin
    const TW = 240;
    const TH = 180;
    const thumb = new ImageData(TW, TH);
    const t = thumb.data;
    const sx = W / TW;
    const sy = H / TH;
    for (let y = 0; y < TH; y++) {
      for (let x = 0; x < TW; x++) {
        let r = 0, g = 0, b = 0, n = 0;
        const xa = Math.floor(x * sx), xb = Math.floor((x + 1) * sx);
        const ya = Math.floor(y * sy), yb = Math.floor((y + 1) * sy);
        for (let yy = ya; yy < yb; yy++) {
          for (let xx = xa; xx < xb; xx++) {
            const i = (yy * W + xx) * 4;
            r += buf[i]; g += buf[i + 1]; b += buf[i + 2]; n++;
          }
        }
        const o = (y * TW + x) * 4;
        t[o] = r / n; t[o + 1] = g / n; t[o + 2] = b / n; t[o + 3] = 255;
      }
    }
    gallery.push({ word: S.word, by: drawer?.name ?? '', av: drawer?.avatar, pix: thumb });
    gallery = gallery.slice(-24);
  }
  function thumbCanvas(g) {
    const c = el('canvas');
    c.width = g.pix.width;
    c.height = g.pix.height;
    c.getContext('2d').putImageData(g.pix, 0, 0);
    c.setAttribute('role', 'img');
    c.setAttribute('aria-label', `Dessin de ${g.by} : ${g.word ?? ''}`);
    return c;
  }
  function renderGallery() {
    const show = gallery.length > 0;
    $('#lobby-gallery').hidden = !show;
    if (!show) return;
    $('#gallery-lobby').replaceChildren(...gallery.map((g, i) => {
      const isBest = bestDrawing && g.word === bestDrawing.word && g.by === bestDrawing.by;
      const f = el('figure', isBest ? 'thumb best' : 'thumb');
      f.style.animationDelay = `${i * 40}ms`;
      const img = thumbCanvas(g);
      const cap = el('figcaption');
      cap.append(el('span', 'w', g.word ?? '?'));
      if (isBest) { const t = iconEl('star', 'best-tag'); t.title = 'Meilleur dessin'; cap.append(t); }
      cap.append(el('span', 'by', g.by));
      f.append(img, cap);
      return f;
    }));
  }

  // ---------- jeu ----------
  const isDrawer = () => S && S.drawerId === S.me;
  const canDraw = () => S && S.state === 'drawing' && isDrawer();
  const meP = () => S?.players.find((p) => p.id === S.me);

  const peek = $('#btn-peek');
  function renderPeek() {
    peek.innerHTML = IC.svg(hideWord ? 'eye' : 'eyeOff');
    peek.title = hideWord ? 'Afficher mon mot' : 'Masquer mon mot (contre les regards)';
    peek.setAttribute('aria-label', peek.title);
  }
  peek.addEventListener('click', () => {
    hideWord = !hideWord;
    store.set('gb_hideword', hideWord);
    renderPeek();
    if (S) renderHint();
  });
  renderPeek();

  const fmtMult = (m) => `×${String(m).replace('.', ',')}`;

  function renderHint() {
    const box = $('#g-hint');
    const label = $('#g-hint-label');
    box.replaceChildren();
    peek.hidden = true;
    if (S.state === 'choosing') {
      label.textContent = '';
      box.append(el('span', null, isDrawer() ? 'Choisis ton mot' : 'Choix du mot'));
      lastHint = '';
      return;
    }
    if (S.state !== 'drawing' && S.state !== 'turnEnd') { label.textContent = ''; lastHint = ''; return; }
    const levelTag = () => S.level && el('span', `hint-lvl lvl-${S.level.level}`, `${S.level.label} ${fmtMult(S.level.mult)}`);
    if (S.word) {
      const private_ = S.state === 'drawing';
      label.textContent = isDrawer() ? 'Ton mot à dessiner' : S.state === 'turnEnd' ? 'Le mot était' : 'Bien trouvé';
      const w = el('span', 'word', S.word);
      if (private_ && hideWord) {
        w.classList.add('masked');
        w.title = 'Reste appuyé pour voir le mot';
        const show = () => w.classList.add('peeking');
        const hide = () => w.classList.remove('peeking');
        w.addEventListener('pointerdown', show);
        w.addEventListener('pointerup', hide);
        w.addEventListener('pointerleave', hide);
        w.addEventListener('pointercancel', hide);
        label.textContent += ' (masqué)';
      }
      box.append(w);
      if (levelTag()) box.append(levelTag());
      peek.hidden = !private_;
      lastHint = '';
      return;
    }
    label.textContent = 'Devine le mot';
    let letters = 0;
    [...S.hint].forEach((ch, i) => {
      if (ch === ' ') { box.append(el('span', 'gap')); return; }
      if (ch === '_') { box.append(el('span', 'ch blank', ' ')); letters++; return; }
      if (/[\p{L}\p{N}]/u.test(ch)) letters++;
      const isNew = lastHint && lastHint[i] === '_' && ch !== '_';
      box.append(el('span', isNew ? 'ch pop' : 'ch', ch));
    });
    box.append(el('span', 'count', `${letters} lettres`));
    if (levelTag()) box.append(levelTag());
    lastHint = S.hint;
  }

  function animateScore(node, id, target) {
    const from = shownScores.get(id) ?? target;
    shownScores.set(id, target);
    if (from === target || reduceMotion) { node.textContent = `${target} pts`; return; }
    const t0 = performance.now();
    const dur = 700;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const v = Math.round(from + (target - from) * (1 - (1 - k) ** 3));
      node.textContent = `${v} pts`;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function renderPlayers() {
    const ranked = [...S.players].sort((a, b) => b.score - a.score);
    $('#g-players').replaceChildren(...ranked.map((p, i) => {
      const cls = [p.id === S.me && 'me', p.guessed && 'guessed', p.id === S.drawerId && 'drawing', !p.connected && 'off'].filter(Boolean);
      const justGuessed = p.guessed && !knownGuessed.has(p.id);
      if (justGuessed) cls.push('flash');
      const li = el('li', cls.join(' '));
      const info = el('div', 'info');
      const score = el('div', 's');
      const name = el('div', 'n', p.name);
      info.append(name, score);
      animateScore(score, p.id, p.score);
      const status = el('div', 'status');
      if (p.id === S.drawerId) status.append(iconEl('pencil', 'st-draw'));
      else if (p.guessed) status.append(iconEl('check', 'st-ok'));
      if (p.id === S.hostId) status.append(iconEl('crown', 'st-host'));
      li.append(el('span', 'rank', String(i + 1)), avatarEl(p.avatar), info, status);
      if (p.lastGain > 0 && (S.state === 'drawing' || S.state === 'turnEnd')) li.append(el('span', 'gain', `+${p.lastGain}`));
      return li;
    }));
    knownGuessed.clear();
    S.players.filter((p) => p.guessed).forEach((p) => knownGuessed.add(p.id));
  }

  function renderOverlay() {
    const ov = $('#overlay');
    const drawer = S.players.find((p) => p.id === S.drawerId);
    const key = `${S.state}:${S.turnId}:${S.choices ? S.choices.join() : ''}:${S.state === 'turnEnd' ? S.players.map((p) => p.lastGain).join() : ''}`;
    if (ov.dataset.key === key) return;
    ov.dataset.key = key;
    ov.replaceChildren();
    if (S.state === 'choosing') {
      if (isDrawer() && S.choices) {
        const box = el('div', 'choices');
        S.choices.forEach((w, i) => {
          const lv = S.choiceLevels?.[i];
          const b = el('button', `choice lvl-${lv?.level ?? 2}`);
          b.append(el('span', 'choice-word', w));
          if (lv) b.append(el('span', 'choice-lvl', `${lv.label} · points ${fmtMult(lv.mult)}`));
          b.type = 'button';
          b.addEventListener('click', () => socket.emit('word:choose', i));
          box.append(b);
        });
        ov.append(el('h3', null, 'À toi de dessiner'), el('p', 'sub', 'Choisis un mot : plus il est difficile, plus il rapporte'), box);
      } else {
        const w = el('div', 'waiting');
        w.append(avatarEl(drawer?.avatar, 'big'));
        ov.append(w, el('h3', null, `${drawer?.name ?? 'Quelqu\'un'} choisit un mot`));
      }
      ov.hidden = false;
    } else if (S.state === 'turnEnd') {
      ov.append(el('p', 'sub', S.word ? 'Le mot était' : 'Tour terminé'));
      if (S.word) {
        const big = el('div', 'big-word');
        [...S.word].forEach((ch, i) => {
          const s = el('span', null, ch);
          s.style.animationDelay = `${i * 45}ms`;
          big.append(s);
        });
        ov.append(big);
        if (S.level) ov.append(el('p', `lvl-note lvl-${S.level.level}`, `Mot ${S.level.label.toLowerCase()}, points ${fmtMult(S.level.mult)}`));
      }
      const gains = el('ul', 'gains');
      [...S.players].sort((a, b) => b.lastGain - a.lastGain).forEach((p, i) => {
        const li = el('li');
        li.style.animationDelay = `${300 + i * 60}ms`;
        const who = el('span', 'gain-who');
        who.append(avatarEl(p.avatar, 'tiny'), el('span', null, p.name));
        li.append(who, el('span', p.lastGain > 0 ? 'plus' : 'zero', `+${p.lastGain}`));
        gains.append(li);
      });
      ov.append(gains);
      ov.hidden = false;
    } else if (S.state === 'gameOver' && S.podium) {
      ov.append(el('h3', null, 'Fin de la partie'));
      const pod = el('div', 'podium');
      for (const idx of [1, 0, 2]) {
        const p = S.podium[idx];
        if (!p) continue;
        const step = el('div', `step p${idx + 1}`);
        const crown = el('div', 'crown');
        if (idx === 0) crown.innerHTML = IC.svg('crown');
        step.append(crown, avatarEl(p.avatar, idx === 0 ? 'big' : 'mid'), el('div', 'pname', p.name), el('div', 'pscore', `${p.score} pts`), el('div', 'block', String(idx + 1)));
        pod.append(step);
      }
      ov.append(pod);
      if (S.best) {
        bestDrawing = S.best;
        const b = el('div', 'best-drawing');
        b.append(iconEl('star'), el('span', null, `Meilleur dessin : « ${S.best.word} » par ${S.best.by} (+${S.best.bonus})`));
        ov.append(b);
      }
      const thisGame = gallery.slice(-Math.max(0, S.round * (S.podium.length || 1)));
      if (thisGame.length) {
        const g = el('div', 'over-gallery');
        thisGame.slice(-8).forEach((t, i) => {
          const img = thumbCanvas(t);
          img.title = `${t.word} · ${t.by}`;
          img.style.animationDelay = `${900 + i * 60}ms`;
          g.append(img);
        });
        ov.append(g);
      }
      if (S.me === S.hostId) {
        const again = el('button', 'btn btn-primary');
        again.type = 'button';
        again.append(iconEl('replay'), el('span', null, 'Rejouer'));
        again.addEventListener('click', startGame);
        const acts = el('div', 'over-actions');
        acts.append(again);
        ov.append(acts);
      } else {
        ov.append(el('p', 'sub', 'Retour au salon dans quelques secondes'));
      }
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
    const r = $('#g-round');
    r.replaceChildren();
    if (S.round) {
      r.append('Manche ', el('b', null, String(Math.min(S.round, S.settings.rounds))), ` sur ${S.settings.rounds}`);
    }
    renderHint();
    renderPlayers();
    renderOverlay();
    const drawingNow = canDraw();
    $('#toolbar').hidden = !drawingNow;
    $('#react').hidden = S.state !== 'drawing' && S.state !== 'turnEnd';
    $('#react-label').textContent = isDrawer() ? 'Votes pour ton dessin' : 'Vote pour ce dessin';
    $('#r-up').disabled = $('#r-down').disabled = isDrawer();
    renderReactions();
    canvas.classList.toggle('can-draw', drawingNow && tool !== 'fill');
    canvas.classList.toggle('can-fill', drawingNow && tool === 'fill');
    const me = meP();
    const secret = S.state === 'drawing' && (isDrawer() || me?.guessed);
    $('#chat-form').classList.toggle('secret', Boolean(secret));
    $('#chat-lock').hidden = !secret;
    $('#chat-input').placeholder = secret
      ? 'Message secret, visible par ceux qui ont trouvé'
      : S.state === 'drawing' ? 'Tape ta réponse' : 'Écris un message';
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
      if (S.state === 'turnEnd') { captureTurn(); sfx.end(); }
      if (S.state === 'gameOver') sfx.win();
      if (S.state === 'choosing' && (lastState === 'lobby' || lastState === 'gameOver' || lastState === null) && S.round === 1) {
        gallery = [];
        bestDrawing = null;
        shownScores.clear();
      }
      lastState = S.state;
    }
    deadline = Date.now() + S.timeLeft;
    turnTotal = S.state === 'drawing' ? S.settings.drawTime * 1000 : S.state === 'choosing' ? 15000 : S.state === 'turnEnd' ? 6000 : 15000;
    if (S.state === 'lobby') { showScreen('lobby'); renderLobby(); } else { showScreen('game'); renderGame(); }
  }

  // ---------- chrono ----------
  setInterval(() => {
    if (!S || S.state === 'lobby') return;
    const left = Math.max(0, deadline - Date.now());
    const secs = Math.ceil(left / 1000);
    $('#g-timer-n').textContent = String(secs);
    $('#timer-ring').style.strokeDashoffset = String(1 - Math.min(1, left / turnTotal));
    const t = $('#g-timer');
    const urgent = S.state === 'drawing' && secs <= 10;
    t.classList.toggle('urgent', urgent);
    if (urgent && secs !== lastSecond && secs > 0) {
      sfx.tick();
      t.classList.remove('tick');
      void t.offsetWidth;
      t.classList.add('tick');
    }
    lastSecond = secs;
  }, 200);

  // ---------- gerbe de craie ----------
  function burst() {
    if (reduceMotion) return;
    const box = $('#burst');
    const colors = ['#F5C431', '#3DBE7A', '#4C8DF6', '#F2665A', '#8E6CF0', '#FBFAF6'];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 26; i++) {
      const p = el('i');
      const a = (Math.PI * 2 * i) / 26 + Math.random() * 0.4;
      const d = 120 + Math.random() * 160;
      p.style.setProperty('--dx', `${Math.cos(a) * d}px`);
      p.style.setProperty('--dy', `${Math.sin(a) * d}px`);
      p.style.setProperty('--rot', `${Math.random() * 540 - 270}deg`);
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = `${Math.random() * 80}ms`;
      frag.append(p);
    }
    box.replaceChildren(frag);
    setTimeout(() => box.replaceChildren(), 1200);
  }

  // ---------- canvas ----------
  // Le dessin est calculé pixel par pixel dans une mémoire du jeu (buf), puis seulement
  // affiché dans le <canvas>. On ne relit jamais le canvas : certains navigateurs
  // (LibreWolf, Brave, Tor) brouillent volontairement cette lecture contre le pistage,
  // ce qui cassait le pot de peinture. Le rendu est aussi identique sur tous les navigateurs.
  const canvas = $('#canvas');
  const ctx = canvas.getContext('2d');
  const frame = ctx.createImageData(W, H);
  const buf = frame.data;
  let dirty = null;
  let flushQueued = false;

  function markDirty(x0, y0, x1, y1) {
    if (!dirty) dirty = { x0, y0, x1, y1 };
    else {
      dirty.x0 = Math.min(dirty.x0, x0); dirty.y0 = Math.min(dirty.y0, y0);
      dirty.x1 = Math.max(dirty.x1, x1); dirty.y1 = Math.max(dirty.y1, y1);
    }
    if (!flushQueued) { flushQueued = true; requestAnimationFrame(flush); }
  }
  function flush() {
    flushQueued = false;
    if (!dirty) return;
    const { x0, y0, x1, y1 } = dirty;
    dirty = null;
    ctx.putImageData(frame, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  }
  function wipe() { buf.fill(255); markDirty(0, 0, W - 1, H - 1); }
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

  // Trait rond (capsule) avec un bord adouci d'un pixel
  function stroke(x0, y0, x1, y1, w, hex) {
    const [r, g, b] = hexToRgb(hex);
    const rad = Math.max(0.5, w / 2);
    const minX = Math.max(0, Math.floor(Math.min(x0, x1) - rad - 1));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(x0, x1) + rad + 1));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1) - rad - 1));
    const maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1) + rad + 1));
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    for (let y = minY; y <= maxY; y++) {
      const py = y + 0.5;
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        let t = len2 ? ((px - x0) * dx + (py - y0) * dy) / len2 : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = px - (x0 + t * dx);
        const ey = py - (y0 + t * dy);
        const cov = rad + 0.5 - Math.sqrt(ex * ex + ey * ey);
        if (cov <= 0) continue;
        const i = (y * W + x) * 4;
        if (cov >= 1) { buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; }
        else {
          buf[i] += (r - buf[i]) * cov;
          buf[i + 1] += (g - buf[i + 1]) * cov;
          buf[i + 2] += (b - buf[i + 2]) * cov;
        }
        buf[i + 3] = 255;
      }
    }
    markDirty(minX, minY, maxX, maxY);
  }

  function applyOp(op) {
    if (op.t === 'l') stroke(op.p[0], op.p[1], op.p[2], op.p[3], op.w, op.c);
    else if (op.t === 'f') floodFill(Math.floor(op.p[0]), Math.floor(op.p[1]), op.c);
    else if (op.t === 'c') wipe();
  }
  function redraw() { wipe(); for (const op of ops) applyOp(op); flush(); }

  // Remplissage « pot de peinture » par balayage de lignes, dans la mémoire du jeu
  function floodFill(x, y, hex) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const d = buf;
    const [r, g, b] = hexToRgb(hex);
    const i0 = (y * W + x) * 4;
    const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2];
    if (Math.abs(tr - r) < 6 && Math.abs(tg - g) < 6 && Math.abs(tb - b) < 6) return;
    const TOL = 70;
    const match = (i) => Math.abs(d[i] - tr) <= TOL && Math.abs(d[i + 1] - tg) <= TOL && Math.abs(d[i + 2] - tb) <= TOL;
    const seen = new Uint8Array(W * H);
    const stack = [[x, y]];
    let minX = x, maxX = x, minY = y, maxY = y;
    while (stack.length) {
      let [cx, cy] = stack.pop();
      let p = cy * W + cx;
      while (cx >= 0 && !seen[p] && match(p * 4)) { cx--; p--; }
      cx++; p++;
      let up = false;
      let down = false;
      if (cx < minX) minX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;
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
      if (cx - 1 > maxX) maxX = cx - 1;
    }
    markDirty(minX, minY, maxX, maxY);
  }

  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    const x = Math.min(W, Math.max(0, ((e.clientX - r.left) * W) / r.width));
    const y = Math.min(H, Math.max(0, ((e.clientY - r.top) * H) / r.height));
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  }
  const newSid = () => `${S.me}-${++strokeN}`;
  const curColor = () => (tool === 'eraser' ? '#ffffff' : color);
  const curSize = () => (tool === 'eraser' ? Math.max(size, 20) : size);
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
    send({ t: 'l', s: strokeId, c: curColor(), w: curSize(), p: [x, y, x, y] });
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing || !canDraw()) return;
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of events.length ? events : [e]) {
      const [x, y] = toCanvas(ev);
      if (Math.hypot(x - lastPt[0], y - lastPt[1]) < 2) continue;
      send({ t: 'l', s: strokeId, c: curColor(), w: curSize(), p: [lastPt[0], lastPt[1], x, y] });
      lastPt = [x, y];
    }
  });
  const stop = () => { drawing = false; lastPt = null; };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);

  // ---------- barre d'outils ----------
  const swatches = PALETTE.map((c) => {
    const b = el('button', 'color');
    b.type = 'button';
    b.style.background = c;
    b.dataset.color = c;
    b.setAttribute('aria-label', `Couleur ${c}`);
    b.addEventListener('click', () => { color = c; if (tool === 'eraser') tool = 'pen'; renderTools(); });
    return b;
  });
  const custom = el('label', 'color color-custom');
  custom.title = 'Couleur libre';
  const picker = el('input');
  picker.type = 'color';
  picker.value = '#8E6CF0';
  picker.setAttribute('aria-label', 'Choisir une couleur libre');
  picker.addEventListener('input', () => { color = picker.value; if (tool === 'eraser') tool = 'pen'; renderTools(); });
  custom.append(picker);
  $('#palette').replaceChildren(...swatches.slice(0, 8), custom, ...swatches.slice(8));
  $('#sizes').replaceChildren(...SIZES.map((s) => {
    const b = el('button', 'size');
    b.type = 'button';
    b.dataset.size = s;
    b.setAttribute('aria-label', `Épaisseur ${s}`);
    const dot = el('i');
    const px = Math.max(4, Math.min(24, s * 0.6));
    dot.style.width = dot.style.height = `${px}px`;
    b.append(dot);
    b.addEventListener('click', () => { size = s; renderTools(); });
    return b;
  }));
  document.querySelectorAll('.tool[data-tool]').forEach((b) => b.addEventListener('click', () => { tool = b.dataset.tool; renderTools(); }));
  $('#t-undo').addEventListener('click', () => socket.emit('draw:undo'));
  $('#t-clear').addEventListener('click', () => { if (canDraw()) send({ t: 'c', s: newSid() }); });
  function renderTools() {
    document.querySelectorAll('.color[data-color]').forEach((b) => b.classList.toggle('active', b.dataset.color === color && tool !== 'eraser'));
    custom.classList.toggle('active', !PALETTE.includes(color) && tool !== 'eraser');
    document.querySelectorAll('.size').forEach((b) => b.classList.toggle('active', Number(b.dataset.size) === size));
    document.querySelectorAll('.tool[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === tool));
    if (S && S.state !== 'lobby') {
      canvas.classList.toggle('can-draw', canDraw() && tool !== 'fill');
      canvas.classList.toggle('can-fill', canDraw() && tool === 'fill');
    }
  }

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
    const kind = m.kind || 'chat';
    const line = el('div', `msg ${kind}`);
    if (CHAT_ICONS[kind]) line.append(iconEl(CHAT_ICONS[kind]));
    const txt = el('span', 'txt');
    if (m.from) txt.append(el('span', 'who', `${m.from.name} `), document.createTextNode(m.text));
    else txt.textContent = m.text;
    line.append(txt);
    const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
    log.append(line);
    while (log.children.length > 250) log.firstChild.remove();
    if (atBottom) log.scrollTop = log.scrollHeight;
    if (kind === 'success-me') { sfx.win(); burst(); }
    if (kind === 'close') sfx.close();
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
  socket.on('disconnect', () => { if (S) toast('Connexion perdue, reconnexion en cours', { error: true, ms: 4000 }); });
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
  IC.hydrate();
  renderMute();
  renderTools();
  showScreen('home');
  wipe();
  loadHof();
  fetch('/api/health').then((r) => r.json()).then((d) => { if (d.version) $('#app-version').textContent = `Version ${d.version}`; }).catch(() => {});
  if (!currentCode && !profile.name) $('#name').focus();
})();
