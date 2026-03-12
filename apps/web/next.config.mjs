import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.dirname(fileURLToPath(new URL("../../package.json", import.meta.url)));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@tutormarket/types", "@tutormarket/ui-tokens"],
  turbopack: {
    root: workspaceRoot
  }
};

export default nextConfig;
