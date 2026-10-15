// Page charte : construit les nuanciers, icônes, persos et démos à partir des vraies sources du jeu.
(() => {
  'use strict';
  const IC = window.GribIcons;
  const AV = window.GribAvatar;
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const icon = (n) => { const s = el('span'); s.innerHTML = IC.svg(n); return s; };

  const BASE = [
    ['Ardoise', '#1F2A27', 'Fond de toutes les pages'],
    ['Ardoise claire', '#2A3833', 'Blocs posés sur l\'ardoise'],
    ['Craie', '#EDEBE4', 'Texte sur ardoise, logo'],
    ['Papier', '#FBFAF6', 'Feuilles, canvas, fenêtres'],
    ['Papier froissé', '#F1EFE8', 'Champs, boutons discrets'],
    ['Encre', '#1C1F1E', 'Texte sur papier, traits des persos'],
  ];
  const MARKERS = [
    ['Jaune', '#F5C431', 'Action principale, chrono, mot'],
    ['Corail', '#F2665A', 'Souligné du logo, « tu chauffes »'],
    ['Vert', '#3DBE7A', 'Bonne réponse, points gagnés'],
    ['Bleu', '#4C8DF6', 'Focus clavier, liens'],
    ['Violet', '#8E6CF0', 'Chat secret'],
    ['Rouge', '#E5484D', 'Erreurs, 10 dernières secondes'],
  ];
  const swatches = (root, list) => {
    root.replaceChildren(...list.map(([name, hex, use]) => {
      const c = el('div', 'swatch-card');
      const chip = el('div', 'chip');
      chip.style.background = hex;
      const meta = el('div', 'meta');
      meta.append(el('div', 'nm', name), el('div', 'hx', hex), el('div', 'use', use));
      c.append(chip, meta);
      return c;
    }));
  };
  swatches($('#sw-base'), BASE);
  swatches($('#sw-markers'), MARKERS);

  $('#icon-grid').replaceChildren(...IC.names.map((n) => {
    const c = el('div', 'ic-cell');
    c.append(icon(n), el('span', null, n));
    return c;
  }));

  const rollAvatars = () => {
    $('#avatar-grid').replaceChildren(...Array.from({ length: 12 }, (_, i) => {
      const t = el('div', 'tile');
      t.style.animationDelay = `${i * 40}ms`;
      t.innerHTML = AV.svg(AV.random());
      return t;
    }));
  };
  rollAvatars();
  $('#reroll').addEventListener('click', rollAvatars);

  const msgs = [
    ['round', null, 'Manche 1 / 3'],
    ['turn', 'pencil', 'Inès dessine'],
    ['chat', null, 'baleine volante', 'Lucas'],
    ['close', 'flame', '« girafe » : tu chauffes !'],
    ['success', 'check', 'Lucas a trouvé en premier !'],
    ['secret', 'lock', 'trop facile celui-là', 'Lucas'],
    ['reveal', 'eye', 'Le mot était « girafe »'],
    ['win', 'trophy', 'Maxime remporte la partie !'],
  ];
  $('#chat-demo').replaceChildren(...msgs.map(([kind, ic, text, who]) => {
    const m = el('div', `msg ${kind}`);
    if (ic) m.append(icon(ic));
    const t = el('span', 'txt');
    if (who) t.append(el('span', 'who', `${who} `), document.createTextNode(text));
    else t.textContent = text;
    m.append(t);
    return m;
  }));

  const players = [
    ['Maxime', 1240, 'drawing', 'pencil'],
    ['Lucas', 980, 'guessed', 'check'],
    ['Inès', 610, '', null],
  ];
  $('#player-demo').replaceChildren(...players.map(([n, s, cls, ic], i) => {
    const li = el('li', cls);
    const av = el('div', 'avatar');
    av.innerHTML = AV.svg(AV.random());
    const info = el('div');
    info.append(el('div', 'n', n), el('div', 's', `${s} pts`));
    const st = el('div', `st ${ic === 'pencil' ? 'draw' : ''}`);
    if (ic) st.append(icon(ic));
    li.append(el('span', 'rank', String(i + 1)), av, info, st);
    return li;
  }));

  // chrono de démonstration
  let left = 80;
  setInterval(() => {
    left = left <= 0 ? 80 : left - 1;
    $('#demo-n').textContent = String(left);
    $('#demo-ring').style.strokeDashoffset = String(1 - left / 80);
    $('#demo-ring').closest('.timer').classList.toggle('urgent', left <= 10);
  }, 250);

  $('#replay').addEventListener('click', () => {
    document.querySelectorAll('.demo-line path, .demo-pop, .chalk-title').forEach((n) => {
      n.style.animation = 'none';
      void n.getBoundingClientRect();
      n.style.animation = '';
    });
  });

  IC.hydrate();
})();
