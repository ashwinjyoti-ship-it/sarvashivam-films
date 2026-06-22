# AGENTS.md

## Cursor Cloud specific instructions

### Overview

HTML/CSS/JS site (SARVSHIVAM Films — film studio portfolio) with no build step, no package manager, and no framework. Public pages are static, while admin/content/edit-mode features use Cloudflare Pages Functions, D1, and R2.

### Serving locally

```bash
python3 -m http.server 8080 --directory /agent/repos/sarvashivam-films
```

Then open `http://localhost:8080/index.html`. A local server is required because `sessionStorage`/`localStorage` (used by page transitions in `js/transition.js`) are blocked under the `file://` protocol. This static server does not provide `/api/*`; admin, D1-backed content, uploads, and edit-mode verification require a deployed environment or a Cloudflare Pages Functions dev setup.

### Key files

See `Context.md` for the full file map, design tokens, page descriptions, and pitfall notes. It is the authoritative reference for this project.

### Linting / testing

There are no automated tests, no linter config, and no CI test step. The deploy pipeline (`.github/workflows/deploy.yml`) pushes directly to Cloudflare Pages on merge to `main`. Validate changes by visually inspecting in a browser.

### Gotchas

- The home page has a preloader animation (~2.4 s) on first visit; it is skipped on subsequent navigations via `sessionStorage`.
- Page transitions use a 2.4 s overlay before `location.assign`; wait for the transition to complete before asserting page content in automated checks.
- Edit mode (`?edit=1`, valid admin token required) skips both the transition overlay and the home preloader for faster CMS-style navigation.
- Transition words are D1-backed (`transition_words`) with a hardcoded fallback in `js/transition.js`; migrations are not auto-applied on deploy.
- `about.html` is labeled "Intent" in the nav — not "About".
