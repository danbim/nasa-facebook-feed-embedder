# Static Feed Generator Design

## Overview

Add a `bun run generate` command that fetches 50 posts from Facebook and outputs static files to `docs/` for hosting on GitHub Pages.

## Architecture

```
bun run generate
    │
    ▼
┌─────────────────┐
│  Facebook API   │
│  (50 posts)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  docs/          │
│  ├─ feed.json   │  ← Array of 50 posts
│  └─ widget.js   │  ← Static Web Component
└─────────────────┘
```

## Output Files

### docs/feed.json

```json
[
  {
    "id": "123",
    "message": "Post text...",
    "created_time": "2024-01-15T10:30:00+0000",
    "full_picture": "https://...",
    "permalink_url": "https://facebook.com/...",
    "attachments": { ... }
  },
  ...
]
```

### docs/widget.js

Static Web Component that:
- Auto-detects `feed.json` location (same directory as script)
- Loads all 50 posts on startup
- Shows `limit` posts initially (default: 5)
- "Load more" reveals `step` more posts (default: same as limit)
- Hides "Load more" when all posts shown

## Widget Attributes

- `limit` - Posts to show initially (default: 5)
- `step` - Posts to reveal per click (default: same as limit)

## Usage

```html
<script src="https://yourname.github.io/repo/widget.js"></script>
<nasa-facebook-feed limit="5"></nasa-facebook-feed>
```

## GitHub Action

`.github/workflows/generate.yml` runs every 6 hours:
1. Checkout repo
2. Install Bun
3. Run `bun run generate`
4. Auto-commit changes to `docs/`

Secrets required:
- `FACEBOOK_PAGE_ID`
- `FACEBOOK_ACCESS_TOKEN`

## New Files

| File | Purpose |
|------|---------|
| `src/generate.ts` | Generator script |
| `src/widget/static-component.ts` | Static Web Component |
| `.github/workflows/generate.yml` | Scheduled GitHub Action |
