import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { ACCESS_COOKIE } from '@/lib/auth/constants'
import { ZONE_ROLES, homeForRole } from '@/lib/rbac'
import { buildCspHeaderValue } from '@/lib/security/headers'

/**
 * Next.js 16 Proxy (formerly middleware). Edge-safe: only `jose` verify + pure
 * rbac constants — no Prisma, no next/headers.
 *
 * Two jobs, on every matched request:
 *  1. Content-Security-Policy — mint a fresh per-request nonce and attach the
 *     ENFORCING CSP to both the forwarded request headers (so Next stamps the
 *     nonce onto its framework/inline scripts during SSR) and the response
 *     headers (so the browser enforces it). Every return path carries it.
 *  2. Zone guard — role-protected prefixes redirect unauthenticated / wrong-role
 *     users. The whole app already renders dynamically (root layout reads
 *     cookies), so the nonce is always applied — no static page ships nonce-less.
 */
export async function proxy(request: NextRequest) {
  // --- per-request CSP nonce --------------------------------------------
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCspHeaderValue(nonce)

  // Forward the nonce + CSP on the request so Next applies the nonce to its own
  // scripts during server rendering.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  /** Attach the enforced CSP to any outgoing response. */
  const withCsp = (response: NextResponse): NextResponse => {
    response.headers.set('Content-Security-Policy', csp)
    return response
  }
  const proceed = () => withCsp(NextResponse.next({ request: { headers: requestHeaders } }))

  // --- zone guard --------------------------------------------------------
  const { pathname } = request.nextUrl

  const zone = ZONE_ROLES.find((z) => pathname === z.prefix || pathname.startsWith(z.prefix + '/'))
  if (!zone) return proceed()

  const token = request.cookies.get(ACCESS_COOKIE)?.value
  const claims = token ? await verifyAccessToken(token) : null

  // Not authenticated → send to login with a return path.
  if (!claims) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return withCsp(NextResponse.redirect(url))
  }

  // Authenticated but wrong role → bounce to their home zone.
  if (!zone.roles.includes(claims.role)) {
    const url = request.nextUrl.clone()
    url.pathname = homeForRole(claims.role)
    url.search = ''
    return withCsp(NextResponse.redirect(url))
  }

  return proceed()
}

export const config = {
  // Run on app routes, skip static assets, image optimizer and API.
  matcher: ['/((?!api|_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
