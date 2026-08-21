# Sports 803 Truepost

Sports 803 Truepost is a static sports dashboard based on the supplied `index.html`. It includes the existing events, composition, thumbnail, scheduler, Blogger, and Firebase workflows, with a reference-style **Live TV Channels** section and OneTV stream aggregation.

## What changed

The Channels page now includes a live-TV grid, channel preview cards, a channel HTML generator, and the existing editable channel library. The stream aggregator no longer uses the Kafeizhibo source. It can scrape match cards from the OneTV-compatible source used by the reference Events repository (`https://oneball.live/`), construct the same HLS/player URLs, and match those sources to dashboard events by normalized team names. DDKanqu links in the dashboard now use `https://www.ddkqax.com`.

The repository also includes a scheduled GitHub Actions workflow at `.github/workflows/onetv-autopost.yml`. It runs every ten minutes, scans OneTV, skips IDs recorded in `data/onetv-posted.json`, publishes up to the configured batch limit to Blogger, optionally pushes the resulting event to Firebase, and commits only the non-secret posted-ID ledger back to the repository. `workflow_dispatch` is available for an immediate manual run.

## Required repository secrets

| Secret | Purpose |
| --- | --- |
| `BLOGGER_CLIENT_ID` | Google OAuth client ID for Blogger |
| `BLOGGER_CLIENT_SECRET` | Google OAuth client secret |
| `BLOGGER_REFRESH_TOKEN` | Long-lived Google OAuth refresh token with Blogger write access |
| `BLOGGER_BLOG_ID` | Target Blogger blog ID |
| `FIREBASE_DATABASE_URL` | Firebase Realtime Database URL, optional if Firebase sync is not needed |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase service-account JSON, optional when `FIREBASE_AUTH_TOKEN` is supplied |
| `FIREBASE_AUTH_TOKEN` | Optional Firebase database token alternative |

Optional repository secrets or variables are `ONETV_SOURCE_URL`, `ONETV_STREAM_BASE_URL`, `PLAYER_BASE_URL`, `FIREBASE_EVENTS_PATH`, and `AUTOPOST_BATCH_LIMIT`. The workflow defaults to the reference repository’s OneTV-compatible source and Sports803 player route when these values are not supplied.

## Local checks

The autoposter is dependency-free and uses the stock Node.js runtime. Run `node --check scripts/onetv-autopost.mjs` to validate its syntax. The static dashboard can be previewed with any static HTTP server; no build step is required.

## Safety and authorization

Only embed stream URLs and publish content for sources and accounts that you are authorized to use. Secrets must be configured in GitHub repository settings and must not be committed to this repository.
