import type { NextConfig } from "next";

const DOCS = "https://docs.hummingbot.org";

const nextConfig: NextConfig = {
  transpilePackages: ["@hummingbot/ui", "@hummingbot/brand", "@hummingbot/tokens"],

  async rewrites() {
    // The installer is now hosted by this site at public/install.sh (the deploy
    // repo is being retired). /condor.sh serves the same script — the unified
    // installer provisions both Condor and the Hummingbot API.
    return [{ source: "/condor.sh", destination: "/install.sh" }];
  },

  async redirects() {
    return [
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
