export interface FacebookPost {
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
        source?: string;  // Video source URL
      };
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

  const fields = "id,message,created_time,full_picture,permalink_url,attachments{type,media{image,source},url}";
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
