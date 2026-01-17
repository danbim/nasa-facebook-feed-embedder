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
