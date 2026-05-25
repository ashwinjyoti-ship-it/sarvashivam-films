# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Pure static HTML/CSS/JS site (SARVSHIVAM Films — film studio portfolio). No build step, no package manager, no framework, no backend.

### Serving locally

```
python3 -m http.server 8080 --directory /workspace
```

Then open `http://localhost:8080/index.html`. A local server is required because `sessionStorage`/`localStorage` (used by page transitions in `js/transition.js`) are blocked under the `file://` protocol.

### Key files

See `Context.md` for the full file map, design tokens, page descriptions, and pitfall notes. It is the authoritative reference for this project.

### Linting / testing

There are no automated tests, no linter config, and no CI test step. The deploy pipeline (`.github/workflows/deploy.yml`) pushes directly to Cloudflare Pages on merge to `main`. Validate changes by visually inspecting in a browser.

### Gotchas

- The home page has a preloader animation (~2.4 s) on first visit; it is skipped on subsequent navigations via `sessionStorage`.
- Page transitions use a 2.4 s overlay before `location.assign`; wait for the transition to complete before asserting page content in automated checks.
- `about.html` is labeled "Intent" in the nav — not "About".
