import {
  createGameRecord,
  getReplayPositions,
  getResultLabel,
} from './gameRecord';

declare const require: (id: string) => unknown;

type TestFunction = (
  name: string,
  callback: () => void | Promise<void>,
) => void;

type Assert = {
  equal: (actual: unknown, expected: unknown) => void;
  throws: (callback: () => void, expected?: RegExp) => void;
};

const test = require('node:test') as TestFunction;
const assert = require('node:assert/strict') as Assert;

test('creates searchable metadata from imported PGN headers', () => {
  const record = createGameRecord({
    clockLabel: '导入棋谱',
    createdAt: '2026-06-11T12:00:00.000Z',
    pgn: [
      '[White "Alice"]',
      '[Black "Bob"]',
      '[Result "1-0"]',
      '',
      '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0',
    ].join('\n'),
    source: 'imported',
  });

  assert.equal(record.title, 'Alice vs Bob');
  assert.equal(record.result, '1-0');
  assert.equal(record.moveCount, 7);
  assert.equal(record.source, 'imported');
  assert.equal(getResultLabel(record.result), '白方获胜');
  assert.equal(getReplayPositions(record).length, 8);
});

test('uses safe local names when PGN player headers are absent', () => {
  const record = createGameRecord({
    pgn: '1. d4 d5 *',
    source: 'played',
  });

  assert.equal(record.whiteName, '白方');
  assert.equal(record.blackName, '黑方');
  assert.equal(record.title, '白方 vs 黑方');
  assert.equal(record.result, '*');
});

test('rejects empty and invalid PGN records with a clear message', () => {
  assert.throws(
    () =>
      createGameRecord({
        pgn: '',
        source: 'imported',
      }),
    /PGN 内容不能为空/,
  );
  assert.throws(
    () =>
      createGameRecord({
        pgn: '1. e4 e5 2. Ke3',
        source: 'imported',
      }),
    /无法读取 PGN/,
  );
});
