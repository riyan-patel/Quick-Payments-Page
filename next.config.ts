import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** This repo’s directory (not a parent folder that has an extra lockfile). */
const projectDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectDir,
  },
};

export default nextConfig;
