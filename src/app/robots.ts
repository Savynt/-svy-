import type { MetadataRoute } from 'next'
import { env } from '@/lib/env'

const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Authenticated app areas — no SEO value, keep crawlers out.
      disallow: ['/dashboard', '/practice', '/test', '/coach', '/admin', '/api', '/verify'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
