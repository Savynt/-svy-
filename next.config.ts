import type { NextConfig } from "next";
import { staticSecurityHeaders } from './src/lib/security/headers';

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Standalone server output for Docker (small runtime image).
  output: 'standalone',
  // Note: `src/lib/storage.ts` does fs I/O at an env-provided path, so Turbopack's
  // tracer can't see where it points and copies some repo files into the
  // standalone output (build warning). Impact is ~7 MB next to the 98 MB of
  // node_modules the runtime needs anyway — not worth contorting the code for.
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
