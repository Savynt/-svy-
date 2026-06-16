import type { MetadataRoute } from 'next'
import { env } from '@/lib/env'

const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>

interface PublicRoute {
  path: string
  changeFrequency: ChangeFrequency
  priority: number
}

// Public, indexable routes only. Authenticated areas are excluded (see robots.ts).
const ROUTES: PublicRoute[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/pricing', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/seminars', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/register', changeFrequency: 'yearly', priority: 0.7 },
  { path: '/login', changeFrequency: 'yearly', priority: 0.5 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
