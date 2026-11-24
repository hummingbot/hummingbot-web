/** Hummingbot's YouTube channel (@hummingbot). */
export const YOUTUBE_CHANNEL_ID = "UCxzzdEnDRbylLMWmaMjywOA";

export type YoutubeVideo = {
  id: string;
  title: string;
  published: string;
  url: string;
  thumbnail: string;
};

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Parses the channel's Atom feed into videos, newest first. */
export function parseYoutubeFeed(xml: string): YoutubeVideo[] {
  const entries = xml.split("<entry>").slice(1);
  return entries.flatMap((entry) => {
    const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = entry.match(/<title>([^<]*)<\/title>/)?.[1];
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
    if (!id || !title || !published) return [];
    return [
      {
        id,
        title: decodeXml(title),
        published,
        url: `https://www.youtube.com/watch?v=${id}`,
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      },
    ];
  });
}

/**
 * The channel's latest videos from its public RSS feed (no API key), cached
 * for an hour. Shorts are left out: they're vertical and don't fit a card.
 * Returns [] when YouTube can't be reached, so the page renders without them.
 */
export async function getLatestVideos(limit = 3): Promise<YoutubeVideo[]> {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return parseYoutubeFeed(await res.text())
      .filter((v) => !/#shorts/i.test(v.title))
      .slice(0, limit);
  } catch {
    return [];
  }
}
