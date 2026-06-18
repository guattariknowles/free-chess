import {
  createUserProfile,
  normalizeProfileName,
  selectDistinctPlayerProfiles,
} from './userProfile';

declare const require: (id: string) => unknown;

type TestFunction = (name: string, callback: () => void) => void;
type Assert = {
  equal: (actual: unknown, expected: unknown) => void;
  throws: (callback: () => void, expected?: RegExp) => void;
};

const test = require('node:test') as TestFunction;
const assert = require('node:assert/strict') as Assert;

test('creates a trimmed local profile without network account data', () => {
  const profile = createUserProfile({
    createdAt: '2026-06-12T00:00:00.000Z',
    id: 'profile-a',
    name: '  Alice   Chen  ',
  });

  assert.equal(profile.id, 'profile-a');
  assert.equal(profile.name, 'Alice Chen');
  assert.equal(normalizeProfileName(' A   B '), 'A B');
});

test('rejects empty and overly long profile names', () => {
  assert.throws(
    () => createUserProfile({ name: '   ' }),
    /不能为空/,
  );
  assert.throws(
    () => createUserProfile({ name: 'a'.repeat(25) }),
    /最多 24/,
  );
});

test('selects distinct local players when an AI game has one human side', () => {
  const alice = createUserProfile({
    createdAt: '2026-06-12T00:00:00.000Z',
    id: 'profile-alice',
    name: 'Alice',
  });
  const bob = createUserProfile({
    createdAt: '2026-06-12T00:00:00.000Z',
    id: 'profile-bob',
    name: 'Bob',
  });

  const selection = selectDistinctPlayerProfiles(
    [alice, bob],
    null,
    alice.id,
  );

  assert.equal(selection.whiteId, alice.id);
  assert.equal(selection.blackId, bob.id);
});
