(() => {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const get = id => document.getElementById(id);
  const value = id => get(id)?.value?.trim() || '';
  const status = message => { const el = get('post-template-status'); if (el) el.textContent = message; };
  const notify = (message, type = 'i') => { if (typeof window.toast === 'function') window.toast(message, type); };
  const bodyEl = () => get('post-body');
  const append = html => { const body = bodyEl(); if (!body) return; body.value += (body.value ? '\n\n' : '') + html; if (typeof window.updateSEO === 'function') window.updateSEO(); };

  const ESPN_LEAGUES = [
    { test: /champions league|\bucl\b/i, sport: 'soccer', league: 'uefa.champions' },
    { test: /europa league/i, sport: 'soccer', league: 'uefa.europa' },
    { test: /premier league|\bepl\b/i, sport: 'soccer', league: 'eng.1' },
    { test: /efl championship|championship/i, sport: 'soccer', league: 'eng.2' },
    { test: /league one|efl league one/i, sport: 'soccer', league: 'eng.3' },
    { test: /league two|efl league two/i, sport: 'soccer', league: 'eng.4' },
    { test: /la ?liga/i, sport: 'soccer', league: 'esp.1' },
    { test: /serie a/i, sport: 'soccer', league: 'ita.1' },
    { test: /bundesliga/i, sport: 'soccer', league: 'ger.1' },
    { test: /ligue 1/i, sport: 'soccer', league: 'fra.1' },
    { test: /\bmls\b/i, sport: 'soccer', league: 'usa.1' },
    { test: /world cup/i, sport: 'soccer', league: 'fifa.world' },
    { test: /\bnba\b/i, sport: 'basketball', league: 'nba' },
    { test: /\bnfl\b/i, sport: 'football', league: 'nfl' },
    { test: /\bmlb\b/i, sport: 'baseball', league: 'mlb' },
    { test: /\bnhl\b/i, sport: 'hockey', league: 'nhl' },
    { test: /\bufc\b|\bmma\b/i, sport: 'mma', league: 'ufc' },
    { test: /\bwta\b/i, sport: 'tennis', league: 'wta' },
    { test: /\batp\b|tennis/i, sport: 'tennis', league: 'atp' },
    { test: /\bpga\b|golf/i, sport: 'golf', league: 'pga' }
  ];

  const TEMPLATES = {
    preview: {
      team: '<h2>Match Preview: {homeName} vs {awayName}</h2><p>Anticipation is building as <strong>{homeName}</strong> prepare to host <strong>{awayName}</strong> in a {league} fixture that could shape the standings. Both sides arrive with plenty to play for, and neither will want to give up an early advantage.</p><p><!--if:homeLogo--><img src="{homeLogo}" alt="{homeName}" style="height:44px;border-radius:50%;vertical-align:middle;margin-right:6px;"/><!--endif-->{homeName} look to build on recent momentum, while <!--if:awayLogo--><img src="{awayLogo}" alt="{awayName}" style="height:44px;border-radius:50%;vertical-align:middle;margin:0 6px;"/><!--endif-->{awayName} look for a result to keep their campaign on track.</p><ul><li>Competition: {league}</li><li>Kickoff: {date} at {time}</li><!--if:venue--><li>Venue: {venue}</li><!--endif--><li>Live streaming links are available below</li></ul><p>Stay with us for team news, lineup updates, and every twist as {homeName} and {awayName} go head to head.</p>',
      racing: '<h2>Race Preview: {homeName}</h2><p>All eyes turn to <strong>{homeName}</strong> as the {league} weekend approaches, with drivers and teams fine-tuning strategy ahead of lights out. Expect a tightly fought session as competitors chase every fraction of a second.</p><p><!--if:homeLogo--><img src="{homeLogo}" alt="{homeName}" style="height:48px;border-radius:50%;vertical-align:middle;margin-right:8px;"/><!--endif-->Track conditions, tyre strategy, and qualifying pace will all play a role in how the {league} weekend unfolds.</p><ul><li>Event: {league}</li><li>Session start: {date} at {time}</li><!--if:venue--><li>Circuit: {venue}</li><!--endif--><li>Live streaming links are available below</li></ul><p>Stick around for build-up coverage, session results, and live streaming details for {homeName}.</p>'
    },
    howtowatch: {
      team: '<h2>How to Watch: {homeName} vs {awayName}</h2><p>Looking for the best way to catch <strong>{homeName}</strong> take on <strong>{awayName}</strong> in this {league} clash? We have you covered with reliable live streaming options so you never miss a moment of the action.</p><p>The match kicks off on <strong>{date} at {time}</strong><!--if:venue--> at {venue}<!--endif-->. Check local listings alongside the streaming links below.</p><ul><li>Step 1: Scroll up and choose a stream button above</li><li>Step 2: Select your preferred server or quality</li><li>Step 3: Enjoy {homeName} vs {awayName} live where available</li></ul><p>Bookmark this page and return closer to kickoff, as stream links are refreshed regularly throughout the {league} fixture.</p>',
      racing: '<h2>How to Watch: {homeName}</h2><p>Want to catch every lap of <strong>{homeName}</strong> live? Here is the simplest way to stream the {league} action without missing a single overtake, pit stop, or podium celebration.</p><p>Coverage begins on <strong>{date} at {time}</strong><!--if:venue--> from {venue}<!--endif-->. Check local listings in addition to the streaming links provided.</p><ul><li>Step 1: Scroll up and pick a stream button above</li><li>Step 2: Choose your preferred server or quality</li><li>Step 3: Enjoy {homeName} live where available</li></ul><p>Bookmark this page and check back before lights out for refreshed links.</p>'
    },
    faq: {
      team: '<h2>Frequently Asked Questions</h2><p><strong>What time does {homeName} vs {awayName} kick off?</strong><br/>The match is scheduled to begin on {date} at {time}<!--if:venue--> at {venue}<!--endif-->, though local broadcast times may vary.</p><p><strong>Where can I watch {homeName} vs {awayName} live?</strong><br/>Use the streaming links provided above or check official {league} broadcast partners in your country.</p><p><strong>Is the {league} stream free?</strong><br/>Availability, quality, and access can vary by server and location.</p><p><strong>Will highlights be available afterward?</strong><br/>A recap section can be updated once {homeName} vs {awayName} has concluded.</p>',
      racing: '<h2>Frequently Asked Questions</h2><p><strong>What time does the {league} session for {homeName} start?</strong><br/>Coverage begins on {date} at {time}<!--if:venue--> from {venue}<!--endif-->.</p><p><strong>Where can I watch {homeName} live?</strong><br/>Use the streaming links provided above or check official {league} broadcast partners.</p><p><strong>Is the {league} stream free?</strong><br/>Availability, quality, and access can vary by server and location.</p><p><strong>Will highlights be available afterward?</strong><br/>A recap can be added after the session concludes.</p>'
    },
    cta: {
      team: '<h2>Watch {homeName} vs {awayName} Live Now</h2><p>Do not miss a single moment of this {league} showdown between <strong>{homeName}</strong> and <strong>{awayName}</strong>. Scroll up and tap one of the stream buttons above to start watching where available.</p><p><!--if:homeLogo--><img src="{homeLogo}" alt="{homeName}" style="height:40px;border-radius:50%;vertical-align:middle;margin-right:6px;"/><!--endif--><!--if:awayLogo--><img src="{awayLogo}" alt="{awayName}" style="height:40px;border-radius:50%;vertical-align:middle;margin-right:6px;"/><!--endif-->Kickoff is set for <strong>{date} at {time}</strong><!--if:venue--> at {venue}<!--endif-->.</p><ul><li>Multiple servers if one is slow</li><li>Mobile and desktop friendly players</li><li>Links are refreshed as availability changes</li></ul><p>Share this page with fellow fans so nobody misses {homeName} vs {awayName} live.</p>',
      racing: '<h2>Watch {homeName} Live Now</h2><p>Do not miss a single lap of this {league} action featuring <strong>{homeName}</strong>. Scroll up and tap a stream button to start watching where available.</p><p><!--if:homeLogo--><img src="{homeLogo}" alt="{homeName}" style="height:40px;border-radius:50%;vertical-align:middle;margin-right:6px;"/><!--endif-->Coverage begins on <strong>{date} at {time}</strong><!--if:venue--> at {venue}<!--endif-->.</p><ul><li>Multiple servers if one is slow</li><li>Mobile and desktop friendly players</li><li>Links are refreshed as availability changes</li></ul>'
    },
    highlights: {
      team: '<h2>Highlights &amp; Recap: {homeName} vs {awayName}</h2><!--if:liveFound--><p><strong>Final/live score (ESPN):</strong> {liveScoreLine}</p><!--endif-->{goalsList}<p>The {league} clash between <strong>{homeName}</strong> and <strong>{awayName}</strong> delivered plenty of talking points from kickoff to the final whistle on {date}. This recap can be updated as results develop.</p><ul><li>Key moments and turning points</li><li>Standout performers</li><li>Final score and match statistics</li><li>Post-match reaction</li></ul><p>Check back for confirmed highlights and a verified final score once the fixture concludes.</p>',
      racing: '<h2>Highlights &amp; Recap: {homeName}</h2><p>The {league} session featuring <strong>{homeName}</strong> delivered plenty of talking points on {date}. This recap can be updated as results are confirmed.</p><ul><li>Key overtakes and turning points</li><li>Standout performance from {homeName}</li><li>Final classification and session statistics</li><li>Post-session reaction</li></ul><p>Check back for confirmed highlights after the chequered flag.</p>'
    }
  };

  const SECTION_TEMPLATES = {
    overview: '<h2>Match Overview: {homeName} vs {awayName}</h2>{overviewContent}',
    details: '<h2>Match Details</h2><table style="width:100%;border-collapse:collapse;max-width:640px;"><tbody><tr><td style="padding:8px 12px;font-weight:700;">Date &amp; Time</td><td style="padding:8px 12px;">{date} at {time}</td></tr><tr><td style="padding:8px 12px;font-weight:700;">Competition</td><td style="padding:8px 12px;">{league}</td></tr>{venueRow}</tbody></table>',
    form: '<h2>Team Form: Last 5</h2>{formContent}',
    h2h: '<h2>Head-to-Head</h2>{h2hContent}',
    keyPlayers: '<h2>Key Players to Watch</h2>{keyPlayersContent}',
    analysis: '<h2>Match Analysis</h2><p>{analysisText}</p>',
    liveEvents: '<h2>Live Match Events</h2>{liveEventsContent}',
    result: '<h2>Full-Time Result</h2>{resultContent}',
    recap: '<h2>Detailed Recap: {homeName} vs {awayName}</h2>{recapContent}',
    stats: '<h2>Match Statistics</h2>{statsContent}',
    implications: '<h2>What This Result Means</h2><p>{implicationsText}</p>',
    related: '<h2>Related Articles</h2>{relatedContent}'
  };

  let liveStats = null;
  let liveStatsKey = '';

  function getTemplateData() {
    const title = value('post-title') || 'Home Team vs Away Team';
    const match = title.match(/^(.*?)\s+vs\.?\s+(.*?)(?:\s*[\u2013\u2014-]\s*.*)?$/i);
    const homeName = (match ? match[1] : title).trim() || 'Home Team';
    const awayName = match ? match[2].trim() : '';
    const dateTime = value('post-datetime') || value('c-datetime') || value('cfg-datetime');
    const parts = dateTime.split(/\s+/).filter(Boolean);
    return { homeName, awayName, league: value('post-league') || value('c-league') || 'League', date: parts[0] || 'TBC', time: parts.slice(1).join(' ') || 'TBC', venue: value('post-venue'), homeLogo: value('c-home-logo'), awayLogo: value('c-away-logo'), isRacing: !awayName };
  }

  function fillPlaceholders(template, data) {
    return String(template || '').replace(/<!--if:([\w]+)-->([\s\S]*?)<!--endif-->/g, (_, key, inner) => data[key] ? inner : '')
      .replace(/\{homeName\}/g, esc(data.homeName)).replace(/\{awayName\}/g, esc(data.awayName)).replace(/\{league\}/g, esc(data.league)).replace(/\{date\}/g, esc(data.date)).replace(/\{time\}/g, esc(data.time)).replace(/\{venue\}/g, esc(data.venue)).replace(/\{homeLogo\}/g, esc(data.homeLogo)).replace(/\{awayLogo\}/g, esc(data.awayLogo)).replace(/\{liveScoreLine\}/g, data.liveScoreLine || '').replace(/\{goalsList\}/g, data.goalsList || '');
  }

  function resolveLeague(league) { return ESPN_LEAGUES.find(item => item.test.test(league || '')) || null; }
  function dateForEspn(date) {
    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) return `${parsed.getFullYear()}${String(parsed.getMonth() + 1).padStart(2, '0')}${String(parsed.getDate()).padStart(2, '0')}`;
    const m = String(date || '').match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/); return m ? `${m[1]}${String(m[2]).padStart(2, '0')}${String(m[3]).padStart(2, '0')}` : '';
  }

  async function fetchLiveStats(force = false) {
    const d = getTemplateData();
    const key = `${d.homeName}|${d.awayName}|${d.league}|${d.date}`;
    if (!force && liveStats && liveStatsKey === key) return liveStats;
    const resolved = resolveLeague(d.league);
    if (!resolved || d.isRacing) { liveStats = { found: false, reason: 'unsupported-league' }; liveStatsKey = key; status(`ESPN data is unavailable for ${d.league}; templates will use general wording.`); return liveStats; }
    status(`Looking up ${d.homeName} vs ${d.awayName} on ESPN…`);
    const date = dateForEspn(d.date);
    const endpoint = `https://site.api.espn.com/apis/site/v2/sports/${resolved.sport}/${resolved.league}/scoreboard${date ? `?dates=${date}` : ''}`;
    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const homeKey = norm(d.homeName), awayKey = norm(d.awayName);
      const found = (data.events || []).map(event => ({ event, comp: event.competitions?.[0] })).find(item => {
        const names = (item.comp?.competitors || []).map(c => norm(c.team?.displayName));
        return names.some(n => n.includes(homeKey) || homeKey.includes(n)) && names.some(n => n.includes(awayKey) || awayKey.includes(n));
      });
      if (!found) { liveStats = { found: false, reason: 'no-match' }; liveStatsKey = key; status('Fixture not found on ESPN for the supplied date; general wording will be used.'); return liveStats; }
      const home = found.comp.competitors.find(c => c.homeAway === 'home') || found.comp.competitors[0];
      const away = found.comp.competitors.find(c => c.homeAway === 'away') || found.comp.competitors[1];
      liveStats = { found: true, eventId: found.event.id, status: found.event.status?.type?.state === 'post' ? 'STATUS_FINAL' : found.event.status?.type?.state === 'in' ? 'STATUS_LIVE' : 'STATUS_SCHEDULED', statusText: found.event.status?.type?.description || 'Scheduled', homeName: home?.team?.displayName || d.homeName, awayName: away?.team?.displayName || d.awayName, homeScore: home?.score || '0', awayScore: away?.score || '0', scorers: [], comp: found.comp };
      try {
        const summary = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${resolved.sport}/${resolved.league}/summary?event=${encodeURIComponent(found.event.id)}`, { signal: AbortSignal.timeout(20000) });
        if (summary.ok) {
          const body = await summary.json();
          const details = body.header?.competitions?.[0]?.details || [];
          liveStats.scorers = details.filter(e => e?.scoringPlay).map(e => `${e.athletesInvolved?.[0]?.displayName || e.type?.text || 'Scoring play'}${e.clock?.displayValue ? ` (${e.clock.displayValue})` : ''}`).slice(0, 12);
          liveStats.summary = body;
        }
      } catch (_) { /* score is still usable when summary is unavailable */ }
      liveStatsKey = key;
      status(`ESPN context loaded: ${liveStats.homeName} ${liveStats.homeScore} – ${liveStats.awayScore} ${liveStats.awayName} (${liveStats.statusText}).`);
      return liveStats;
    } catch (error) {
      liveStats = { found: false, reason: 'fetch-error' }; liveStatsKey = key; status(`Could not reach ESPN (${error.message}); general wording will be used.`); return liveStats;
    }
  }

  function templateDataWithStats() {
    const d = getTemplateData();
    if (liveStats?.found) {
      d.liveFound = true;
      d.liveScoreLine = `${esc(liveStats.homeName)} ${esc(liveStats.homeScore)} – ${esc(liveStats.awayScore)} ${esc(liveStats.awayName)} (${esc(liveStats.statusText)}, via ESPN)`;
      d.goalsList = liveStats.scorers?.length ? `<ul>${liveStats.scorers.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : '';
    }
    return d;
  }

  function insertTemplate(type) {
    const template = TEMPLATES[type]; if (!template) return;
    append(fillPlaceholders(template[getTemplateData().isRacing ? 'racing' : 'team'], templateDataWithStats()));
    notify('Template inserted', 's');
  }

  function buildSection(type) {
    const d = templateDataWithStats();
    const ctx = liveStats?.found ? liveStats : null;
    const score = ctx ? `${esc(ctx.homeName)} ${esc(ctx.homeScore)} – ${esc(ctx.awayScore)} ${esc(ctx.awayName)}` : '';
    const venueRow = d.venue ? `<tr><td style="padding:8px 12px;font-weight:700;">Venue</td><td style="padding:8px 12px;">${esc(d.venue)}</td></tr>` : '';
    const general = `<p><strong>${esc(d.homeName)}</strong> meet <strong>${esc(d.awayName)}</strong> in this ${esc(d.league)} fixture on ${esc(d.date)} at ${esc(d.time)}. Form, tactics, and in-game decisions are likely to shape the contest.</p>`;
    const sections = {
      overview: fillPlaceholders(SECTION_TEMPLATES.overview, {...d, overviewContent: ctx ? `${general}<p>The latest ESPN status is <strong>${esc(ctx.statusText)}</strong>, with the score currently reading <strong>${score}</strong>.</p>` : general}),
      details: fillPlaceholders(SECTION_TEMPLATES.details, {...d, venueRow}),
      form: `<h2>Team Form: Last 5</h2><p>Recent form data will be updated when ESPN supplies the teams’ latest results. ${esc(d.homeName)} and ${esc(d.awayName)} should be assessed alongside league position, injuries, and schedule congestion.</p>`,
      h2h: `<h2>Head-to-Head</h2><p>Previous meetings between <strong>${esc(d.homeName)}</strong> and <strong>${esc(d.awayName)}</strong> add context to this ${esc(d.league)} fixture. The matchup has the ingredients for another closely contested encounter.</p>`,
      keyPlayers: `<h2>Key Players to Watch</h2><p>Watch the principal attacking and defensive players for both sides as ${esc(d.homeName)} and ${esc(d.awayName)} compete for control of the match. Confirmed lineups should be checked before kickoff.</p>`,
      analysis: fillPlaceholders(SECTION_TEMPLATES.analysis, {...d, analysisText: ctx ? `${score} is the current ESPN scoreline. The next tactical adjustment, set piece, or transition could change the balance of this ${d.league} contest.` : `${d.homeName} and ${d.awayName} enter this ${d.league} meeting with different tactical priorities. The opening phase, midfield control, and efficiency in the final third may prove decisive.`}),
      liveEvents: `<h2>Live Match Events</h2>${ctx?.scorers?.length ? `<ul>${ctx.scorers.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : '<p>Live scoring events are not available yet. Use the ESPN refresh button after kickoff to update this section.</p>'}`,
      result: `<h2>Full-Time Result</h2>${ctx?.status === 'STATUS_FINAL' ? `<p><strong>Final score:</strong> ${score}</p>` : '<p>The final result will be available after the match reaches full time. Refresh live data after the final whistle.</p>'}`,
      recap: `<h2>Detailed Recap: ${esc(d.homeName)} vs ${esc(d.awayName)}</h2>${ctx ? `<p>The latest verified ESPN score is <strong>${score}</strong> (${esc(ctx.statusText)}). Add the decisive moments, substitutions, and post-match reaction as the fixture develops.</p>` : general}<p>This recap block is ready for confirmed match events, standout performances, and the final result.</p>`,
      stats: `<h2>Match Statistics</h2>${ctx ? `<table style="width:100%;border-collapse:collapse;max-width:520px;"><tbody><tr><td style="padding:8px 12px;font-weight:700;">Score</td><td style="padding:8px 12px;">${score}</td></tr><tr><td style="padding:8px 12px;font-weight:700;">Status</td><td style="padding:8px 12px;">${esc(ctx.statusText)}</td></tr></tbody></table>` : '<p>Statistics will populate when a matching ESPN fixture is found. Use Fetch Live Score &amp; Goals before inserting this section.</p>'}`,
      implications: `<h2>What This Result Means</h2><p>${ctx?.status === 'STATUS_FINAL' ? `The result of ${esc(d.homeName)} vs ${esc(d.awayName)} will influence confidence, momentum, and the wider ${esc(d.league)} picture.` : `The outcome could shape momentum and the wider ${esc(d.league)} picture for both ${esc(d.homeName)} and ${esc(d.awayName)}.`}</p>`,
      related: `<h2>Related Articles</h2><p>Related ${esc(d.league)} coverage, team news, and future match previews can be linked here once the corresponding Blogger posts are available.</p>`
    };
    return sections[type] || '';
  }

  async function insertSection(type) {
    const liveTypes = ['liveEvents', 'result', 'recap', 'stats', 'implications'];
    if (liveTypes.includes(type)) await fetchLiveStats(true);
    append(buildSection(type));
    notify('Section inserted', 's');
  }

  async function fillAllSections() {
    status('Auto-filling all sections for the current match status…');
    await fetchLiveStats(true);
    const order = ['overview', 'details', 'form', 'h2h', 'keyPlayers', 'analysis', 'liveEvents', 'result', 'recap', 'stats', 'implications', 'related'];
    const body = bodyEl(); if (!body) return;
    body.value = (body.value ? body.value.trim() + '\n\n' : '') + order.map(buildSection).join('\n\n');
    if (typeof window.updateSEO === 'function') window.updateSEO();
    status(liveStats?.found ? 'All sections inserted with the latest ESPN context.' : 'All sections inserted with general wording; refresh after kickoff for live data.');
    notify('All sections auto-filled', 's');
    return liveStats;
  }

  function postTitleChanged() { liveStats = null; liveStatsKey = ''; }

  window.Compose = Object.assign(window.Compose || {}, { TEMPLATES, SECTION_TEMPLATES, getTemplateData, fillPlaceholders, fetchLiveStats, insertTemplate, insertSection, fillAllSections, postTitleChanged });
  window.fetchPostingLiveStats = () => window.Compose.fetchLiveStats(true);
  window.fillPostingSections = () => window.Compose.fillAllSections();
  window.insertPostingTemplate = type => window.Compose.insertTemplate(type);
  window.insertPostingSection = type => window.Compose.insertSection(type);
})();
