import { PIECE_SKINS } from './skins';

declare const require: (id: string) => unknown;

type TestFunction = (
  name: string,
  callback: () => void | Promise<void>,
) => void;
type Assert = {
  equal: (actual: unknown, expected: unknown) => void;
  ok: (value: unknown, message?: string) => void;
};

const test = require('node:test') as TestFunction;
const assert = require('node:assert/strict') as Assert;
const fs = require('node:fs') as { existsSync: (path: string) => boolean };

const REQUIRED_PIECES = [
  'white-king',
  'white-queen',
  'white-rook',
  'white-bishop',
  'white-knight',
  'white-pawn',
  'black-king',
  'black-queen',
  'black-rook',
  'black-bishop',
  'black-knight',
  'black-pawn',
] as const;

test('teaching piece skin is selectable', () => {
  assert.equal(PIECE_SKINS.teachingLarge.label, '教学大图标');
});

test('teaching-large piece artwork includes the full chess set', () => {
  for (const piece of REQUIRED_PIECES) {
    assert.ok(
      fs.existsSync(`assets/pieces/teaching-large/${piece}.svg`),
      `${piece}.svg is missing`,
    );
  }
});
