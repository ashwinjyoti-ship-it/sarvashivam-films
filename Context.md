# SARVSHIVAM Films — Agent Context

Static marketing site for **SARVSHIVAM** (film-first creative studio). No build step, no framework.

## Stack
- HTML5 pages + `css/style.css` + `css/edit-mode.css` + `js/transition.js` + `js/site-content.js` + `js/admin.js`
- Fonts: Cormorant Garamond (display), Inter (UI) via Google Fonts
- Deploy: GitHub `main` → Cloudflare Pages (`sarvshivam-films`) via `.github/workflows/deploy.yml`
- Backend: Cloudflare Pages Functions (`functions/api/`) + D1 database (`sarvshivam-films-db`, id `f4cd7a50-19e3-4aed-b8b3-17e08894641c`) + R2 bucket (`sarvshivam-films-media`)
- Repo: `ashwinjyoti-ship-it/sarvashivam-films`

## Files
```
index.html          Home (body.home-page)
about.html          Nav label "Intent"
work.html           Work library + filter JS
narrative.html      Narrative & originals
founder.html        Founder (body.founder-page)
contact.html
admin.html          Admin panel (gate + Work Library + Content Manager tabs)
css/style.css       All public styles
css/edit-mode.css   Edit mode overlay styles (bar, watermark, popup)
js/transition.js    Nav transitions, reveals, home preloader, work filters
js/site-content.js  Public content population + inline edit mode (?edit=1)
js/admin.js         Admin panel logic (auth, film slots, content manager)
migrations/
  001_init.sql      films + admin_config tables + seed data
  002_site_content.sql  site_content table + 84 seed rows (7 pages)
  003_transition_words.sql  transition_words table + seed data
functions/api/
  films.js                GET /api/films
  site-content.js         GET /api/site-content (public)
  transition-words.js     GET /api/transition-words (public)
  admin/login.js          POST /api/admin/login
  admin/verify.js         GET /api/admin/verify
  admin/password.js       POST /api/admin/password
  admin/site-content.js   PUT /api/admin/site-content
  admin/transition-words.js CRUD /api/admin/transition-words
  admin/films/[slot].js   PUT /api/admin/films/:slot
```

## Pages / nav
| File | Route label | Notes |
|------|-------------|-------|
| index | Home | Hero only; preloader `मौन` on first visit |
| about | Intent | |
| work | Work | `.work-card[data-category]`, `[data-filter]` buttons |
| narrative | Narrative | |
| founder | Founder | Single-column; footer Devanagari only |
| contact | Contact | |
| admin | Admin | Visible in public nav via `shared.nav.admin`; page remains gate-protected |

## Design tokens (`:root`)
- BG black `#000` on home/founder; other pages dark gradient on `body`
- Text `#f3eee2`, gold `#b8a06a`, muted `#b9af96`
- Max width `1240px`, nav height `--nav-h: 84px` (110px mobile)

## Header layout
- **Home** (`body.home-page`): absolute transparent header; logo top-left; **hide** `.brand-sub`
- **All other pages** (`body:not(.home-page)`): same top-left logo + **show** subtext "Films • Ideas • Meaning"; absolute transparent header; `main.container.section` has extra top padding
- Do not restore sticky blurred header on inner pages unless asked

## Downlight beam (CSS pseudo-layers on `body::after`)
- **Home** (`body.home-page`): apex ~`67%` (73% tablet, 75% ≤480px); dual conic V (wider downward); slightly brighter opacity vars
- **Founder** (`body.founder-page`): apex ~`70%` (76%/78% mobile); **same V dispersion as home**, fainter opacity; no lamp/silhouette (removed)
- Other pages: no beam
- No top halo radial; symmetric vertical V (`conic-gradient` centered ~180deg)
- Subtle grain on `body::before` for home/founder only

## Transitions (`js/transition.js`) — critical
- **Exit-only**: click internal link → black overlay `#020202` + rotating Devanagari word (2.4s) → `location.assign`
- **No entry shield** on arrival (removed `transition-boot.js`; caused permanent black screen race)
- `sessionStorage`: `ss_just_navigated` → `unlockPage()` forces `.reveal.in-view` + `html.is-ready`
- `ss_skip_maun` skips home preloader when arriving via nav
- `?edit=1` skips the 2.4s transition overlay for CMS-style navigation, but still carries `?edit=1` forward to internal links
- Links with `data-no-transition` skip the overlay outside edit mode too (used by Admin/back links)
- Script at **end of `<body>`** (not defer); head has inline `html{background:#020202}` + `theme-color` + legacy shield cleanup one-liner
- **Do not** re-add arrival overlay without fixing dismiss before shield mount

