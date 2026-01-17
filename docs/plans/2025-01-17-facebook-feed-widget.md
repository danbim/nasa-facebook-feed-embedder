# Facebook Feed Widget Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Bun/TypeScript server that fetches Facebook Page posts and serves an embeddable Web Component widget.

**Architecture:** Server with three endpoints - `/api/feed` (cached Facebook data with pagination), `/widget.js` (Web Component), `/demo` (styled demo page). In-memory caching with configurable TTL.

**Tech Stack:** Bun, TypeScript, Facebook Graph API, Web Components

---

### Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `.gitignore`

**Step 1: Initialize package.json**

```json
{
  "name": "facebook-feed-widget",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "start": "bun run src/index.ts"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create .env.example**

```bash
FACEBOOK_PAGE_ID=nasa.coldhawaii
FACEBOOK_ACCESS_TOKEN=your_token_here
CACHE_DURATION_SECONDS=600
PORT=3000
```

**Step 4: Create .gitignore**

```
node_modules/
.env
*.log
```

**Step 5: Install bun-types**

Run: `bun add -d bun-types`

**Step 6: Verify setup**

Run: `bun run dev`
Expected: Server should start (will fail since index.ts doesn't exist yet - that's fine)

**Step 7: Commit**

```bash
git init
git add package.json tsconfig.json .env.example .gitignore bun.lockb
git commit -m "chore: initial project setup with Bun and TypeScript"
```

---

### Task 2: Facebook API Integration

**Files:**
- Create: `src/api/feed.ts`

**Step 1: Create feed.ts with types and fetch logic**

```typescript
export interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  full_picture?: string;
  permalink_url: string;
  attachments?: {
    data: Array<{
      type: string;
      media?: { image: { src: string } };
      url?: string;
    }>;
  };
}

export interface FeedResponse {
  posts: FacebookPost[];
  paging: {
    next_cursor: string | null;
    has_more: boolean;
  };
}

interface CacheEntry {
  data: FeedResponse;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function getCacheDuration(): number {
  return parseInt(process.env.CACHE_DURATION_SECONDS || "600") * 1000;
}

function getCacheKey(cursor: string | null, limit: number): string {
  return `${cursor || "first"}-${limit}`;
}

export async function fetchFeed(
  cursor: string | null,
  limit: number
): Promise<FeedResponse> {
  const cacheKey = getCacheKey(cursor, limit);
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < getCacheDuration()) {
    return cached.data;
  }

