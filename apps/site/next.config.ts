import type { NextConfig } from "next";

const DOCS = "https://docs.hummingbot.org";
const DEPLOY_SETUP =
  "https://raw.githubusercontent.com/hummingbot/deploy/main/setup.sh";

const nextConfig: NextConfig = {
  transpilePackages: ["@hummingbot/ui", "@hummingbot/brand", "@hummingbot/tokens"],

  async redirects() {
    return [
      // Install vanity URLs → deploy repo scripts (302; curl -fsSL follows).
      // TODO(deploy): point /install.sh at deploy/main/install.sh once it lands.
      { source: "/install.sh", destination: DEPLOY_SETUP, permanent: false },
      { source: "/condor.sh", destination: DEPLOY_SETUP, permanent: false },

      // The blog now lives on this site (/blog). Legacy mkdocs post paths
      // (/blog/posts/<slug>) redirect to the flat /blog/<slug> routes.
      { source: "/blog/posts/:slug*", destination: "/blog/:slug*", permanent: true },

      // Volumes merged into the Exchanges page.
      { source: "/volumes", destination: "/exchanges", permanent: true },

      // Release notes still live in Mintlify (docs subdomain).
      { source: "/release-notes", destination: `${DOCS}/blog`, permanent: true },
      {
        source: "/release-notes/:version",
        destination: `${DOCS}/blog/hummingbot-v:version`,
        permanent: true,
      },

      // Docs live in Mintlify. /exchanges is now a marketing landing on this
      // site; individual connector pages still live in docs, so only redirect
      // the sub-paths (:path+ = one-or-more, leaving bare /exchanges to us).
      { source: "/docs/:path*", destination: `${DOCS}/:path*`, permanent: true },
      { source: "/exchanges/:path+", destination: `${DOCS}/exchanges/:path+`, permanent: true },
    ];
  },
};

export default nextConfig;
