import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const SOURCE_URL = process.env.ONETV_SOURCE_URL || 'https://oneball.live/';
const REPLAY_URL = 'https://oneball.live/replay/';
const PPVTV_MATCHES_API = process.env.PPVTV_MATCHES_API || 'https://august.ppvtv.icu/api/matches.json';
const PLAYER_BASE_URL = process.env.PLAYER_BASE_URL || 'https://sports803.github.io/player/';
const STREAM_BASE_URL = process.env.ONETV_STREAM_BASE_URL || 'https://hls.live123.fans/live/';
const BLOGGER_API = 'https://www.googleapis.com/blogger/v3';
const BLOGGER_BLOG_ID = process.env.BLOGGER_BLOG_ID || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.BLOGGER_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.BLOGGER_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || process.env.BLOGGER_REFRESH_TOKEN || '';
const IMGBB_KEY = process.env.IMGBB_KEY || '';
const FIREBASE_DATABASE_URL = (process.env.FIREBASE_DATABASE_URL || 'https://sports-803-1b806-default-rtdb.firebaseio.com').replace(/^http:\/\//i, 'https://').replace(/\/$/, '');
const FIREBASE_PATH = (process.env.FIREBASE_EVENTS_PATH || 's803config/todaysMatches').replace(/^\/+|\/+$/g, '');
const AUTOMATION_BLOGGER_POSTS_PATH = (process.env.AUTOMATION_BLOGGER_POSTS_PATH || 'automation/bloggerPosts').replace(/^\/+|\/+$/g, '');
const FIREBASE_PUBLIC_WRITE = String(process.env.FIREBASE_PUBLIC_WRITE || '').toLowerCase() === 'true';
const POST_LOG_PATH = process.env.POST_LOG_PATH || new URL('../data/onetv-posted.json', import.meta.url).pathname;
const BATCH_LIMIT = Math.max(1, Number.parseInt(process.env.MAX_POSTS_PER_RUN || process.env.AUTOPOST_BATCH_LIMIT || '10', 10));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const htmlDecode = value => (value || '')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x2F;/g, '/');
const stripTags = value => htmlDecode((value || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const attr = (tag, name) => {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? htmlDecode(match[1]).trim() : '';
};
const innerByClass = (html, classPattern) => {
  const re = new RegExp(`<[^>]*class=["'][^"']*${classPattern}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i');
  const match = html.match(re);
  return match ? stripTags(match[1]) : '';
};
const imageByClass = (html, classPattern) => {
  const section = html.match(new RegExp(`<[^>]*class=["'][^"']*${classPattern}[^"']*["'][^>]*>[\\s\\S]*?<\\/[^>]+>`, 'i'))?.[0] || '';
  const match = section.match(/<img\b[^>]*(?:src|data-src|data-lazy-src)=["']([^"']+)["'][^>]*>/i);
  return match ? htmlDecode(match[1]).trim() : '';
};

function parseDate(value) {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeTeamName(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b(fc|afc|rfc|sc|cf|ac|as|bsc|rcd|rgb|vfb|vfl|1\.fc|club|calcio|ud|cd|sd|real|deportivo|atletico|sporting|clube|associacao)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function pairKey(home, away) {
  return [normalizeTeamName(home), normalizeTeamName(away)].sort().join('|');
}

function parseOneTV(html) {
  const results = [];
  const seen = new Set();
  const cardRe = /<a[^>]*(?:class=["'][^"']*match-card[^"']*["']|data-match-id=["'][^"']+["'])[^>]*>[\s\S]*?<\/a>/gi;
  let match;
  while ((match = cardRe.exec(html)) !== null) {
    const block = match[0];
    const opening = block.slice(0, block.indexOf('>') + 1);
    const id = attr(opening, 'data-match-id') || attr(block, 'data-id') || (attr(opening, 'href').match(/\/(\d+)\.html/i)?.[1] || '');
    if (!id || seen.has(id)) continue;
    const homeBlock = block.match(/<[^>]*(?:class=["'][^"']*(?:team-home|home-team)[^"']*["']|data-side=["']home["'])[^>]*>[\s\S]*?<\/[^>]+>/i)?.[0] || '';
    const awayBlock = block.match(/<[^>]*(?:class=["'][^"']*(?:team-away|away-team)[^"']*["']|data-side=["']away["'])[^>]*>[\s\S]*?<\/[^>]+>/i)?.[0] || '';
    const readNamedTeam = (side, fallback) => {
      const named = block.match(new RegExp(`class=["'][^"']*team-${side}[^"']*["'][\\s\\S]*?class=["'][^"']*team-name[^"']*["']>([^<]+)<`, 'i'));
      return (named?.[1] || innerByClass(fallback, 'team-name|name') || attr(fallback, 'data-team-name') || stripTags(fallback)).trim();
    };
    const homeName = readNamedTeam('home', homeBlock);
    const awayName = readNamedTeam('away', awayBlock);
    if (!homeName || !awayName) continue;
    const league = innerByClass(block, 'league-badge') || attr(opening, 'data-league') || 'OneTV';
    const date = parseDate(attr(opening, 'data-match-time') || attr(opening, 'data-time'));
    const streamUrl = `${STREAM_BASE_URL.replace(/\/$/, '')}/${encodeURIComponent(id)}.m3u8`;
    const playerUrl = buildPlayerUrl(streamUrl);
    seen.add(id);
    results.push({
      oneballId: id,
      homeName,
      awayName,
      league,
      date: date.toISOString(),
      streamUrl,
      playerUrl,
      homeLogo: imageByClass(block, 'team-home|home-team'),
      awayLogo: imageByClass(block, 'team-away|away-team')
    });
  }
  return results.sort((a, b) => new Date(a.date) - new Date(b.date));
}

async function fetchOneBallReplays() {
  try {
    const response = await fetch(REPLAY_URL, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`OneBall Replay list ${response.status}`);
    const html = await response.text();
    const results = [];
    // Updated regex to better match the card structure
    const cardRe = /<a[^>]+href=["'](\/replay\/\d+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = cardRe.exec(html)) !== null) {
      const href = match[1];
      const inner = match[2];
      const id = href.match(/(\d+)\.html/)?.[1];
      if (!id) continue;
      
      const homeM = inner.match(/class=["']team-home["'][^>]*>([\s\S]*?)<\/div>/i) || inner.match(/class=["']left-team["'][^>]*>([\s\S]*?)<\/span>/i);
      const awayM = inner.match(/class=["']team-away["'][^>]*>([\s\S]*?)<\/div>/i) || inner.match(/class=["']right-team["'][^>]*>([\s\S]*?)<\/span>/i);
      
      if (!homeM || !awayM) continue;
      const homeName = stripTags(homeM[1]);
      const awayName = stripTags(awayM[1]);
      const key = pairKey(homeName, awayName);
      results.push({ id, homeName, awayName, key, url: new URL(href, SOURCE_URL).href });
    }
    console.log(`[REPLAY] Found ${results.length} replay cards`);
    return results;
  } catch (error) {
    console.warn(`[REPLAY] ${error.message}`);
    return [];
  }
}

async function fetchReplayStream(replayUrl) {
  try {
    const response = await fetch(replayUrl, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Replay page ${response.status}`);
    const html = await response.text();
    // Match data-url attribute which contains the m3u8 stream
    const m = html.match(/data-url=["']([^"']+)["']/);
    if (m) {
      const rawUrl = htmlDecode(m[1]);
      if (rawUrl.startsWith('http')) {
        console.log(`[REPLAY-STREAM] Found stream for ${replayUrl}`);
        return rawUrl;
      }
    }
    return null;
  } catch (error) {
    console.warn(`[REPLAY-STREAM] ${error.message}`);
    return null;
  }
}

async function readLog() {
  try { return JSON.parse(await fs.readFile(POST_LOG_PATH, 'utf8')); } catch { return {}; }
}
async function writeLog(log) {
  await fs.writeFile(POST_LOG_PATH, `${JSON.stringify(log, null, 2)}\n`, 'utf8');
}

function stableKey(item) {
  return `${normalizeTeamName(item.homeName)}|${normalizeTeamName(item.awayName)}|${new Date(item.date).toISOString().slice(0, 16)}`.replace(/[^a-z0-9|:-]+/g, '-');
}

function buildPlayerUrl(streamUrl, embedUrls = []) {
  const base = PLAYER_BASE_URL.replace(/\/$/, '');
  const params = [];
  if (streamUrl) params.push(`mora=${encodeURIComponent(streamUrl)}`);
  for (const url of [...new Set(embedUrls.filter(Boolean))]) params.push(`embed=${encodeURIComponent(url)}`);
  return params.length ? `${base}/?${params.join('&')}` : '';
}

async function loadPPVTVMatches() {
  try {
    const response = await fetch(PPVTV_MATCHES_API, { headers: { 'user-agent': 'Sports803-Truepost/1.0' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`PPVTV ${response.status}`);
    const payload = await response.json();
    const map = {};
    for (const match of Array.isArray(payload?.matches) ? payload.matches : []) {
      const home = match?.teams?.home?.name || '', away = match?.teams?.away?.name || '';
      if (!home || !away) continue;
      const embeds = [match.embed_url, ...(Array.isArray(match.servers) ? match.servers.map(server => server?.embed_url) : [])].filter(url => /^https?:\/\//i.test(String(url || '')));
      if (embeds.length) {
        const key = pairKey(home, away);
        map[key] = [...new Set([...(map[key] || []), ...embeds])];
      }
    }
    return map;
  } catch (error) {
    console.warn(`[PPVTV] ${error.message}`);
    return {};
  }
}

async function firebaseRequest(path, options = {}) {
  if (!FIREBASE_DATABASE_URL) return null;
  const token = FIREBASE_PUBLIC_WRITE ? '' : await firebaseAccessToken();
  const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${FIREBASE_DATABASE_URL}/${path.replace(/^\/+|\/+$/g, '')}.json`, { ...options, headers });
  const body = await response.text();
  if (!response.ok) throw new Error(`Firebase ${response.status}: ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
}

async function readAutomationLedger() {
  try { return (await firebaseRequest(AUTOMATION_BLOGGER_POSTS_PATH)) || {}; } catch (error) { console.warn(`[FIREBASE] Automation ledger unavailable: ${error.message}`); return {}; }
}
async function writeAutomationRecord(key, record) {
  try { await firebaseRequest(`${AUTOMATION_BLOGGER_POSTS_PATH}/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify(record) }); } catch (error) { console.warn(`[FIREBASE] Could not write automation ledger: ${error.message}`); }
}

async function refreshAccessToken() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) throw new Error('Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, refresh_token: GOOGLE_REFRESH_TOKEN, grant_type: 'refresh_token' })
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Google OAuth ${response.status}: ${body.slice(0, 300)}`);
  return JSON.parse(body).access_token;
}

async function uploadThumbnail(cvDataUrl) {
  if (!IMGBB_KEY) return cvDataUrl; // Return base64 if no key
  try {
    const fd = new URLSearchParams();
    fd.append('key', IMGBB_KEY);
    fd.append('image', cvDataUrl.split(',')[1]);
    const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: fd });
    const json = await res.json();
    if (json.success) return json.data.url;
    return cvDataUrl; // Fallback to base64
  } catch (e) {
    return cvDataUrl; // Fallback to base64
  }
}

async function postToBlogger(item, accessToken) {
  if (!BLOGGER_BLOG_ID) throw new Error('Missing BLOGGER_BLOG_ID');
  
  let content = `<h2>${escapeHtml(item.homeName)} vs ${escapeHtml(item.awayName)} — Live Stream</h2>\n<p><strong>Competition:</strong> ${escapeHtml(item.league)}<br><strong>Watch it live below.</strong></p>\n<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;background:#000;margin:16px 0;"><iframe src="${escapeHtml(item.playerUrl)}" allow="encrypted-media; fullscreen" allowfullscreen sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" loading="lazy"></iframe></div>\n<p>Live stream provided through Sports 803. If one server is slow, use the player alternatives.</p>`;
  
  if (item.replayPlayerUrl) {
    content += `\n<h2>Match Highlights / Replay</h2>\n<p>Missed the action? Watch the full match highlights and replay here.</p>\n<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;background:#000;margin:16px 0;"><iframe src="${escapeHtml(item.replayPlayerUrl)}" allow="encrypted-media; fullscreen" allowfullscreen sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" loading="lazy"></iframe></div>`;
  }

  const response = await fetch(`${BLOGGER_API}/blogs/${encodeURIComponent(BLOGGER_BLOG_ID)}/posts`, {
    method: 'POST', headers: { 'authorization': `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ title: `${item.homeName} vs ${item.awayName} – ${item.league} Live Stream`, content, labels: ['sports', 'live', 'onetv', item.league].filter(Boolean), status: 'LIVE' })
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Blogger ${response.status}: ${body.slice(0, 300)}`);
  return JSON.parse(body);
}

function base64url(value) { return Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }
async function firebaseAccessToken() {
  if (FIREBASE_PUBLIC_WRITE) return '';
  if (process.env.FIREBASE_AUTH_TOKEN) return process.env.FIREBASE_AUTH_TOKEN;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Missing FIREBASE_AUTH_TOKEN or FIREBASE_SERVICE_ACCOUNT_JSON');
  const account = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(JSON.stringify({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${claim}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(account.private_key, 'base64');
  const jwt = `${unsigned}.${signature.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
  const body = await response.text();
  if (!response.ok) throw new Error(`Firebase OAuth ${response.status}: ${body.slice(0, 300)}`);
  return JSON.parse(body).access_token;
}

async function pushToFirebase(item, bloggerPost) {
  if (!FIREBASE_DATABASE_URL) return { skipped: true };
  const kickoff = new Date(item.date);
  const channels = [{ label: 'OneTV', src: item.playerUrl, streamUrl: item.streamUrl, health: 'UNKNOWN', status: 'unknown' }];
  if (item.replayPlayerUrl) {
    channels.push({ label: 'Match Highlights', src: item.replayPlayerUrl, streamUrl: item.replayStreamUrl, health: 'ONLINE', status: 'online' });
  }
  const payload = {
    id: `auto_${item.oneballId}`,
    title: `${item.homeName} vs ${item.awayName} – ${item.league} Live`,
    league: item.league,
    leagueName: item.league,
    kickoff: kickoff.toISOString(),
    home: { name: item.homeName, logo: item.homeLogo || '' },
    away: { name: item.awayName, logo: item.awayLogo || '' },
    channels,
    status: 'Scheduled',
    type: 'match',
    postUrl: bloggerPost?.url || '',
    postId: bloggerPost?.id || '',
    replayUrl: item.replayPlayerUrl || ''
  };
  await firebaseRequest(`${FIREBASE_PATH}/auto_${item.oneballId}`, { method: 'PUT', body: JSON.stringify(payload) });
  return { skipped: false };
}

async function main() {
  console.log(`[START] Autoposter Run: ${new Date().toISOString()}`);
  const log = await readLog();
  const automationLedger = await readAutomationLedger();
  const bloggerToken = await refreshAccessToken();
  
  const response = await fetch(SOURCE_URL, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`OneBall Source ${response.status}`);
  const html = await response.text();
  const candidates = parseOneTV(html);
  console.log(`[ONETV] Found ${candidates.length} candidate matches`);
  
  const ppvTVMatches = await loadPPVTVMatches();
  const replays = await fetchOneBallReplays();
  
  let postedCount = 0;
  for (const item of candidates) {
    if (postedCount >= BATCH_LIMIT) break;
    
    const key = stableKey(item);
    if (log[item.oneballId] || automationLedger[key]?.status === 'posted') continue;
    
    const pKey = pairKey(item.homeName, item.awayName);
    try {
      const embedUrls = ppvTVMatches[pKey] || [];
      const replay = replays.find(r => r.key === pKey);
      let replayStreamUrl = null;
      let replayPlayerUrl = null;
      
      if (replay) {
        replayStreamUrl = await fetchReplayStream(replay.url);
        if (replayStreamUrl) {
          // Use the exact mora format requested: https://sports803.github.io/player/?mora=URL_ENCODED_STREAM
          replayPlayerUrl = `${PLAYER_BASE_URL.replace(/\/$/, '')}/?mora=${encodeURIComponent(replayStreamUrl)}`;
        }
      }
      
      const publishItem = { 
        ...item, 
        embedUrls, 
        playerUrl: buildPlayerUrl(item.streamUrl, embedUrls),
        replayStreamUrl,
        replayPlayerUrl
      };
      
      const post = await postToBlogger(publishItem, bloggerToken);
      const firebase = await pushToFirebase(publishItem, post);
      const postedAt = new Date().toISOString();
      log[item.oneballId] = { title: `${item.homeName} vs ${item.awayName}`, date: item.date, bloggerPostId: post.id || '', bloggerUrl: post.url || '', firebase: !firebase.skipped, postedAt };
      await writeLog(log);
      await writeAutomationRecord(key, { status: 'posted', eventKey: `auto_${item.oneballId}`, matchId: item.oneballId, oneballId: item.oneballId, bloggerPostId: post.id || '', bloggerUrl: post.url || '', kickoff: item.date, title: `${item.homeName} vs ${item.awayName}`, updatedAt: Date.now() });
      console.log(`Posted ${item.oneballId}: ${item.homeName} vs ${item.awayName}${replayPlayerUrl ? ' (with highlights)' : ''}`);
      postedCount++;
      await sleep(500);
    } catch (error) {
      console.error(`Failed ${item.oneballId}: ${error.message}`);
    }
  }
  console.log(`[DONE] Posted ${postedCount} matches`);
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}

export { parseOneTV, buildPlayerUrl, pairKey, loadPPVTVMatches };
