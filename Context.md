# SARVSHIVAM Films — Agent Context

Static marketing site for **SARVSHIVAM** (film-first creative studio). No build step, no framework.

## Stack
- HTML5 pages + single `css/style.css` + `js/transition.js`
- Fonts: Cormorant Garamond (display), Inter (UI) via Google Fonts
- Deploy: GitHub `main` → Cloudflare Pages (`sarvshivam-films`) via `.github/workflows/deploy.yml`
- Repo: `ashwinjyoti-ship-it/sarvashivam-films`

## Files
```
index.html          Home (body.home-page)
about.html          Nav label "Intent"
work.html           Work library + filter JS
narrative.html      Narrative & originals
founder.html        Founder (body.founder-page)
contact.html
css/style.css       All styles
js/transition.js    Nav transitions, reveals, home preloader, work filters
images/logo.png
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

## Breakpoints
- `1080px`: grids → fewer columns
- `760px`: mobile nav (column, scrollable links), tighter spacing
- `480px`: extra-small tweaks

## Git / user prefs
- Push to `origin main` when asked; user may be non-terminal (needs agent to run git)
- Minimal diffs; match existing CSS patterns; no commits unless requested

## Pitfalls (learned)
1. Never dismiss entry cover before shield exists (`done` flag + early timeout broke mobile/desktop)
2. `.reveal` at `opacity:0` looks like “black page with scroll” if not unlocked after nav
3. Home beam position ≠ founder beam position (separate `--beam-apex-x`)
4. `about.html` is the Intent page in nav copy
