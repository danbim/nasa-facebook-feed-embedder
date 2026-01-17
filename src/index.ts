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
