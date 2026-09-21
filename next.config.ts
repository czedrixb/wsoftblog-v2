import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(__filename);

// Vercel sets VERCEL=1 at both build and runtime.
const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  // Self-hosted deploy (bitbucket-pipelines.yml + deploy.sh): ships a
  // minimal .next/standalone/ + server.js instead of full node_modules,
  // so the blue/green directory swap stays small and fast.
  //
  // MUST be absent on Vercel: Vercel's Next adapter reads
  // .next/next-server.js.nft.json in onBuildComplete, and standalone mode
  // consumes those manifests into .next/standalone/ instead, so the build
  // fails with ENOENT (vercel/next.js#96646, confirmed against Next 16.3).
  ...(isVercel ? {} : { output: "standalone" as const }),
  images: {
    localPatterns: [
      {
        pathname: "/api/media/file/**",
      },
    ],
  },
  turbopack: {
    root: path.resolve(dirname),
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
