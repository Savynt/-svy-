import type { MetadataRoute } from 'next'
import { env } from '@/lib/env'

const baseUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')

// Authenticated app areas — no SEO value, keep every crawler out.
const PRIVATE = ['/dashboard', '/practice', '/test', '/coach', '/admin', '/api', '/verify']

/**
 * Crawlers that feed answer engines (ChatGPT, Perplexity, Claude, Google AI
 * Overviews). The `*` rule below already permits them, but several of these
 * only read a group that names them explicitly, and Google-Extended in
 * particular defaults to opt-out for AI grounding. Being named here is what
 * gets Savynt quoted rather than guessed at.
 */
const ANSWER_ENGINE_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'CCBot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      ...ANSWER_ENGINE_BOTS.map((userAgent) => ({ userAgent, allow: '/', disallow: PRIVATE })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
