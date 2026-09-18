# Sports 803 Truepost

Sports 803 Truepost is a public static sports dashboard based on the supplied `index.html`. It includes the existing events, composition, thumbnail, scheduler, Blogger, and Firebase workflows, together with the reference-style **Live TV Channels** section and OneTV stream aggregation used by the Sports803 Event project.

## Event-compatible configuration

Truepost now uses the same public defaults and database paths as [Sports803/Event](https://github.com/Sports803/Event): the shared Google OAuth client ID is prefilled for browser sign-in, the Firebase Realtime Database defaults to `https://sports-803-1b806-default-rtdb.firebaseio.com`, events use `s803config/todaysMatches`, live channels use `livetv/channels`, the shared post log uses `s803config/postLog`, and OneBall lookups use `s803config/oneball`. The Channels page can load and merge live channel records directly from Firebase.

The reference player route is `https://sports803.github.io/player/`. OneTV-compatible match cards are read from `https://oneball.live/`, normalized by team names and kickoff time, and converted into Sports803 player URLs using the canonical page URL without encoding, for example `https://sports803.github.io/player/?one=https://oneball.live/live/4550665.html`. Highlights always use the replay page form `https://sports803.github.io/player/?one=https://oneball.live/replay/4565413.html`. The original HLS URL is retained only as source metadata and is never published as the player parameter. The optional PPVTV feed remains available as a fallback source. DDKanqu lookups in the dashboard use `https://ddkaqiu.com`.

Settings → Data Management provides **Sync Post Log from Cloud** and **Push Post Log to Cloud** actions. New post-log entries are written to Firebase without blocking the UI; cloud reads merge entries by timestamp, with newer local data preserved. OneBall live and replay IDs are also recorded under the shared lookup node so later devices can reconstruct canonical page and player URLs without relying only on a fresh scrape.

## GitHub Actions autopublishing

`.github/workflows/onetv-autopost.yml` runs every ten minutes and also supports manual dispatch. It follows the reference Event repository’s secret names and publication model: it scans OneTV, skips IDs already recorded locally or under Firebase `automation/bloggerPosts`, publishes up to `MAX_POSTS_PER_RUN` items to Blogger, writes the website-compatible event card to `s803config/todaysMatches`, and records the Blogger result in the shared automation ledger. The local `data/onetv-posted.json` file remains a non-secret fallback ledger and is committed by the workflow after successful runs. Browser-posted IDs are stored in Firebase `s803config/postLog` and remain recoverable across devices.

The workflow uses Node.js 22 and the same `npm run auto-publish` entry-point convention as the reference repository. `FIREBASE_PUBLIC_WRITE` is explicitly disabled; authenticated Firebase access is required for automation runs.

### Editorial quality safeguards

Automated posts are published as match guides rather than stream-only landing pages. Each guide includes verified fixture details, a clearly dated source note, practical viewing instructions, a distinction between official broadcasters and third-party player availability, FAQs, and an editorial note explaining what is known and what is intentionally not claimed. The generator does not invent form, injuries, lineups, statistics, or results. It skips incomplete events that do not have team names, a competition, a scheduled date, and a player URL. This is designed to reduce thin or misleading pages, but it is not a guarantee of AdSense approval: the site still needs genuine ongoing editorial work, clear ownership, useful navigation, and complete privacy/contact/about information.

## Required GitHub Actions secrets

| Secret | Purpose |
| --- | --- |
| `BLOGGER_BLOG_ID` | Target Blogger blog identifier |
| `GOOGLE_CLIENT_ID` | Google OAuth application client ID used by Sports803/Event |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret for the same Google application |
| `GOOGLE_REFRESH_TOKEN` | Long-lived Blogger authorization refresh token |
| `IMGBB_KEY` | ImgBB upload key reserved for thumbnail or inline-image hosting extensions |
| `FIREBASE_DATABASE_URL` | Firebase Realtime Database URL; defaults to the shared Event database when omitted |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Authenticated Firebase service-account JSON |
| `FIREBASE_AUTH_TOKEN` | Optional legacy Firebase REST token alternative |
| `SPORTMONKS_API_TOKEN` | Optional provider lookup token retained for Event-compatible automation configuration |

The OAuth client ID is safe to use in browser-based Google Identity Services, but the client secret, refresh token, Firebase credentials, and ImgBB key must remain GitHub Secrets. They are not copied into this public repository.

Optional repository secrets or variables include `ONETV_SOURCE_URL`, `ONETV_STREAM_BASE_URL`, `PPVTV_MATCHES_API`, `PLAYER_BASE_URL`, `FIREBASE_EVENTS_PATH`, `AUTOMATION_BLOGGER_POSTS_PATH`, and `MAX_POSTS_PER_RUN`. The workflow defaults to the reference Event paths, the PPVTV public feed, and a batch limit of ten.

## Posting templates

The Compose Article Body now includes the full Event-style template system. Static one-click templates include **Match Preview**, **How To Watch**, **FAQ (SEO)**, **Stream CTA**, and **Highlights Recap**. Rich section controls include **Match Overview**, **Match Details**, **Team Form**, **Head-to-Head**, **Key Players**, **Match Analysis**, **Live Match Events**, **Full-Time Result**, **Detailed Recap**, **Match Statistics**, **What This Result Means**, and **Related Articles**. **Fetch Live Score & Goals (ESPN)** refreshes the current fixture context, while **Auto-fill All Sections** inserts the complete rich-section sequence into the `post-body` editor. Unsupported leagues and pre-kickoff fixtures receive safe general wording instead of failing.

## Static deployment

`.github/workflows/pages.yml` deploys the static dashboard to GitHub Pages when enabled for the repository. The repository does not require a build step.

## WordPress site login

The dashboard includes a WordPress connection in **Settings → WordPress Site Login**. Enter the site URL, WordPress username, and an **Application Password** created from the WordPress user profile, then choose **Save & Test**. Truepost validates the credentials against `/wp-json/wp/v2/users/me?context=edit` and shows the connected account in the header. The Application Password is held only in the current browser tab memory; it is not written to local storage, exported configuration, GitHub, or this repository. The WordPress site must expose the REST API and allow cross-origin requests from the deployed dashboard. To disconnect, choose **Disconnect** in the header; refreshing the page also clears the credential.

## Local checks

Run `node --check scripts/onetv-autopost.mjs` to validate the autoposter syntax. Run `npm test` for the canonical OneBall URL tests. Run `npm run auto-publish` only when the required Blogger and Firebase credentials are intentionally available in the environment. Never commit credentials or make Firebase publicly writable to bypass authentication errors.
