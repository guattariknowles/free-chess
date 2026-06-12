import {
  getBoardSquares,
  shouldRotatePieceForFaceToFace,
} from './boardCoordinates';

declare const require: (id: string) => unknown;

type TestFunction = (name: string, callback: () => void) => void;
type Assert = {
  equal: (actual: unknown, expected: unknown) => void;
};

const test = require('node:test') as TestFunction;
const assert = require('node:assert/strict') as Assert;

test('face-to-face mode rotates only the player on the far side', () => {
  assert.equal(shouldRotatePieceForFaceToFace('b', false), true);
  assert.equal(shouldRotatePieceForFaceToFace('w', false), false);
  assert.equal(shouldRotatePieceForFaceToFace('w', true), true);
  assert.equal(shouldRotatePieceForFaceToFace('b', true), false);
});

test('flipping keeps square identities while reversing their display', () => {
  assert.equal(getBoardSquares(false)[0][0], 'a8');
  assert.equal(getBoardSquares(true)[0][0], 'h1');
});
