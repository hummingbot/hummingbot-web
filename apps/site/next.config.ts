import type { NextConfig } from "next";

// TODO(deploy): switch back to /main once `install-wizard` merges. The install
// scripts currently live only on that branch.
const DEPLOY_RAW =
  "https://raw.githubusercontent.com/hummingbot/deploy/install-wizard";
const DEPLOY_MAIN = "https://raw.githubusercontent.com/hummingbot/deploy/main";

const nextConfig: NextConfig = {
  transpilePackages: ["@hummingbot/ui", "@hummingbot/brand", "@hummingbot/tokens"],

  images: {
    // YouTube thumbnails for the home's latest videos.
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com" }],
  },

  async redirects() {
    return [
      // Install one-liners → deploy repo scripts (302; curl -fsSL follows).
      { source: "/install-hummingbot.sh", destination: `${DEPLOY_RAW}/install-hummingbot.sh`, permanent: false },
      // Condor: deploy main's setup.sh works today. Switch to
      // `${DEPLOY_RAW}/install-condor.sh` once hummingbot/deploy#128 merges.
      { source: "/install-condor.sh", destination: `${DEPLOY_MAIN}/setup.sh`, permanent: false },
      // Short vanity aliases: /install.sh → Hummingbot, /condor.sh → Condor.
      { source: "/install.sh", destination: `${DEPLOY_RAW}/install-hummingbot.sh`, permanent: false },
      { source: "/condor.sh", destination: `${DEPLOY_MAIN}/setup.sh`, permanent: false },
      // The Condor install page is the Condor path of the get-started guide.
      { source: "/get-condor", destination: "/get-started?path=condor", permanent: false },

      // The blog lives on this site (/blog). Legacy mkdocs post paths
      // (/blog/posts/<slug>) redirect to the flat /blog/<slug> routes.
      { source: "/blog/posts/:slug*", destination: "/blog/:slug*", permanent: true },

      // Release notes are part of the docs on this site (/docs/release-notes).
      { source: "/release-notes", destination: "/docs/release-notes", permanent: true },
      { source: "/release-notes/:version", destination: "/docs/release-notes/:version", permanent: true },

      // Condor's docs are part of this site's docs. (condor.hummingbot.org ->
      // hummingbot.org/condor/* is a Cloudflare redirect rule.)
      { source: "/condor", destination: "/docs/condor", permanent: true },
      { source: "/condor/:path*", destination: "/docs/condor/:path*", permanent: true },

      // Docs live on this site at /docs (src/lib/docs.ts). /exchanges is a
      // landing page; connector pages are docs, so only the sub-paths move.
      { source: "/exchanges/:path+", destination: "/docs/exchanges/:path+", permanent: true },
    ];
  },
};

export default nextConfig;
