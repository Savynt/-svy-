import { headers } from 'next/headers'

/**
 * Emit schema.org JSON-LD.
 *
 * The nonce comes from the Proxy (`x-nonce`, see src/proxy.ts). A ld+json block
 * is a data block rather than executable script, so browsers don't run it and
 * `script-src` shouldn't apply — but tagging it with the nonce costs nothing and
 * removes any doubt under our enforced CSP.
 *
 * Server Component: the markup is in the initial HTML, which is what crawlers
 * and answer engines read.
 */
export async function JsonLd({ data }: { data: object | object[] }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const blocks = Array.isArray(data) ? data : [data]

  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          nonce={nonce}
          // Structured data is built server-side from our own constants — no
          // user input reaches it. JSON.stringify escaping is enough here; the
          // `<` guard stops a stray "</script>" from closing the tag early.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(block).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  )
}
