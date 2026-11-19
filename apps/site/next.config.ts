import type { NextConfig } from "next";

// Condor's docs are still on the Mintlify subdomain.
const DOCS = "https://docs.hummingbot.org";
// TODO(deploy): switch back to /main once `install-wizard` merges. The install
// scripts currently live only on that branch.
const DEPLOY_RAW =
  "https://raw.githubusercontent.com/hummingbot/deploy/install-wizard";
const DEPLOY_MAIN = "https://raw.githubusercontent.com/hummingbot/deploy/main";

const nextConfig: NextConfig = {
  transpilePackages: ["@hummingbot/ui", "@hummingbot/brand", "@hummingbot/tokens"],
  poweredByHeader: false,
  images: {
    // Botcamp's: OAuth profile photos.
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "media.licdn.com" },
    ],
    // Local images may carry a query string: team logos are served as
    // /api/teams/<slug>/logo?variant=dark&v=<updatedAt>.
    localPatterns: [{ pathname: "/**" }],
  },
  // Botcamp's security headers (botcamp-site next.config.mjs), unchanged.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // No page is meant to be framed by another site: framing /connect
            // would let a decoy page overlay its button and hand over a Condor
            // token. 'self', not 'none': the admin stage preview frames our own
            // pages. frame-src: what our pages may frame — our own pages, the
            // video providers parseVideoUrl builds embeds for, Vercel's toolbar.
            key: "Content-Security-Policy",
            value: [
              "frame-ancestors 'self'",
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.loom.com https://drive.google.com https://vercel.live",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
          {
            // Report-only: which scripts the site really loads (Next's inline
            // bootstrap needs 'unsafe-inline' without per-request nonces).
            // Reports go to /api/csp-report.
            key: "Content-Security-Policy-Report-Only",
            value: [
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://va.vercel-scripts.com https://vercel.live https://platform.twitter.com",
              "report-uri /api/csp-report",
            ].join("; "),
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // geolocation stays on for the profile's location input
          { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
      // Uploaded images are served from our own origin, so they must never run
      // as a page: an SVG with a <script>, opened directly or framed, would
      // otherwise execute as this site with the viewer's session. `sandbox`
      // gives the response a unique origin with scripts off; default-src
      // 'none' blocks anything it would load (inline styles and data: images
      // and fonts stay, for draw.io and Mermaid diagrams). Set here, not in the
      // route: Next applies config headers over a route's own, and for the
      // same key the last matching entry wins.
      ...["/api/users/:id/avatar", "/api/strategies/:slug/images/:imageId", "/api/teams/:teamSlug/logo"].map(
        (source) => ({
          source,
          headers: [
            {
              key: "Content-Security-Policy",
              value:
                "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; frame-ancestors 'self'; sandbox",
            },
          ],
        }),
      ),
    ];
  },

  async redirects() {
    return [
      // Install one-liners → deploy repo scripts (302; curl -fsSL follows).
      // These are the canonical names the Hero Quick Start card copies.
      // Served from the deploy `install-wizard` branch until it merges to main.
      { source: "/install-hummingbot.sh", destination: `${DEPLOY_RAW}/install-hummingbot.sh`, permanent: false },
      // Condor: deploy main's setup.sh works today. Switch to
      // `${DEPLOY_RAW}/install-condor.sh` once hummingbot/deploy#128 merges.
      { source: "/install-condor.sh", destination: `${DEPLOY_MAIN}/setup.sh`, permanent: false },
      // Short vanity aliases: /install.sh → Hummingbot, /condor.sh → Condor.
      { source: "/install.sh", destination: `${DEPLOY_RAW}/install-hummingbot.sh`, permanent: false },
      { source: "/condor.sh", destination: `${DEPLOY_MAIN}/setup.sh`, permanent: false },
      // The Condor install page became the Condor path of the get-started guide.
      { source: "/get-condor", destination: "/get-started?path=condor", permanent: false },

      // The blog now lives on this site (/blog). Legacy mkdocs post paths
      // (/blog/posts/<slug>) redirect to the flat /blog/<slug> routes.
      { source: "/blog/posts/:slug*", destination: "/blog/:slug*", permanent: true },

      // Release notes are part of the docs on this site (/docs/release-notes).
      { source: "/release-notes", destination: "/docs/release-notes", permanent: true },
      { source: "/release-notes/:version", destination: "/docs/release-notes/:version", permanent: true },

      // Condor docs live in Mintlify under docs.hummingbot.org/condor; forward
      // the site-owned canonical /condor/* on to the docs subdomain.
      // (condor.hummingbot.org -> hummingbot.org/condor/* is handled by a
      // Cloudflare redirect rule, where that domain's DNS lives.)
      { source: "/condor", destination: `${DOCS}/condor`, permanent: true },
      { source: "/condor/:path*", destination: `${DOCS}/condor/:path*`, permanent: true },

      // Docs live on this site at /docs (src/lib/docs.ts). /exchanges is a
      // landing page; connector pages are docs, so only the sub-paths move.
      { source: "/exchanges/:path+", destination: "/docs/exchanges/:path+", permanent: true },
    ];
  },
};

export default nextConfig;
