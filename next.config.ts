import type { NextConfig } from "next";
import { securityHeaders } from './src/lib/security/headers';

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Standalone server output for Docker (small runtime image).
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        // Report-Only: browser logs violations without blocking. Flip enforce:true once clean.
        headers: securityHeaders({ enforce: false }),
      },
    ]
  },
};

export default nextConfig;
