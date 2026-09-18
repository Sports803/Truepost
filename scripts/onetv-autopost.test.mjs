import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOneBallPlayerUrl, oneBallPageUrl, parseOneTV } from './onetv-autopost.mjs';

test('Oneball live page links are unencoded player one links', () => {
  const page = oneBallPageUrl('4550665', 'live');
  assert.equal(page, 'https://oneball.live/live/4550665.html');
  assert.equal(buildOneBallPlayerUrl(page), 'https://sports803.github.io/player/?one=https://oneball.live/live/4550665.html');
});

test('Oneball replay links preserve the replay page path', () => {
  const page = oneBallPageUrl('4565413', 'replay');
  assert.equal(buildOneBallPlayerUrl(page), 'https://sports803.github.io/player/?one=https://oneball.live/replay/4565413.html');
});

test('Oneball live card parsing stores the page URL separately from the HLS metadata URL', () => {
  const html = `<a class="match-card" data-match-id="4550665" data-match-time="2026-09-19T12:00:00Z"><span class="team-home"><span class="team-name">Home FC</span></span><span class="team-away"><span class="team-name">Away FC</span></span><span class="league-badge">Test League</span></a>`;
  const [item] = parseOneTV(html);
  assert.equal(item.pageUrl, 'https://oneball.live/live/4550665.html');
  assert.equal(item.playerUrl, 'https://sports803.github.io/player/?one=https://oneball.live/live/4550665.html');
  assert.match(item.streamUrl, /\.m3u8$/);
});
