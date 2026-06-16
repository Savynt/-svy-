import Link from 'next/link'
import { Send, Camera, Mail } from 'lucide-react'
import { Logo } from '@/components/Logo'

interface FooterLinkItem {
  label: string
  href: string
}

const PREP: FooterLinkItem[] = [
  { label: 'IELTS', href: '/practice/ielts' },
  { label: 'Multilevel', href: '/practice/multilevel' },
  { label: 'CEFR levels', href: '/practice' },
  { label: 'Placement test', href: '/placement' },
]

const PLATFORM: FooterLinkItem[] = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'Seminars', href: '/seminars' },
  { label: 'About', href: '/about' },
  { label: 'Dashboard', href: '/dashboard' },
]

const ACCOUNT: FooterLinkItem[] = [
  { label: 'Log in', href: '/login' },
  { label: 'Create account', href: '/register' },
  { label: 'Forgot password', href: '/forgot-password' },
]

export function Footer() {
  return (
    <footer className="mt-20 border-t border-navy-100 bg-white">
      <div className="container-app grid gap-10 py-14 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-navy-500">
            IELTS, CEFR &amp; Multilevel preparation for Uzbekistan. Real exam-style tests,
            vocabulary and grammar — one simple subscription.
          </p>
          <div className="mt-5 flex gap-2">
            {[
              { Icon: Send, label: 'Telegram', href: '#' },
              { Icon: Camera, label: 'Instagram', href: '#' },
              { Icon: Mail, label: 'Email', href: 'mailto:hello@svy.uz' },
            ].map(({ Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-navy-100 text-navy-500 transition-colors hover:border-navy-300 hover:text-navy-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-400"
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <FooterCol title="Preparation" links={PREP} />
        <FooterCol title="Platform" links={PLATFORM} />
        <FooterCol title="Account" links={ACCOUNT} />
      </div>
      <div className="border-t border-navy-100">
        <div className="container-app flex flex-col items-center justify-between gap-2 py-5 text-xs text-navy-400 sm:flex-row">
          <p>© {new Date().getFullYear()} SVY. All rights reserved.</p>
          <p>Made for learners in Uzbekistan 🇺🇿</p>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: FooterLinkItem[] }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-bold text-navy-800">{title}</h4>
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-navy-500 transition-colors hover:text-navy-800">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Footer
