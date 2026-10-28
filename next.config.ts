import type { NextConfig } from "next";

// Product photos are served from the project's public Storage bucket. Only
// that bucket path is allowed through the image optimizer.
function supabaseImagePattern() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return [];
  try {
    const url = new URL(raw);
    return [
      {
        protocol: url.protocol.replace(":", "") as "http" | "https",
        hostname: url.hostname,
        port: url.port,
        pathname: "/storage/v1/object/public/product-images/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: supabaseImagePattern(),
  },
  experimental: {
    serverActions: {
      // Photo uploads: max 4 MB (MAX_IMAGE_BYTES) plus multipart overhead,
      // still under Vercel's 4.5 MB request body limit.
      bodySizeLimit: "4.2mb",
    },
  },
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
