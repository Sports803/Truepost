import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const html = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');

test('dashboard keeps canonical unencoded OneBall URL contracts', () => {
  assert.match(html, /function oneBallUrlFor\(matchId, kind = 'live'\)/);
  assert.match(html, /return page \? playerBaseUrl\(\) \+ '\?one=' \+ page/);
  assert.match(html, /if \(one\?\.url\) params\.push\('one=' \+ one\.url\)/);
  assert.match(html, /type: 'one'/);
  assert.match(html, /function canonicalOneBallReplayUrl\(url\)/);
  assert.match(html, /return 'https:\/\/oneball\.live\/replay\/' \+ id \+ '\.html'/);
});

test('dashboard exposes cloud post-log and OneBall lookup persistence', () => {
  assert.match(html, /EVENT_FIREBASE_POST_LOG_PATH = 's803config\/postLog'/);
  assert.match(html, /EVENT_FIREBASE_ONEBALL_PATH = 's803config\/oneball'/);
  assert.match(html, /onclick="syncPostLogFromCloud\(\)"/);
  assert.match(html, /onclick="pushPostLogToCloud\(\)"/);
  assert.match(html, /function persistOneBallLookup\(matchId/);
  assert.match(html, /function getOneBallLookup\(matchId\)/);
  assert.match(html, /const post=pl\?\.postId \? await updateExistingPost/);
});
