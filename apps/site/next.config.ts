import type { NextConfig } from "next";

// Condor's docs are still on the Mintlify subdomain.
const DOCS = "https://docs.hummingbot.org";
// TODO(deploy): switch back to /main once `install-wizard` merges. The install
// scripts currently live only on that branch.
const DEPLOY_RAW =
  "https://raw.githubusercontent.com/hummingbot/deploy/install-wizard";

const nextConfig: NextConfig = {
  transpilePackages: ["@hummingbot/ui", "@hummingbot/brand", "@hummingbot/tokens"],

  async redirects() {
    return [
      // Install one-liners → deploy repo scripts (302; curl -fsSL follows).
      // These are the canonical names the Hero Quick Start card copies.
      // Served from the deploy `install-wizard` branch until it merges to main.
      { source: "/install-hummingbot.sh", destination: `${DEPLOY_RAW}/install-hummingbot.sh`, permanent: false },
      { source: "/install-condor.sh", destination: `${DEPLOY_RAW}/install-condor.sh`, permanent: false },
      // Short vanity aliases: /install.sh → Hummingbot, /condor.sh → Condor.
      { source: "/install.sh", destination: `${DEPLOY_RAW}/install-hummingbot.sh`, permanent: false },
      { source: "/condor.sh", destination: `${DEPLOY_RAW}/install-condor.sh`, permanent: false },

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
