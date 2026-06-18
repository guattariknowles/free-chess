import { Chess } from 'chess.js';

import {
  parseUciMove,
  resolveLegalEngineMove,
  toUciMove,
} from './uci';

declare const require: (id: string) => unknown;

type TestFunction = (name: string, callback: () => void) => void;
type Assert = {
  deepEqual: (actual: unknown, expected: unknown) => void;
  equal: (actual: unknown, expected: unknown) => void;
};

const test = require('node:test') as TestFunction;
const assert = require('node:assert/strict') as Assert;

test('UCI move parsing supports normal moves and promotions', () => {
  assert.deepEqual(parseUciMove('e2e4'), {
    from: 'e2',
    promotion: undefined,
    to: 'e4',
  });
  assert.deepEqual(parseUciMove('a7a8q'), {
    from: 'a7',
    promotion: 'q',
    to: 'a8',
  });
  assert.equal(parseUciMove('bestmove e2e4'), null);
  assert.equal(parseUciMove('(none)'), null);
});

test('UCI conversion keeps promotion suffixes', () => {
  assert.equal(
    toUciMove({ from: 'a7', promotion: 'n', to: 'a8' }),
    'a7a8n',
  );
});

test('engine moves are resolved through chess.js legality checks', () => {
  const fen = new Chess().fen();
  const legal = resolveLegalEngineMove(fen, {
    from: 'e2',
    to: 'e4',
  });
  const illegal = resolveLegalEngineMove(fen, {
    from: 'e2',
    to: 'e5',
  });

  assert.equal(legal?.san, 'e4');
  assert.equal(illegal, null);
});

test('lesson constraints reject otherwise legal engine moves', () => {
  const fen = new Chess().fen();
  const rejected = resolveLegalEngineMove(
    fen,
    { from: 'd2', to: 'd4' },
    [{ from: 'e2', to: 'e4' }],
  );
  const accepted = resolveLegalEngineMove(
    fen,
    { from: 'e2', to: 'e4' },
    [{ from: 'e2', to: 'e4' }],
  );

  assert.equal(rejected, null);
  assert.equal(accepted?.san, 'e4');
});
