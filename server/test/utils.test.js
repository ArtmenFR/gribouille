import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, levenshtein, cleanText } from '../src/game.js';

test('normalize ignore accents, casse, tirets et ligatures', () => {
  assert.equal(normalize('Éléphant'), 'elephant');
  assert.equal(normalize('arc-en-ciel'), 'arc en ciel');
  assert.equal(normalize('  ARC   en Ciel !! '), 'arc en ciel');
  assert.equal(normalize('Œuf'), 'oeuf');
  assert.equal(normalize("souris d'ordinateur"), 'souris d ordinateur');
});

test('levenshtein détecte les fautes de frappe', () => {
  assert.equal(levenshtein('girafe', 'girafe'), 0);
  assert.equal(levenshtein('girafe', 'giraffe'), 1);
  assert.equal(levenshtein('girafe', 'girage'), 1);
  assert.ok(levenshtein('chat', 'elephant') > 2);
});

test('cleanText retire les caractères de contrôle et coupe', () => {
  assert.equal(cleanText('  salut\u0000‮  ', 100), 'salut');
  assert.equal(cleanText('a'.repeat(50), 16).length, 16);
  assert.equal(cleanText(null, 10), '');
});

test('les pages chargent les scripts avec le numéro de version (anti-cache)', async () => {
  const { readFileSync } = await import('node:fs');
  const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  for (const page of ['index.html', 'charte.html']) {
    const html = readFileSync(new URL(`../../web/public/${page}`, import.meta.url), 'utf8');
    const refs = [...html.matchAll(/(?:src|href)="([a-z]+\.(?:js|css))(\?v=[^"]*)?"/g)];
    assert.ok(refs.length > 0, `aucun script trouvé dans ${page}`);
    for (const [, file, query] of refs) {
      assert.equal(query, `?v=${version}`, `${page} : ${file} doit être chargé avec ?v=${version}`);
    }
  }
});
