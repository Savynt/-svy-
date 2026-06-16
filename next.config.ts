import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Standalone server output for Docker (small runtime image).
  output: 'standalone',
};

export default nextConfig;
