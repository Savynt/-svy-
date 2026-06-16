# SVY Platform — BUILD CONTRACT (read fully before writing any file)

You are building ONE part of **SVY** — a CEFR / IELTS / Multilevel exam-prep platform for
Uzbekistan (Next.js 16, App Router, TS strict, Tailwind v3). Subscription paywall, 20 000 UZS/mo.
Brand: open-book "SVY" mark, deep **navy** ink on soft **sky-blue**, warm **gold** accent.

## 0. ⚠️ Next.js 16 — THIS IS NOT THE NEXT.JS YOU KNOW
Before writing Next code, skim the relevant doc under `node_modules/next/dist/docs/01-app/`.
Breaking changes from your training data — DO NOT use old patterns:
- **Middleware is renamed to `proxy`** — file is `src/proxy.ts`, exports `proxy(request)` + `config`. Already written — do NOT create `middleware.ts`.
- **`cookies()`, `headers()`, `draftMode()` are ASYNC** → `const jar = await cookies()`.
- **`params` and `searchParams` in pages/layouts are Promises** → `async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params }`.
- Metadata: `export const metadata: Metadata = {...}` or `export async function generateMetadata()`. No `<Head>`.
- `"use client"` MUST be the first line for any component using state/effects/event handlers/browser APIs.
- React 19 + React Compiler are on. Server Components are the default; only add `"use client"` when needed.
- Links: `import Link from 'next/link'` → `<Link href="...">`. Active state: `usePathname()` from `next/navigation` (client).
- Mutations: Server Actions (`"use server"`) or Route Handlers (`src/app/api/.../route.ts` using Web `Request`/`Response`).

## 1. HARD RULES
1. **Only write the files assigned to your task.** Never edit shared lib, the Prisma schema, configs, or another agent's files. No new npm deps.
2. TypeScript strict: no `any`, no unused vars/imports. Type every prop, every param.
3. Use the `@/` import alias (maps to `src/`). Reuse lib + design-system below; don't reinvent.
4. Mobile-first responsive (UZ traffic is mostly phones): phone → tablet → desktop. Use Tailwind tokens, never hardcode hex.
5. **T9 / autocorrect protection** on ALL answer/auth text inputs: `autoCorrect="off" autoCapitalize="off" autoComplete="off" spellCheck={false}` (use the shared `<Input>`/`<TextInput>` which bakes this in; for auth, `autoComplete` may be "email"/"tel"/"new-password" as noted).
6. Don't run `npm`/`next build`/`prisma` — the orchestrator builds at the end. Just write files.
7. Keep copy in clear English (learners are Uzbek). Prices in UZS via `formatUzs`.

