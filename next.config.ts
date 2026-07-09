import type { NextConfig } from "next";
import { staticSecurityHeaders } from './src/lib/security/headers';

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Standalone server output for Docker (small runtime image).
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        // Request-independent headers only. The Content-Security-Policy is
        // nonce-based and emitted per-request by the Proxy (src/proxy.ts).
        headers: staticSecurityHeaders(),
      },
    ]
  },
};

export default nextConfig;
