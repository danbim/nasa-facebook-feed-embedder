# Facebook Feed Widget Design

## Overview

A Bun/TypeScript server that fetches posts from a Facebook Page via the Graph API and serves an embeddable Web Component widget with infinite scroll.

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Static Site    │      │   Bun Server    │      │  Facebook API   │
│  (Jekyll etc)   │      │                 │      │                 │
│                 │      │  /api/feed      │      │                 │
│  <nasa-feed>    │─────▶│  (cached)       │─────▶│  Graph API      │
│  Web Component  │      │                 │      │                 │
│                 │◀─────│  /widget.js     │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Server Endpoints

### GET /api/feed

Request:
```
GET /api/feed?cursor=<pagination_cursor>&limit=10
```

Response:
```json
{
  "posts": [
    {
      "id": "123456789",
      "message": "Post text content...",
      "created_time": "2024-01-15T10:30:00+0000",
      "full_picture": "https://...",
      "permalink_url": "https://facebook.com/...",
      "attachments": {
        "data": [
          {
            "type": "photo|video|link",
            "media": { "image": { "src": "..." } },
            "url": "..."
          }
        ]
      }
    }
  ],
  "paging": {
    "next_cursor": "abc123...",
    "has_more": true
  }
}
```

### GET /widget.js

Self-contained Web Component JavaScript file.

### GET /demo

Styled demo page showing the widget in action with embed code example.

## Caching Strategy

- In-memory cache keyed by cursor
- Cache invalidated after `CACHE_DURATION_SECONDS`
- First page (no cursor) cached separately for fast initial loads

## Web Component

### Usage

```html
<script src="https://your-server.com/widget.js"></script>
<nasa-facebook-feed
  api="https://your-server.com/api/feed"
  limit="10">
</nasa-facebook-feed>
```

### Attributes

- `api` (required) - URL to your feed API
- `limit` - Posts per page (default: 10)

### Structure

```html
<nasa-facebook-feed>
  #shadow-root
    <div part="container">
      <article part="post">
        <time part="date">Jan 15, 2024</time>
        <p part="message">Post text...</p>
        <img part="image" src="...">
        <a part="link" href="...">View on Facebook</a>
      </article>
      <!-- more posts -->
      <button part="load-more">Load more</button>
      <div part="loading">Loading...</div>
    </div>
</nasa-facebook-feed>
```

### Styling from Host Site

```css
nasa-facebook-feed::part(post) {
  border: 1px solid #eee;
  padding: 1rem;
}
nasa-facebook-feed::part(image) {
  max-width: 100%;
}
```

## Demo Page

- Full working example of the embedded widget
- Modern card-based layout with rounded corners and subtle shadows
- Shows the embed code snippet for copy/paste
- Serves as documentation for styling the widget

## Configuration

Environment variables:

```bash
FACEBOOK_PAGE_ID=nasa.coldhawaii
FACEBOOK_ACCESS_TOKEN=your_token_here
CACHE_DURATION_SECONDS=600
PORT=3000
```

## Project Structure

```
facebook-feed/
├── src/
│   ├── index.ts          # Bun server entry point
│   ├── api/
│   │   └── feed.ts       # Facebook API fetching & caching
│   ├── widget/
│   │   └── component.ts  # Web Component source
│   └── demo/
│       └── page.ts       # Demo HTML page generator
├── package.json
├── tsconfig.json
├── .env.example          # Example environment config
└── README.md             # Setup & usage instructions
```

## Dependencies

- Bun runtime only (built-in fetch, server, TypeScript support)