  const pageId = process.env.FACEBOOK_PAGE_ID;
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    throw new Error("Missing FACEBOOK_PAGE_ID or FACEBOOK_ACCESS_TOKEN");
  }

  const fields = "id,message,created_time,full_picture,permalink_url,attachments{type,media,url}";
  let url = `https://graph.facebook.com/v18.0/${pageId}/posts?fields=${fields}&limit=${limit}&access_token=${accessToken}`;

  if (cursor) {
    url += `&after=${cursor}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Facebook API error: ${error}`);
  }

  const json = await response.json();

  const result: FeedResponse = {
    posts: json.data || [],
    paging: {
      next_cursor: json.paging?.cursors?.after || null,
      has_more: !!json.paging?.next,
    },
  };

  cache.set(cacheKey, { data: result, timestamp: now });

  return result;
}
```

**Step 2: Verify TypeScript compiles**

Run: `bun build src/api/feed.ts --outdir=./dist`
Expected: No errors

**Step 3: Commit**

```bash
git add src/api/feed.ts
git commit -m "feat: add Facebook Graph API integration with caching"
```

---

### Task 3: Web Component

**Files:**
- Create: `src/widget/component.ts`

**Step 1: Create the Web Component**

```typescript
export function getWidgetScript(): string {
  return `
class NasaFacebookFeed extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.posts = [];
    this.cursor = null;
    this.hasMore = true;
    this.loading = false;
  }

  static get observedAttributes() {
    return ['api', 'limit'];
  }

  get api() {
    return this.getAttribute('api') || '';
  }

  get limit() {
    return parseInt(this.getAttribute('limit') || '10');
  }

  connectedCallback() {
    this.render();
    this.loadPosts();
  }

  async loadPosts() {
    if (this.loading || !this.hasMore) return;
    this.loading = true;
    this.updateLoadingState();

    try {
      let url = this.api + '?limit=' + this.limit;
      if (this.cursor) {
        url += '&cursor=' + encodeURIComponent(this.cursor);
      }

      const response = await fetch(url);
      const data = await response.json();

      this.posts = [...this.posts, ...data.posts];
      this.cursor = data.paging.next_cursor;
      this.hasMore = data.paging.has_more;
      this.render();
    } catch (error) {
      console.error('Failed to load Facebook feed:', error);
    } finally {
      this.loading = false;
      this.updateLoadingState();
    }
  }

  updateLoadingState() {
    const loadingEl = this.shadowRoot.querySelector('[part="loading"]');
    const loadMoreBtn = this.shadowRoot.querySelector('[part="load-more"]');
    if (loadingEl) loadingEl.style.display = this.loading ? 'block' : 'none';
    if (loadMoreBtn) loadMoreBtn.style.display = this.loading ? 'none' : (this.hasMore ? 'block' : 'none');
  }

  formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  render() {
    const postsHtml = this.posts.map(post => {
      const imageHtml = post.full_picture
        ? '<img part="image" src="' + post.full_picture + '" alt="" loading="lazy">'
        : '';
      const messageHtml = post.message
        ? '<p part="message">' + this.escapeHtml(post.message) + '</p>'
        : '';

      return '<article part="post">' +
        '<time part="date" datetime="' + post.created_time + '">' + this.formatDate(post.created_time) + '</time>' +
        messageHtml +
        imageHtml +
        '<a part="link" href="' + post.permalink_url + '" target="_blank" rel="noopener">View on Facebook</a>' +
        '</article>';
    }).join('');

    this.shadowRoot.innerHTML =
      '<div part="container">' +
        postsHtml +
        '<button part="load-more" style="display: ' + (this.hasMore && !this.loading ? 'block' : 'none') + '">Load more</button>' +
        '<div part="loading" style="display: ' + (this.loading ? 'block' : 'none') + '">Loading...</div>' +
      '</div>';

    const loadMoreBtn = this.shadowRoot.querySelector('[part="load-more"]');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => this.loadPosts());
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('nasa-facebook-feed', NasaFacebookFeed);
`;
}
```

**Step 2: Verify TypeScript compiles**

Run: `bun build src/widget/component.ts --outdir=./dist`
Expected: No errors

**Step 3: Commit**

```bash
git add src/widget/component.ts
git commit -m "feat: add Web Component for Facebook feed widget"
```

---

### Task 4: Demo Page

**Files:**
- Create: `src/demo/page.ts`

**Step 1: Create the demo page generator**

```typescript
export function getDemoPage(apiUrl: string, widgetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facebook Feed Widget Demo</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #f5f5f5;
      margin: 0;
      padding: 2rem;
      line-height: 1.6;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
    }

    h1 {
      color: #333;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: #666;
      margin-bottom: 2rem;
    }

    .embed-code {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      overflow-x: auto;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.875rem;
    }

    .embed-code code {
      white-space: pre;
    }

    /* Widget Styling */
    nasa-facebook-feed::part(container) {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    nasa-facebook-feed::part(post) {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      transition: box-shadow 0.2s ease;
    }

    nasa-facebook-feed::part(post):hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    }

    nasa-facebook-feed::part(date) {
      display: block;
      color: #888;
      font-size: 0.875rem;
      margin-bottom: 0.75rem;
    }

    nasa-facebook-feed::part(message) {
      color: #333;
      margin: 0 0 1rem 0;
      white-space: pre-wrap;
    }

    nasa-facebook-feed::part(image) {
      width: 100%;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    nasa-facebook-feed::part(link) {
      display: inline-block;
      color: #1877f2;
      text-decoration: none;
      font-weight: 500;
    }

    nasa-facebook-feed::part(link):hover {
      text-decoration: underline;
    }

    nasa-facebook-feed::part(load-more) {
      background: #1877f2;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      margin: 1rem auto;
      display: block;
      transition: background 0.2s ease;
    }

    nasa-facebook-feed::part(load-more):hover {
      background: #166fe5;
    }

    nasa-facebook-feed::part(loading) {
      text-align: center;
      color: #888;
      padding: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Facebook Feed Widget</h1>
    <p class="subtitle">Embeddable feed widget for static sites</p>

    <div class="embed-code">
      <code>&lt;script src="${widgetUrl}"&gt;&lt;/script&gt;
&lt;nasa-facebook-feed api="${apiUrl}"&gt;&lt;/nasa-facebook-feed&gt;</code>
    </div>

    <script src="${widgetUrl}"></script>
    <nasa-facebook-feed api="${apiUrl}"></nasa-facebook-feed>
  </div>
</body>
</html>`;
}
```

**Step 2: Verify TypeScript compiles**

Run: `bun build src/demo/page.ts --outdir=./dist`
Expected: No errors

**Step 3: Commit**

```bash
git add src/demo/page.ts
git commit -m "feat: add styled demo page"
```

---

### Task 5: Server Entry Point

**Files:**
- Create: `src/index.ts`

**Step 1: Create the Bun server**

```typescript
import { fetchFeed } from "./api/feed";
import { getWidgetScript } from "./widget/component";
import { getDemoPage } from "./demo/page";

const port = parseInt(process.env.PORT || "3000");

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers for widget
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // API endpoint
    if (url.pathname === "/api/feed") {
      try {
        const cursor = url.searchParams.get("cursor");
        const limit = parseInt(url.searchParams.get("limit") || "10");
        const data = await fetchFeed(cursor, limit);

        return Response.json(data, { headers: corsHeaders });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return Response.json({ error: message }, { status: 500, headers: corsHeaders });
      }
    }

    // Widget script
    if (url.pathname === "/widget.js") {
      return new Response(getWidgetScript(), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/javascript",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // Demo page
    if (url.pathname === "/demo" || url.pathname === "/demo/") {
      const origin = `${url.protocol}//${url.host}`;
      const html = getDemoPage(`${origin}/api/feed`, `${origin}/widget.js`);

      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Root redirect to demo
    if (url.pathname === "/") {
      return Response.redirect(`${url.origin}/demo`, 302);
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Server running at http://localhost:${port}`);
console.log(`Demo page: http://localhost:${port}/demo`);
```

**Step 2: Test the server starts**

Run: `bun run dev`
Expected: "Server running at http://localhost:3000" and "Demo page: http://localhost:3000/demo"

**Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add Bun server with all endpoints"
```

---

### Task 6: README Documentation

**Files:**
- Create: `README.md`

**Step 1: Create README**

```markdown
# Facebook Feed Widget

Embeddable Facebook feed widget for static sites (Jekyll, Hugo, etc.)

## Setup

1. Clone and install:
   ```bash
   git clone <repo>
   cd facebook-feed
   bun install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your Facebook credentials
   ```

3. Run:
   ```bash
   bun run dev    # Development with hot reload
   bun run start  # Production
   ```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `FACEBOOK_PAGE_ID` | Facebook Page ID or username | required |
| `FACEBOOK_ACCESS_TOKEN` | Long-lived Page Access Token | required |
| `CACHE_DURATION_SECONDS` | How long to cache feed data | 600 |
| `PORT` | Server port | 3000 |

## Usage

Add to your static site:

```html
<script src="https://your-server.com/widget.js"></script>
<nasa-facebook-feed api="https://your-server.com/api/feed"></nasa-facebook-feed>
```

### Attributes

- `api` (required) - URL to the feed API endpoint
- `limit` - Posts per page (default: 10)

### Styling

Style with CSS `::part()` selectors:

```css
nasa-facebook-feed::part(post) {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

nasa-facebook-feed::part(image) {
  max-width: 100%;
  border-radius: 4px;
}

nasa-facebook-feed::part(date) {
  color: #666;
  font-size: 0.875rem;
}

nasa-facebook-feed::part(message) {
  margin: 0.5rem 0;
}

nasa-facebook-feed::part(link) {
  color: #1877f2;
}

nasa-facebook-feed::part(load-more) {
  background: #1877f2;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

nasa-facebook-feed::part(loading) {
  text-align: center;
  color: #666;
}
```

## Demo

Visit `http://localhost:3000/demo` to see the widget in action.
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup and usage instructions"
```

---

### Task 7: Test with Real Credentials

**Step 1: Create .env file**

Copy `.env.example` to `.env` and fill in your Facebook credentials.

**Step 2: Start server and verify**

Run: `bun run dev`
Visit: `http://localhost:3000/demo`

Expected: See your Facebook page's posts displayed with modern styling.

**Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "chore: final adjustments after testing"
```

---

## Summary

After completing all tasks, you'll have:
- A running Bun server at `http://localhost:3000`
- Demo page at `/demo` showing the styled widget
- Widget script at `/widget.js` for embedding
- Feed API at `/api/feed` with caching and pagination
