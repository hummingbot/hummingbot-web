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

      // Blog + release notes now live in Mintlify (docs subdomain).
      { source: "/blog", destination: `${DOCS}/blog`, permanent: true },
      { source: "/blog/posts/:slug*", destination: `${DOCS}/blog/:slug*`, permanent: true },
      { source: "/blog/:slug*", destination: `${DOCS}/blog/:slug*`, permanent: true },
      { source: "/release-notes", destination: `${DOCS}/blog`, permanent: true },
      {
        source: "/release-notes/:version",
        destination: `${DOCS}/blog/hummingbot-v:version`,
        permanent: true,
      },

      // Docs / exchanges live in Mintlify too.
      { source: "/docs/:path*", destination: `${DOCS}/:path*`, permanent: true },
      { source: "/exchanges/:path*", destination: `${DOCS}/exchanges/:path*`, permanent: true },
    ];
  },
};

export default nextConfig;
