/**
 * Recommended HTTP security headers for Savynt.
 *
 * The header set is split in two because the Content-Security-Policy is now
 * **nonce-based** and therefore per-request:
 *
 *  - {@link buildCspHeaderValue} builds the CSP string for a single request. It
 *    is called from the Proxy (`src/proxy.ts`), which mints a fresh nonce for
 *    every request and applies it to Next's framework/inline scripts. This is
 *    the ENFORCING policy (`Content-Security-Policy`).
 *  - {@link staticSecurityHeaders} returns the remaining, request-independent
 *    headers (HSTS, X-Frame-Options, …). These stay declarative in
 *    `next.config.ts` `headers()`.
 *
 * Why nonces: `script-src 'self'` alone would block Next's inline hydration
 * bootstrap; `'unsafe-inline'` would defeat the point. A per-request nonce lets
 * exactly Next's own scripts run and nothing an attacker could inject.
 */

export interface SecurityHeader {
  key: string
  value: string
}

/**
 * Build the per-request Content-Security-Policy string.
 *
 * Notes / why these values:
 *  - `script-src 'self' 'nonce-<n>' 'strict-dynamic'`: only scripts carrying
 *    this request's nonce run; `'strict-dynamic'` then trusts the chunk scripts
 *    those nonce'd scripts load (Next's runtime), so the host allow-list is not
 *    needed. In development React uses `eval`, so `'unsafe-eval'` is added there
 *    only — never in production.
 *  - `style-src 'self' 'unsafe-inline'`: Tailwind ships a stylesheet, but the UI
 *    also uses inline `style=` attributes (dynamic widths, progress bars). CSP
 *    nonces cannot whitelist inline style *attributes* (only `<style>` tags), so
 *    `'unsafe-inline'` is kept here. Style-based injection is far lower risk than
 *    script injection, which the nonce fully locks down. We deliberately do NOT
 *    add a nonce to style-src — mixing a nonce with `'unsafe-inline'` makes
 *    browsers ignore `'unsafe-inline'` and would break those inline styles.
 *  - `img-src` allows `data:`/`blob:` for the inline logo/uploaded previews and
 *    `https://i.imgur.com` for coach-authored task images.
 *  - `connect-src 'self'`: same-origin API route handlers only.
 *  - `frame-ancestors 'none'` is the modern twin of X-Frame-Options;
 *    `upgrade-insecure-requests` forces https on any stray http subresource.
 */
export function buildCspHeaderValue(nonce: string, isDev = process.env.NODE_ENV === 'development'): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://i.imgur.com",
    "font-src 'self' data:",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
}

/**
 * The request-independent security headers, returned as `{ key, value }` so they
 * spread straight into a `next.config.ts` `headers()` entry. The CSP is NOT here
 * — it is emitted per-request by the Proxy (see {@link buildCspHeaderValue}).
 *
 * Header rationale:
 *  - Strict-Transport-Security: pin HTTPS for 2 years incl. subdomains (only
 *    takes effect over https; harmless on localhost).
 *  - X-Frame-Options DENY + CSP frame-ancestors: defence-in-depth vs clickjacking.
 *  - X-Content-Type-Options nosniff: stop MIME-type sniffing.
 *  - Referrer-Policy: origin cross-site, full URL same-origin — protects query
 *    strings (e.g. reset codes) from leaking to third parties.
 *  - Permissions-Policy: deny powerful APIs Savynt never uses.
 *  - X-DNS-Prefetch-Control on: minor perf win, no privacy cost for first-party.
 */
export function staticSecurityHeaders(): SecurityHeader[] {
  return [
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains',
    },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
    },
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
  ]
}