## Motion / UX
- `.reveal` → `.in-view` via IntersectionObserver; 800ms fallback shows all
- `html.is-ready .reveal` visible in CSS
- Home first visit: `[data-maun-preloader]` ~2.4s then hero fade-in

## HTML head pattern (every page)
```html
<style>html{background-color:#020202;color-scheme:dark}</style>
<meta name="theme-color" content="#020202">
<link rel="stylesheet" href="css/style.css">
```
```html
<body> <!-- or class="home-page" / "founder-page" -->
<script>try{var e=document.getElementById('ss-entry-shield');if(e)e.remove();sessionStorage.removeItem('ss_entry_cover');}catch(x){}</script>
...
<script src="js/transition.js"></script>
```

## Site Content System
- All editable text is stored in D1 `site_content` table (`content_key`, `content_value`, `max_chars`, `page`, `section`, `element_type`)
- Public pages bind text via `[data-site-key="<key>"]` attributes; `js/site-content.js` fetches `/api/site-content` and populates on load
- 84 rows across pages: `index` (4), `about` (22), `work` (9), `narrative` (15), `founder` (11), `contact` (15), `shared` (8)
- **Migration must be applied to D1** before content loads — migration 002 was applied directly to production (not via wrangler) on 2026-05-27

## Edit Mode (`?edit=1`)
- Any public page accepts `?edit=1` query param; `js/site-content.js` verifies admin token then activates inline editing
- `activateEditMode()`: adds `is-edit-mode` to `<html>`, injects `.edit-mode-bar` (fixed top bar) + `.edit-mode-frame` (visual indicator)
- `.edit-mode-frame` is a fixed full-viewport overlay; `css/edit-mode.css` renders the centered rotated "EDIT MODE" watermark with `::before`/`::after`
- Click any `[data-site-key]` element → inline popup with textarea + char counter + save (PUT `/api/admin/site-content`)
- `patchNavLinks()` appends `?edit=1` to all relative links so edit mode persists across page navigations
- While editing, clicks on `[data-site-key]` links open the inline editor instead of navigating; use the edit bar's "Back to Admin" control to return to `admin.html#content`
- On edit entry, `site-content.js` sets `sessionStorage` key `ss_skip_maun` so the home preloader is skipped
- `Done Editing` button: tries `window.close()`, falls back to `admin.html#content`
- Styles in `css/edit-mode.css`; `prefers-reduced-motion` supported

## Admin Panel (`admin.html`)
- Gate-protected (base64 token in `localStorage` key `ss_admin_token`)
- Two tabs: **Work Library** (film slots 1–5, YouTube URL or video upload ≤20s) and **Content Manager**
- Content Manager fetches `/api/site-content`, renders editable fields grouped by section per page tab
- Transition Words panel fetches and edits `/api/admin/transition-words`; roman input is converted to Devanagari by the helper in `js/admin.js`
- `initContentManager()` runs once (guarded by `contentLoaded` flag); var declarations must appear **before** the `#content` hash-check block to avoid hoisting reset bug
- Arriving at `admin.html#content` (e.g. from Done Editing) auto-opens Content Manager tab

## Transition Words
- Stored in D1 table `transition_words` (`migrations/003_transition_words.sql`); migrations are not auto-applied on deploy
- Public route: `GET /api/transition-words`; `js/transition.js` fetches words on load and falls back to its hardcoded Devanagari list if the request fails
- Admin route: `/api/admin/transition-words` for CRUD from the Content Manager tab
- Per-link override: `data-transition-word="..."` on an `<a>` forces a specific transition word

## D1 Database
- Binding: `DB` (wrangler.toml)
- Tables: `films`, `admin_config`, `site_content`, `transition_words`
- Default admin password: `BHAVYA` (stored plain in `admin_config`; change via admin panel)

## Breakpoints
- `1080px`: grids → fewer columns
- `760px`: mobile nav (column, scrollable links), tighter spacing
- `480px`: extra-small tweaks

## Git / user prefs
- Push to `origin main` when asked; user may be non-terminal (needs agent to run git)
- Minimal diffs; match existing CSS patterns; no commits unless requested

## Pitfalls (learned)
1. Never dismiss entry cover before shield exists (`done` flag + early timeout broke mobile/desktop)
2. `.reveal` at `opacity:0` looks like "black page with scroll" if not unlocked after nav
3. Home beam position ≠ founder beam position (separate `--beam-apex-x`)
4. `about.html` is the Intent page in nav copy
5. D1 migrations are NOT auto-applied on deploy — must run via wrangler CLI or D1 MCP tool (`d1_database_query`) manually against production
6. `var` declarations with initial values that appear after a hash-check block will reset values set inside functions called by that hash-check (JS hoisting gotcha) — always declare content manager vars before the hash-check
