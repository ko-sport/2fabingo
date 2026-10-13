import type { NextConfig } from "next";

const previewOrigins = ["**.agent.cvm.dev", "**.cursorvm.com"];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", ...previewOrigins],
  experimental: {
    serverActions: {
      allowedOrigins: previewOrigins,
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