## 2. Tailwind tokens (configured in tailwind.config.ts)
- `navy-50…950` (primary `navy-700` #1e3a5f, headings `navy-800`, body `navy-500/600`)
- `sky-50` (page bg), `sky-100`, `sky-200` (plate); `accent-400/500/600` (gold CTA, sparingly)
- `emerald-*` success; fonts: `font-display` (Jakarta) headings, `font-sans` (Inter) body
- `shadow-card`, `shadow-card-hover`; `rounded-2xl` cards, `rounded-xl` buttons; `.container-app` wrapper

## 3. Available lib (import, never reinvent) — all under `@/lib`
```ts
import { cn } from '@/lib/cn'
import { prisma } from '@/lib/prisma'              // server only
import { env } from '@/lib/env'                     // server only
import { can, homeForRole, ROLES, type Role } from '@/lib/rbac'
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth/constants'
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '@/lib/auth/jwt'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { getSession, getCurrentUser, requireUser, requireRole, setAuthCookies, clearAuthCookies } from '@/lib/auth/session' // server only, async
```
Roles: OWNER, ADMIN, COACH, DEVELOPER, STUDENT. `homeForRole(role)` → landing path.
Unified task types: `@/types/task` (`NormalizedTask`, `questionTypeSchema`, …, zod).

## 4. Prisma models (do NOT edit schema — it's the source of truth)
User(email unique, phone unique, firstName, lastName, role, cefrLevel, emailVerified, phoneVerified),
Session (refresh rotation), VerificationCode (email-OTP, purpose EMAIL_VERIFY|PASSWORD_RESET, codeHash),
Plan, PriceHistory, PromoCode, Subscription (priceUzsAtPurchase = grandfathered),
Task, QuestionGroup, Question (type + data Json + answer Json), Attempt, Answer, SkillProgress,
PlacementResult, Seminar, SeminarRegistration, VocabSet/VocabWord, GrammarLesson, CoachStudent.
QuestionType enum: TRUE_FALSE_NOTGIVEN, YES_NO_NOTGIVEN, MULTIPLE_CHOICE, MULTI_SELECT, MATCHING,
MATCHING_HEADINGS, SENTENCE_COMPLETION, SUMMARY_COMPLETION, NOTE_COMPLETION, TABLE_COMPLETION,
SHORT_ANSWER, LABELLING, ESSAY, SPEAKING_PROMPT.

## 5. Route structure (App Router, route groups don't affect URLs)
```
src/app/
  layout.tsx                  (root — DONE: fonts, metadata) · globals.css (DONE)
  (marketing)/  layout.tsx(Navbar+Footer) page.tsx(/) pricing/ seminars/ about/
  (auth)/       layout.tsx(centered) login/ register/ forgot-password/ reset-password/ verify/ placement/
  (student)/    layout.tsx(app shell) dashboard/ practice/ practice/[track]/ practice/[track]/[skill]/ test/[taskId]/
  (coach)/      coach/ layout.tsx coach/ (home) coach/upload/ coach/review/ coach/students/
  (admin)/      admin/ layout.tsx admin/ (home) admin/users/ admin/pricing/ admin/analytics/ admin/content/
  api/          auth/{register,login,logout,refresh,verify-email,forgot-password,reset-password}/route.ts
                attempts/route.ts  (+ others as needed)
  not-found.tsx  robots.ts  sitemap.ts
```
Guarded prefixes (proxy.ts already enforces): `/admin` (OWNER/ADMIN/DEVELOPER), `/coach` (OWNER/ADMIN/COACH), `/dashboard` `/practice` (any authed). Marketing + auth are public/SEO.

## 6. Design system — exact APIs (porting from the Vite demo, adapted to Next)
The design-system agent creates these under `src/components`. Everyone else imports them by these exact signatures.
LINKS USE `href` (next/link), NOT `to`.
```tsx
// 'use client' where noted
import { Button } from '@/components/ui/Button'   // 'use client'
//   <Button href="/x" variant="primary|secondary|ghost|accent" size="sm|md|lg">…</Button>  (Link when href)
//   <Button onClick={fn} type="button">…</Button>  (button otherwise)
import { Card, CardBody } from '@/components/ui/Card'        // <Card href? hover><CardBody/></Card>
import { Badge } from '@/components/ui/Badge'                // tone: navy|sky|accent|green|gray
import { ProgressBar } from '@/components/ui/ProgressBar'    // value:number, showLabel?
import { SectionHeading } from '@/components/ui/SectionHeading' // eyebrow,title,subtitle,align
import { Input } from '@/components/ui/Input'        // text input WITH T9 protection baked in; props: label?,error?,...native
import { Logo } from '@/components/Logo'             // size?,withWordmark?,variant:'navy'|'light'
import { PageHero } from '@/components/PageHero'      // eyebrow,title,subtitle,breadcrumbs:{label,href?}[]
import { Navbar } from '@/components/marketing/Navbar' // 'use client'
import { Footer } from '@/components/marketing/Footer'
import { formatUzs } from '@/lib/format'             // formatUzs(20000) -> "20,000 UZS"  (design agent creates @/lib/format)
```
Brand colours from the SVY logo; `Logo` is an inline SVG (open book + "SVY"). Visual reference: `../svy-ielts/` (the Vite demo) — match that look & feel (navy hero bands, sky cards, gold CTAs).

## 7. Registration & auth spec (founder's requirement)
- **Register form fields:** First name, Last name, Email (Gmail), Phone (+998…), Password. Email & phone are UNIQUE.
- **Verification = email OTP** (6-digit code emailed — cheaper than SMS). Flow: submit form → create user (unverified) → email a 6-digit code (hashed in VerificationCode) → `/verify` page to enter code → on success mark `emailVerified`, issue tokens. Phone stored, not SMS-verified (cost saving).
- **Email sending:** create `src/lib/email.ts` with `sendVerificationEmail(email, code)` and `sendPasswordResetEmail`. For now implement a **provider-agnostic stub** that logs the code to the server console (TODO: wire SMTP via the working mailbox the founder will provide — read SMTP_* from env, leave commented in .env.example). Do not hardcode credentials.
- **Forgot password:** `/forgot-password` (enter email → email a reset code/link) → `/reset-password` (code + new password). Same VerificationCode model, purpose PASSWORD_RESET.
- **Login:** email + password → verifyPassword → issue access+refresh, set cookies (setAuthCookies), redirect to homeForRole.
- **Tokens:** access 15m + refresh 30d (httpOnly cookie, rotation via Session row). Google OAuth = phase 2 (leave a disabled "Continue with Google" button).
- Build forms as **template/shells that work against the API route handlers** (validate with zod, show errors, loading states). Inputs use T9 protection; password uses `autoComplete="new-password"`, email `inputMode="email"`, phone `inputMode="tel"`.

## 8. Quality bar
Polished, production-looking (not wireframes). Realistic empty/loading/error states. Accessible (labels, focus rings,
48px hit areas). Reuse the design system. Public pages export `metadata` for SEO. This is a real product — build it like one.
