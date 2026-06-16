import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { ACCESS_COOKIE } from '@/lib/auth/constants'
import { ZONE_ROLES, homeForRole } from '@/lib/rbac'

/**
 * Next.js 16 Proxy (formerly middleware). Edge-safe: only `jose` verify + pure
 * rbac constants — no Prisma, no next/headers. Guards role-protected zones.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const zone = ZONE_ROLES.find((z) => pathname === z.prefix || pathname.startsWith(z.prefix + '/'))
  if (!zone) return NextResponse.next()

  const token = request.cookies.get(ACCESS_COOKIE)?.value
  const claims = token ? await verifyAccessToken(token) : null

  // Not authenticated → send to login with a return path.
  if (!claims) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Authenticated but wrong role → bounce to their home zone.
  if (!zone.roles.includes(claims.role)) {
    const url = request.nextUrl.clone()
    url.pathname = homeForRole(claims.role)
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Run on app routes, skip static assets, image optimizer and API.
  matcher: ['/((?!api|_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
