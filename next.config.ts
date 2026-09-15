import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(__filename);

const nextConfig: NextConfig = {
  // Self-hosted deploy (bitbucket-pipelines.yml + deploy.sh): ships a
  // minimal .next/standalone/ + server.js instead of full node_modules,
  // so the blue/green directory swap stays small and fast.
  output: "standalone",
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
