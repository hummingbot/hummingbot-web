import { describe, expect, it } from "vitest";
import { parseYoutubeFeed } from "./youtube";

const FEED = `<?xml version="1.0"?><feed>
<title>Hummingbot</title>
<entry><yt:videoId>abc123</yt:videoId><title>The Bot Pod &amp; Friends</title><published>2026-10-24T04:48:34+00:00</published></entry>
<entry><yt:videoId>def456</yt:videoId><title>Tip #shorts</title><published>2026-10-10T12:04:41+00:00</published></entry>
<entry><title>No id</title><published>2026-10-01T00:00:00+00:00</published></entry>
</feed>`;

describe("parseYoutubeFeed", () => {
  it("reads each entry's id, title and date, skipping incomplete ones", () => {
    const videos = parseYoutubeFeed(FEED);
    expect(videos.map((v) => v.id)).toEqual(["abc123", "def456"]);
    expect(videos[0]).toMatchObject({
      title: "The Bot Pod & Friends",
      url: "https://www.youtube.com/watch?v=abc123",
      thumbnail: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
    });
  });

  it("ignores the channel's own title", () => {
    expect(parseYoutubeFeed(FEED).some((v) => v.title === "Hummingbot")).toBe(false);
  });
});
