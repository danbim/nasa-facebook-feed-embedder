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
