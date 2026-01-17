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

    nasa-facebook-feed::part(video) {
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
