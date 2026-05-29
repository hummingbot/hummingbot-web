import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hummingbot/ui", "@hummingbot/brand", "@hummingbot/tokens"],
};

export default nextConfig;
