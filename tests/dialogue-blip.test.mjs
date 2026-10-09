import assert from 'node:assert/strict';
import test from 'node:test';
import { initialDialogueBlipCursor, stepDialogueBlip } from '../app/dialogue-blip.ts';

function run(text, lineId = 'line-1', start = 0, interval = 28, previous = initialDialogueBlipCursor) {
  let cursor = previous;
  const played = [];
  for (let index = 0; index < text.length; index++) {
    const result = stepDialogueBlip(cursor, text[index], index, lineId, start + index * interval);
    cursor = result.cursor;
    if (result.variant !== null) played.push({ index, variant: result.variant });
  }
  return { cursor, played };
}

test('dialogue blips play sparsely and cycle three original variants', () => {
  assert.deepEqual(run('你好世界文字测试对白').played, [
    { index: 0, variant: 0 }, { index: 3, variant: 1 },
    { index: 6, variant: 2 }, { index: 9, variant: 0 },
  ]);
});

test('punctuation, whitespace and symbols rest without changing the three-character cadence', () => {
  assert.deepEqual(run('你，好！ a❤bc').played, [
    { index: 0, variant: 0 }, { index: 7, variant: 1 },
  ]);
});

test('the minimum interval suppresses dense blips without queuing them', () => {
  assert.deepEqual(run('abcdefghij', 'fast', 0, 12).played, [
    { index: 0, variant: 0 }, { index: 9, variant: 1 },
  ]);
});

test('new lines and replaying the same line restart the voice', () => {
  const first = run('你好世界');
  assert.deepEqual(run('再见', 'line-2', 10, 28, first.cursor).played, [{ index: 0, variant: 0 }]);
  assert.deepEqual(run('你好', 'line-1', 10, 28, first.cursor).played, [{ index: 0, variant: 0 }]);
});
