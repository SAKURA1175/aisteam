import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.dirname(fileURLToPath(new URL("../../package.json", import.meta.url)));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@tutormarket/types", "@tutormarket/ui-tokens"],
  turbopack: {
    root: workspaceRoot
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
