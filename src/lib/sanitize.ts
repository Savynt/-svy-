import { parse } from 'node-html-parser'

/**
 * Conservative allowlist HTML sanitizer for author-supplied passage/context HTML.
 *
 * passageHtml is written by OWNER/ADMIN/COACH via the builder or the importer and
 * rendered to students with dangerouslySetInnerHTML. A rogue or compromised author
 * could otherwise inject <script>, inline event handlers or javascript: URLs and
 * run code in a student's session (stored XSS). We parse the HTML server-side and
 * keep only a known-safe set of tags/attributes; everything else is dropped.
 *
 * This runs at render time (single choke point in the test page), so it also
 * covers content that was stored before sanitization existed вЂ” without mutating
 * the database.
 */

// Formatting/structure tags a passage legitimately needs. Everything not listed
// (script, style, iframe, object, embed, form, input, svg, link, meta, вЂ¦) is removed.
const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'span', 'div', 'section', 'article',
  'b', 'strong', 'i', 'em', 'u', 's', 'small', 'sub', 'sup', 'mark',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'blockquote', 'pre', 'code',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'a', 'img', 'figure', 'figcaption',
])

// Attributes allowed on any tag. href/src are validated separately below.
const GLOBAL_ATTRS = new Set(['class', 'id', 'title', 'dir', 'lang', 'colspan', 'rowspan', 'align', 'style'])
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height']),
}

/** A URL is safe if it is relative, http(s), mailto, or an inline image data URI. */
function isSafeUrl(value: string): boolean {
  // Strip whitespace and control chars often used to smuggle "javascript:".
  const stripped = value.replace(/[\u0000-\u0020]/g, '').toLowerCase()
  if (stripped.startsWith('javascript:') || stripped.startsWith('vbscript:')) return false
  if (stripped.startsWith('data:')) return stripped.startsWith('data:image/')
  return true
}

/** Drop an inline style value if it carries dangerous tokens. */
function sanitizeStyle(value: string): string | null {
  const lower = value.toLowerCase()
  if (
    lower.includes('javascript:') ||
    lower.includes('expression(') ||
    lower.includes('url(') ||
    lower.includes('@import')
  ) {
    return null
  }
  return value
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''

  const root = parse(html, {
    lowerCaseTagName: true,
    comment: false,
    // Never treat script/style bodies as preserved text вЂ” we drop those tags entirely.
    blockTextElements: { script: false, style: false, noscript: false },
  })

  for (const el of root.querySelectorAll('*')) {
    const tag = el.rawTagName?.toLowerCase()
    if (!tag) continue

    if (!ALLOWED_TAGS.has(tag)) {
      el.remove()
      continue
    }

    const allowed = TAG_ATTRS[tag] ?? new Set<string>()
    for (const name of Object.keys(el.attributes)) {
      const lname = name.toLowerCase()
      const isAllowed = GLOBAL_ATTRS.has(lname) || allowed.has(lname)
      if (!isAllowed || lname.startsWith('on')) {
        el.removeAttribute(name)
        continue
      }
      const val = el.attributes[name]
      if ((lname === 'href' || lname === 'src') && !isSafeUrl(val)) {
        el.removeAttribute(name)
      } else if (lname === 'style') {
        if (sanitizeStyle(val) === null) el.removeAttribute(name)
      }
    }

    // Harden external links opened in a new tab against reverse-tabnabbing.
    if (tag === 'a' && el.getAttribute('target') === '_blank') {
      el.setAttribute('rel', 'noopener noreferrer')
    }
  }

  return root.toString()
}
