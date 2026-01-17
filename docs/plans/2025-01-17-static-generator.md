# Static Feed Generator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `bun run generate` command that outputs static files (`docs/feed.json` + `docs/widget.js`) for GitHub Pages hosting.

**Architecture:** Generator script fetches 50 posts from Facebook API, writes JSON data file and a static Web Component that loads the JSON and handles client-side pagination.

**Tech Stack:** Bun, TypeScript, Facebook Graph API, Web Components

---

### Task 1: Static Web Component

**Files:**
- Create: `src/widget/static-component.ts`

**Step 1: Create the static Web Component**

This component is similar to the server component but:
- Loads `feed.json` from same origin as script
- All data loaded upfront, pagination is client-side only
- `limit` and `step` attributes control display

```typescript
export function getStaticWidgetScript(): string {
  return `
class NasaFacebookFeed extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.allPosts = [];
    this.visibleCount = 0;
    this.loading = true;
  }

  static get observedAttributes() {
    return ['limit', 'step'];
  }

  get limit() {
    return parseInt(this.getAttribute('limit') || '5');
  }

  get step() {
    return parseInt(this.getAttribute('step') || this.getAttribute('limit') || '5');
  }

  get hasMore() {
    return this.visibleCount < this.allPosts.length;
  }

  connectedCallback() {
    this.render();
    this.loadFeed();
  }

  getScriptBaseUrl() {
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      if (script.src && script.src.includes('widget.js')) {
        return script.src.replace(/widget\\.js.*$/, '');
      }
    }
    return './';
  }

  async loadFeed() {
    try {
      const baseUrl = this.getScriptBaseUrl();
      const response = await fetch(baseUrl + 'feed.json');
      if (!response.ok) throw new Error('Failed to load feed');
      this.allPosts = await response.json();
      this.visibleCount = Math.min(this.limit, this.allPosts.length);
      this.loading = false;
      this.render();
    } catch (error) {
      console.error('Failed to load Facebook feed:', error);
      this.loading = false;
      this.render();
    }
  }

  showMore() {
    this.visibleCount = Math.min(this.visibleCount + this.step, this.allPosts.length);
    this.render();
  }

  formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  extractYouTubeId(url) {
    if (!url) return null;
    const patterns = [
      /youtube\\.com\\/watch\\?v=([^&]+)/,
      /youtu\\.be\\/([^?]+)/,
      /youtube\\.com\\/embed\\/([^?]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  extractVimeoId(url) {
    if (!url) return null;
    const patterns = [
      /vimeo\\.com\\/(\\d+)/,
      /player\\.vimeo\\.com\\/video\\/(\\d+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  getVideoNoticeText() {
    const lang = navigator.language || navigator.userLanguage || '';
    const isDanish = lang.toLowerCase().startsWith('da');
    return isDanish ? 'Video tilgængelig på Facebook' : 'Video available on Facebook';
  }

  getMediaHtml(post) {
    const attachment = post.attachments?.data?.[0];
    const attachmentUrl = attachment?.url || '';
    const attachmentType = attachment?.type || '';

    if (attachment && attachment.media?.source) {
      return '<video part="video" controls playsinline preload="metadata">' +
        '<source src="' + attachment.media.source + '" type="video/mp4">' +
        '</video>';
    }

    const youtubeId = this.extractYouTubeId(attachmentUrl);
    if (youtubeId) {
      return '<div part="video-container">' +
        '<iframe part="video-embed" src="https://www.youtube.com/embed/' + youtubeId + '" ' +
        'frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
        'allowfullscreen></iframe>' +
        '</div>';
    }

    const vimeoId = this.extractVimeoId(attachmentUrl);
    if (vimeoId) {
      return '<div part="video-container">' +
        '<iframe part="video-embed" src="https://player.vimeo.com/video/' + vimeoId + '" ' +
        'frameborder="0" allow="autoplay; fullscreen; picture-in-picture" ' +
        'allowfullscreen></iframe>' +
        '</div>';
    }

    if ((attachmentType.includes('video') || attachmentType === 'share') && post.full_picture && attachmentUrl) {
      return '<a part="video-link" href="' + attachmentUrl + '" target="_blank" rel="noopener">' +
        '<div part="video-thumbnail">' +
        '<img part="image" src="' + post.full_picture + '" alt="" loading="lazy">' +
        '<div part="play-overlay"><svg part="play-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>' +
        '</div>' +
        '</a>';
    }

    if (attachmentType === 'native_templates' || attachmentType.includes('video') || (attachmentType === 'share' && !post.full_picture)) {
      const videoIcon = '<svg part="video-notice-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>';
      return '<a part="video-notice" href="' + post.permalink_url + '" target="_blank" rel="noopener">' +
        videoIcon +
        '<span part="video-notice-text">' + this.getVideoNoticeText() + '</span>' +
        '</a>';
    }

    if (post.full_picture) {
      return '<img part="image" src="' + post.full_picture + '" alt="" loading="lazy">';
    }
    return '';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  render() {
    if (this.loading) {
      this.shadowRoot.innerHTML = '<div part="container"><div part="loading">Loading...</div></div>';
      return;
    }

    const visiblePosts = this.allPosts.slice(0, this.visibleCount);
    const postsHtml = visiblePosts.map(post => {
      const mediaHtml = this.getMediaHtml(post);
      const messageHtml = post.message
        ? '<p part="message">' + this.escapeHtml(post.message) + '</p>'
        : '';

      return '<article part="post">' +
        '<time part="date" datetime="' + post.created_time + '">' + this.formatDate(post.created_time) + '</time>' +
        messageHtml +
        mediaHtml +
        '<a part="link" href="' + post.permalink_url + '" target="_blank" rel="noopener">View on Facebook</a>' +
        '</article>';
    }).join('');

    this.shadowRoot.innerHTML =
      '<div part="container">' +
        postsHtml +
        (this.hasMore ? '<button part="load-more">Load more</button>' : '') +
      '</div>';

    const loadMoreBtn = this.shadowRoot.querySelector('[part="load-more"]');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => this.showMore());
    }
  }
}

customElements.define('nasa-facebook-feed', NasaFacebookFeed);
`;
}
```

**Step 2: Verify TypeScript compiles**

Run: `bun build src/widget/static-component.ts --outdir=./dist`
Expected: No errors

**Step 3: Commit**

```bash
git add src/widget/static-component.ts
git commit -m "feat: add static Web Component for GitHub Pages"
```

---

### Task 2: Generator Script

**Files:**
- Create: `src/generate.ts`
- Modify: `package.json` (add generate script)

**Step 1: Create the generator script**

```typescript
import { getStaticWidgetScript } from "./widget/static-component";

const FACEBOOK_API_VERSION = "v18.0";
const POST_LIMIT = 50;

interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  full_picture?: string;
  permalink_url: string;
  attachments?: {
    data: Array<{
      type: string;
      media?: {
        image?: { src: string };
        source?: string;
      };
      url?: string;
    }>;
  };
}

async function fetchAllPosts(): Promise<FacebookPost[]> {
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    throw new Error("Missing FACEBOOK_PAGE_ID or FACEBOOK_ACCESS_TOKEN environment variables");
  }

  const fields = "id,message,created_time,full_picture,permalink_url,attachments{type,media{image,source},url}";
  const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${pageId}/posts?fields=${fields}&limit=${POST_LIMIT}&access_token=${accessToken}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Facebook API error: ${error}`);
  }

  const json = await response.json();
  return json.data || [];
}

async function main() {
  console.log("Fetching posts from Facebook...");
  const posts = await fetchAllPosts();
  console.log(`Fetched ${posts.length} posts`);

  // Ensure docs directory exists
  const docsDir = "./docs";
  await Bun.write(`${docsDir}/.gitkeep`, "");

  // Write feed.json
  const feedPath = `${docsDir}/feed.json`;
  await Bun.write(feedPath, JSON.stringify(posts, null, 2));
  console.log(`Written ${feedPath}`);

  // Write widget.js
  const widgetPath = `${docsDir}/widget.js`;
  await Bun.write(widgetPath, getStaticWidgetScript());
  console.log(`Written ${widgetPath}`);

  console.log("Done!");
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
```

**Step 2: Add generate script to package.json**

Add to `scripts` in `package.json`:

```json
"generate": "bun run src/generate.ts"
```

**Step 3: Test generator runs (will fail without credentials, that's OK)**

Run: `bun run generate`
Expected: Error about missing environment variables

**Step 4: Commit**

```bash
git add src/generate.ts package.json
git commit -m "feat: add static feed generator script"
```

---

### Task 3: GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/generate.yml`

**Step 1: Create the workflow file**

```yaml
name: Update Facebook Feed

on:
  schedule:
    # Run every 6 hours
    - cron: '0 */6 * * *'
  workflow_dispatch:
    # Allow manual trigger

jobs:
  generate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Generate static feed
        run: bun run generate
        env:
          FACEBOOK_PAGE_ID: ${{ secrets.FACEBOOK_PAGE_ID }}
          FACEBOOK_ACCESS_TOKEN: ${{ secrets.FACEBOOK_ACCESS_TOKEN }}

      - name: Commit and push changes
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore: update Facebook feed"
          file_pattern: "docs/*"
```

**Step 2: Commit**

```bash
mkdir -p .github/workflows
git add .github/workflows/generate.yml
git commit -m "feat: add GitHub Actions workflow for scheduled feed updates"
```

---

### Task 4: Test Locally with Real Credentials

**Step 1: Run generator with your .env**

Make sure your `.env` file has `FACEBOOK_PAGE_ID` and `FACEBOOK_ACCESS_TOKEN`.

Run: `bun run generate`
Expected:
```
Fetching posts from Facebook...
Fetched 50 posts
Written ./docs/feed.json
Written ./docs/widget.js
Done!
```

**Step 2: Verify output files**

Run: `ls -la docs/`
Expected: `feed.json` and `widget.js` exist

Run: `head -20 docs/feed.json`
Expected: JSON array with post objects

**Step 3: Test widget locally**

Create a simple test HTML file or use a local server to test the widget works.

**Step 4: Final commit**

```bash
git add docs/feed.json docs/widget.js
git commit -m "chore: generate initial static feed"
```

---

## Summary

After completing all tasks:

1. Run `bun run generate` to fetch posts and create static files
2. Push to GitHub with secrets configured
3. Enable GitHub Pages on `docs/` folder
4. Embed widget: `<script src="https://yourname.github.io/repo/widget.js"></script><nasa-facebook-feed></nasa-facebook-feed>`
