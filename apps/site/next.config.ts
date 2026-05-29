import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compile the shared workspace packages from source.
  transpilePackages: ["@hummingbot/ui", "@hummingbot/brand", "@hummingbot/tokens"],
};

export default nextConfig;
