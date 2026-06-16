'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import type { FaqItem } from '@/data/marketing'

/**
 * Interactive FAQ accordion for the pricing page. Client component (state +
 * click handlers). The first item is open by default; one item open at a time.
 */
export function Faq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number>(0)

  return (
    <div className="mx-auto mt-8 max-w-3xl space-y-3">
      {items.map((item, i) => {
        const isOpen = open === i
        const panelId = `faq-panel-${i}`
        const buttonId = `faq-button-${i}`
        return (
          <Card key={item.q}>
            <h3>
              <button
                id={buttonId}
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2 sm:px-6"
              >
                <span className="font-display text-base font-bold text-navy-800">{item.q}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'h-5 w-5 shrink-0 text-navy-400 transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="px-5 pb-5 text-sm leading-relaxed text-navy-500 sm:px-6"
            >
              {item.a}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export default Faq
