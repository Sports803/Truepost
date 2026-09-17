# Truepost dashboard fixes (ready to apply)

The fixed `index.html` is ready. Upload it to replace the root `index.html` (and optionally `wordpress-plugin/sports-803-publisher/dashboard.html`).

## What changed

1. **Highlights URLs** — no more `encodeURIComponent` on `?one=`
   - Example: `https://sports803.github.io/player?one=https://oneball.live/replay/4565407.html`
2. **Default templates** seeded on load (Match Preview, Highlights Recap, How To Watch Live, FAQ SEO)
3. **Search description** field (~150 chars for Blogger SEO)
4. **`saveCurrentAsTemplate`** defined (was missing)
5. **Stable `evKey`** — uses event id + date (no collisions)
6. **Race objects** get `type: 'race'` + safe hash id (no `btoa` crash)
7. **`fetchAllEvents`** keeps previous events on failure
8. **Logo / ddkanqu caches** — TTL, do not lock failures forever
9. **Drafts** scoped per event + restore prompt + silent Saved pill
10. **`persistCFG({silent:true})`** — toggles no longer toast spam
11. **`postRaw` / bulk / scheduler** — backoff, progress, visibility recovery
12. **CSS** fixes for race/event cards

## How to apply

1. Download the fixed file from the chat attachment **Truepost-index-FIXED.html**
2. In GitHub: open `index.html` → pencil → replace all content → commit
3. Also replace `wordpress-plugin/sports-803-publisher/dashboard.html` with the same file if you use the WP plugin copy

Or from your machine:

```bash
git clone https://github.com/Sports803/Truepost.git
cd Truepost
# copy fixed file over index.html
cp /path/to/Truepost-index-FIXED.html index.html
cp index.html wordpress-plugin/sports-803-publisher/dashboard.html
git add index.html wordpress-plugin/sports-803-publisher/dashboard.html
git commit -m "Apply Truepost dashboard fixes"
git push
```
