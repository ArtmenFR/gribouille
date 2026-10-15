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
