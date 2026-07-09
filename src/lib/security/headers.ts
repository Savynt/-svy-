/**
 * Recommended HTTP security headers for Savynt.
 *
 * Next.js 16 applies headers via `headers()` in `next.config.ts` (NOT this file —
 * the orchestrator wires it; see `src/lib/security/README.md`). This module just
 * returns the header list so the config stays declarative and the policy lives in
 * one reviewable place.
 *
 * The Content-Security-Policy is shipped in **Report-Only** mode first. That sends
 * the browser the policy and lets it report violations WITHOUT blocking anything,
 * so we can tighten the allow-lists against real traffic before enforcing it.
 * Once the reports are clean, switch the key to `Content-Security-Policy`
 * (enforcing) — see `enforce` below.
 */

export interface SecurityHeader {
  key: string
  value: string
}

/**
 * Build the CSP directive string.
 *
 * Notes / why these values:
 *  - `'unsafe-inline'` on `style-src`: Tailwind ships in a stylesheet, but Next's
 *    runtime and some inline `style=` attributes still need it. Removing it
 *    requires nonces and is a follow-up once we measure violations.
 *  - `script-src 'self'`: no third-party scripts today. Next 16 with the React
 *    Compiler does not require `'unsafe-eval'` in production. If you add analytics
 *    or a payment SDK later, allow-list its exact origin here, not a wildcard.
 *  - `connect-src 'self'`: same-origin API route handlers only. Add provider
 *    origins (SMTP web API, payments) when those integrations land.
 *  - `img-src` allows `data:` and `blob:` for inline SVG/logo and uploaded
 *    previews; `frame-ancestors 'none'` is the modern twin of X-Frame-Options.
 *  - `upgrade-insecure-requests` forces https on any stray http subresource.
 */
function buildCsp(): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "script-src 'self'",
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

export interface SecurityHeaderOptions {
  /**
   * When false (default) the CSP is emitted as `Content-Security-Policy-Report-Only`
   * so violations are reported but nothing is blocked. Flip to true to ENFORCE the
   * policy once report data shows no false positives.
   */
  enforce?: boolean
}

/**
 * The recommended security-header set. Returned as an array of `{ key, value }`
 * so it can be spread straight into a `next.config.ts` `headers()` entry.
 *
 * Header rationale:
 *  - Strict-Transport-Security: pin HTTPS for 2 years incl. subdomains (only takes
 *    effect over https; harmless on localhost). Add `; preload` after submitting to
 *    the HSTS preload list.
 *  - X-Frame-Options DENY + CSP frame-ancestors: defence-in-depth against clickjacking.
 *  - X-Content-Type-Options nosniff: stop MIME-type sniffing.
 *  - Referrer-Policy: send origin cross-site, full URL same-origin — protects
 *    query strings (e.g. reset codes) from leaking to third parties.
 *  - Permissions-Policy: deny powerful APIs Savynt never uses (camera, mic, geo, FLoC).
 *  - X-DNS-Prefetch-Control on: minor perf win, no privacy cost for first-party.
 */
export function securityHeaders(options: SecurityHeaderOptions = {}): SecurityHeader[] {
  const csp = buildCsp()
  const cspKey = options.enforce
    ? 'Content-Security-Policy'
    : 'Content-Security-Policy-Report-Only'

  return [
    { key: cspKey, value: csp },
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
