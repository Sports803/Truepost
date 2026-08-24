# Sports 803 Truepost

Sports 803 Truepost is a public static sports dashboard based on the supplied `index.html`. It includes the existing events, composition, thumbnail, scheduler, Blogger, and Firebase workflows, together with the reference-style **Live TV Channels** section and OneTV stream aggregation used by the Sports803 Event project.

## Event-compatible configuration

Truepost now uses the same public defaults and database paths as [Sports803/Event](https://github.com/Sports803/Event): the shared Google OAuth client ID is prefilled for browser sign-in, the Firebase Realtime Database defaults to `https://sports-803-1b806-default-rtdb.firebaseio.com`, events use `s803config/todaysMatches`, and live channels use `livetv/channels`. The Channels page can load and merge live channel records directly from that Firebase node.

The reference player route is `https://sports803.github.io/player/`. OneTV-compatible match cards are read from `https://oneball.live/`, normalized by team names and kickoff time, and converted into Sports803 player URLs. The optional PPVTV feed is read from `https://august.ppvtv.icu/api/matches.json`; its match-level and server-level `embed_url` values are added as fallback sources. Generated links use one encoded `mora` stream parameter followed by ordered encoded `embed` parameters, for example `https://sports803.github.io/player/?mora=<encoded-stream>&embed=<encoded-fallback-1>&embed=<encoded-fallback-2>`. DDKanqu lookups in the dashboard use `https://ddkaqiu.com`.

## GitHub Actions autopublishing

`.github/workflows/onetv-autopost.yml` runs every ten minutes and also supports manual dispatch. It follows the reference Event repository’s secret names and publication model: it scans OneTV, skips IDs already recorded locally or under Firebase `automation/bloggerPosts`, publishes up to `MAX_POSTS_PER_RUN` items to Blogger, writes the website-compatible event card to `s803config/todaysMatches`, and records the Blogger result in the shared automation ledger. The local `data/onetv-posted.json` file remains a non-secret fallback ledger and is committed by the workflow after successful runs.

The workflow uses Node.js 22 and the same `npm run auto-publish` entry-point convention as the reference repository. `FIREBASE_PUBLIC_WRITE` is explicitly disabled; authenticated Firebase access is required for automation runs.

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

## Local checks

Run `node --check scripts/onetv-autopost.mjs` to validate the autoposter syntax. Run `npm run auto-publish` only when the required Blogger and Firebase credentials are intentionally available in the environment. Never commit credentials or make Firebase publicly writable to bypass authentication errors.
