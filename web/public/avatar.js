// Personnages de Gribouille : un perso en sweat à capuche, dessiné au marqueur.
// Un avatar = { s: peau, h: sweat, e: yeux, m: bouche, a: accessoire } (des index).
// Pour ajouter une pièce : ajoute une entrée dans le tableau voulu ET augmente
// la limite correspondante dans server/src/game.js (AVATAR_LIMITS).
(() => {
  'use strict';
  const INK = '#141316';
  const S = `stroke="${INK}" stroke-linecap="round" stroke-linejoin="round"`;

  const SKINS = ['#ffe0bd', '#f5c58f', '#e0a36b', '#b97a4b', '#8a5532', '#5e3a22', '#a8f0c6', '#c9b6ff'];
  const HOODIES = ['#ff3d8b', '#ffd60a', '#2ad4ff', '#8cf25b', '#ff8a1f', '#9b5cff', '#f6f4ee', '#3a3942', '#e63946', '#1f6feb', '#2ec4b6', '#ff9bd2'];

  const EYES = [
    // points
    `<circle cx="40" cy="44" r="3.6" fill="${INK}"/><circle cx="60" cy="44" r="3.6" fill="${INK}"/>`,
    // gros yeux
    `<circle cx="40" cy="43" r="7" fill="#fff" ${S} stroke-width="2.5"/><circle cx="60" cy="43" r="7" fill="#fff" ${S} stroke-width="2.5"/><circle cx="41.5" cy="44" r="3" fill="${INK}"/><circle cx="61.5" cy="44" r="3" fill="${INK}"/>`,
    // content ^^
    `<path d="M34 46 Q40 38 46 46 M54 46 Q60 38 66 46" fill="none" ${S} stroke-width="3"/>`,
    // endormi
    `<path d="M34 44 Q40 49 46 44 M54 44 Q60 49 66 44" fill="none" ${S} stroke-width="3"/>`,
    // lunettes de soleil
    `<path d="M29 39 h18 v5 q0 7 -9 7 q-9 0 -9 -7z M53 39 h18 v5 q0 7 -9 7 q-9 0 -9 -7z" fill="${INK}"/><path d="M47 41 h6" ${S} stroke-width="2.5"/><path d="M33 42 l4 -2 M57 42 l4 -2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`,
    // KO
    `<path d="M36 40 l8 8 M44 40 l-8 8 M56 40 l8 8 M64 40 l-8 8" ${S} stroke-width="3"/>`,
    // vénère
    `<path d="M33 37 L46 41 M67 37 L54 41" ${S} stroke-width="3"/><circle cx="41" cy="46" r="3.2" fill="${INK}"/><circle cx="59" cy="46" r="3.2" fill="${INK}"/>`,
    // clin d'oeil
    `<circle cx="40" cy="44" r="3.6" fill="${INK}"/><path d="M54 45 Q60 39 66 45" fill="none" ${S} stroke-width="3"/>`,
    // coeurs
    `<path d="M40 49 l-6 -6 a3.4 3.4 0 0 1 6 -4 a3.4 3.4 0 0 1 6 4z M60 49 l-6 -6 a3.4 3.4 0 0 1 6 -4 a3.4 3.4 0 0 1 6 4z" fill="#ff3d8b" ${S} stroke-width="1.8"/>`,
    // étoiles
    `<path d="M40 37 l2 5 5 .4 -4 3.4 1.3 5 -4.3 -2.8 -4.3 2.8 1.3 -5 -4 -3.4 5 -.4z M60 37 l2 5 5 .4 -4 3.4 1.3 5 -4.3 -2.8 -4.3 2.8 1.3 -5 -4 -3.4 5 -.4z" fill="#ffd60a" ${S} stroke-width="1.6"/>`,
  ];

  const MOUTHS = [
    // sourire
    `<path d="M41 57 Q50 65 59 57" fill="none" ${S} stroke-width="3"/>`,
    // banane
    `<path d="M38 55 Q50 71 62 55 Z" fill="#fff" ${S} stroke-width="2.6"/><path d="M40 58 h20" ${S} stroke-width="1.6"/>`,
    // oh
    `<ellipse cx="50" cy="60" rx="4" ry="5" fill="${INK}"/>`,
    // bof
    `<path d="M42 59 h16" ${S} stroke-width="3"/>`,
    // langue
    `<path d="M41 57 Q50 64 59 57" fill="none" ${S} stroke-width="3"/><path d="M47 61 q3 8 6 0" fill="#ff7aa8" ${S} stroke-width="2"/>`,
    // en coin
    `<path d="M42 60 Q53 62 59 54" fill="none" ${S} stroke-width="3"/>`,
    // triste
    `<path d="M41 63 Q50 54 59 63" fill="none" ${S} stroke-width="3"/>`,
    // zigzag
    `<path d="M39 59 l4 -3 4 3 4 -3 4 3 4 -3 4 3" fill="none" ${S} stroke-width="2.6"/>`,
    // moustache
    `<path d="M50 54 c-4 -3 -12 -3 -14 3 c5 -2 9 0 14 -1 c5 1 9 -1 14 1 c-2 -6 -10 -6 -14 -3z" fill="${INK}"/><path d="M45 61 h10" ${S} stroke-width="2.4"/>`,
    // vampire
    `<path d="M40 56 Q50 65 60 56 Z" fill="${INK}"/><path d="M44 57 l2 5 2 -5z M52 57 l2 5 2 -5z" fill="#fff"/>`,
  ];

  const ACCESSORIES = [
    // rien
    '',
    // casquette
    `<path d="M24 33 C24 18 36 12 50 12 C64 12 76 18 76 33 Z" fill="#ff3d8b" ${S} stroke-width="3"/><path d="M70 31 C80 29 91 31 93 36 C84 38 76 37 70 35 Z" fill="#ff3d8b" ${S} stroke-width="3"/><circle cx="50" cy="13" r="2.6" fill="${INK}"/>`,
    // bonnet
    `<path d="M23 33 C22 16 35 9 50 9 C65 9 78 16 77 33 Z" fill="#2ad4ff" ${S} stroke-width="3"/><rect x="20" y="27" width="60" height="10" rx="5" fill="#2ad4ff" ${S} stroke-width="3"/><circle cx="50" cy="8" r="5.5" fill="#ffd60a" ${S} stroke-width="2.6"/>`,
    // couronne
    `<path d="M30 23 L33 6 L42 15 L50 3 L58 15 L67 6 L70 23 Z" fill="#ffd60a" ${S} stroke-width="3"/><circle cx="50" cy="17" r="2.6" fill="#ff3d8b"/>`,
    // casque audio
    `<path d="M24 44 C24 12 76 12 76 44" fill="none" ${S} stroke-width="5"/><rect x="15" y="37" width="12" height="18" rx="5" fill="#9b5cff" ${S} stroke-width="3"/><rect x="73" y="37" width="12" height="18" rx="5" fill="#9b5cff" ${S} stroke-width="3"/>`,
    // bandana
    `<path d="M23 31 C30 19 70 19 77 31 L77 36 C65 31 35 31 23 36 Z" fill="#e63946" ${S} stroke-width="3"/><path d="M76 32 l11 -5 -3 10z" fill="#e63946" ${S} stroke-width="2.6"/><circle cx="40" cy="27" r="1.6" fill="#fff"/><circle cx="56" cy="26" r="1.6" fill="#fff"/>`,
    // crête
    `<path d="M39 22 L42 4 L47 17 L51 1 L55 17 L60 5 L62 22 Z" fill="#8cf25b" ${S} stroke-width="3"/>`,
    // auréole
    `<ellipse cx="50" cy="8" rx="17" ry="4.5" fill="none" stroke="${INK}" stroke-width="7"/><ellipse cx="50" cy="8" rx="17" ry="4.5" fill="none" stroke="#ffd60a" stroke-width="3.5"/>`,
    // cornes
    `<path d="M31 25 C24 17 24 9 28 4 C30 12 34 16 39 19 Z M69 25 C76 17 76 9 72 4 C70 12 66 16 61 19 Z" fill="#e63946" ${S} stroke-width="2.6"/>`,
    // chapeau de fête
    `<path d="M37 21 L50 1 L63 21 Z" fill="#2ad4ff" ${S} stroke-width="3"/><path d="M42 14 l12 3 M46 8 l7 2" ${S} stroke-width="2"/><circle cx="50" cy="2" r="3.4" fill="#ff3d8b" ${S} stroke-width="2"/>`,
  ];

  const NAMES = {
    e: ['Points', 'Grands yeux', 'Content', 'Endormi', 'Lunettes', 'KO', 'Vénère', 'Clin d\'œil', 'Amoureux', 'Star'],
    m: ['Sourire', 'Banane', 'Oh', 'Bof', 'Langue', 'En coin', 'Triste', 'Zigzag', 'Moustache', 'Vampire'],
    a: ['Rien', 'Casquette', 'Bonnet', 'Couronne', 'Casque', 'Bandana', 'Crête', 'Auréole', 'Cornes', 'Fête'],
  };

  const LIMITS = { s: SKINS.length, h: HOODIES.length, e: EYES.length, m: MOUTHS.length, a: ACCESSORIES.length };

  function clamp(v, n) {
    const i = Number.parseInt(v, 10);
    return Number.isFinite(i) && i >= 0 && i < n ? i : 0;
  }

  function normalize(av) {
    const a = av && typeof av === 'object' ? av : {};
    return { s: clamp(a.s, LIMITS.s), h: clamp(a.h, LIMITS.h), e: clamp(a.e, LIMITS.e), m: clamp(a.m, LIMITS.m), a: clamp(a.a, LIMITS.a) };
  }

  function random() {
    const r = (n) => Math.floor(Math.random() * n);
    return { s: r(LIMITS.s), h: r(LIMITS.h), e: r(LIMITS.e), m: r(LIMITS.m), a: r(4) === 0 ? 0 : r(LIMITS.a) };
  }

  // Ne contient que des pièces définies ci-dessus : aucune donnée joueur n'est injectée.
  function svg(av) {
    const a = normalize(av);
    const head = 'M50 16 C66 15 78 28 77 44 C77 61 65 72 50 72 C34 72 22 61 23 45 C23 28 35 17 50 16 Z';
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">`
      + `<path d="M11 101 C11 81 27 70 50 70 C73 70 89 81 89 101 Z" fill="${HOODIES[a.h]}" ${S} stroke-width="3.5"/>`
      + `<path d="M43 74 v12 M57 74 v12" ${S} stroke-width="2.4"/><circle cx="43" cy="88" r="2" fill="${INK}"/><circle cx="57" cy="88" r="2" fill="${INK}"/>`
      + `<path d="${head}" fill="${SKINS[a.s]}" ${S} stroke-width="3.5"/>`
      + `<ellipse cx="33" cy="53" rx="4.5" ry="2.6" fill="#ff3d8b" opacity=".25"/><ellipse cx="67" cy="53" rx="4.5" ry="2.6" fill="#ff3d8b" opacity=".25"/>`
      + EYES[a.e] + MOUTHS[a.m] + ACCESSORIES[a.a]
      + `</svg>`;
  }

  window.GribAvatar = { SKINS, HOODIES, NAMES, LIMITS, normalize, random, svg };
})();
