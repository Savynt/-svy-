import type { Metadata } from 'next'

/**
 * The OG image, for pages that set their own `openGraph`.
 *
 * Metadata merges *shallowly*: a segment that defines `openGraph` replaces the
 * parent's whole object, so it also drops the image the `opengraph-image` file
 * convention injects at the root. Pages that don't touch `openGraph` (e.g.
 * /login) get the image for free; our marketing pages want a custom title, so
 * they must spread this back in.
 *
 * Twitter needs no equivalent — Next reuses the OG image for `twitter:image`.
 */
export const OG_IMAGE: Pick<NonNullable<Metadata['openGraph']>, 'images'> = {
  images: [
    {
      url: '/opengraph-image',
      width: 1200,
      height: 630,
      alt: 'Savynt — IELTS, SAT & General English preparation',
    },
  ],
}
