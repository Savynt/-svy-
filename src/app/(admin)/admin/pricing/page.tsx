import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import {
  Lock,
  CircleDollarSign,
  TicketPercent,
  Info,
  Sparkles,
  Users as UsersIcon,
} from 'lucide-react'
import { requireRole, getSession } from '@/lib/auth/session'
import { can } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { formatUzs } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Pricing',
  robots: { index: false, follow: false },
}

/**
 * Re-assert pricing permission inside every mutation. Server Actions are
 * reachable by direct POST, so the layout guard alone is not enough.
 */
async function assertPricingAccess() {
  const session = await getSession()
  if (!session || !can(session.role, 'pricing:manage')) {
    throw new Error('Forbidden: pricing changes are owner-only.')
  }
  return session
}

async function updatePlanPrice(formData: FormData) {
  'use server'
  const session = await assertPricingAccess()

  const planId = String(formData.get('planId') ?? '')
  const priceUzs = Number.parseInt(String(formData.get('priceUzs') ?? ''), 10)
  if (!planId || !Number.isFinite(priceUzs) || priceUzs < 0) return

  // Grandfathering: existing Subscriptions keep `priceUzsAtPurchase`; we only
  // change the plan's current price and append a PriceHistory audit row.
  await prisma.$transaction([
    prisma.plan.update({ where: { id: planId }, data: { priceUzs } }),
    prisma.priceHistory.create({
      data: { planId, priceUzs, changedById: session.id },
    }),
  ])

  revalidatePath('/admin/pricing')
}

async function createPromoCode(formData: FormData) {
  'use server'
  await assertPricingAccess()

  const code = String(formData.get('code') ?? '')
    .trim()
    .toUpperCase()
  const discountType = String(formData.get('discountType') ?? 'PERCENT')
  const amount = Number.parseInt(String(formData.get('amount') ?? ''), 10)
  if (!code || !Number.isFinite(amount) || amount <= 0) return
  if (discountType !== 'PERCENT' && discountType !== 'FIXED') return
  if (discountType === 'PERCENT' && amount > 100) return

  const existing = await prisma.promoCode.findUnique({ where: { code } })
  if (existing) return

  await prisma.promoCode.create({
    data: { code, discountType, amount },
  })

  revalidatePath('/admin/pricing')
}

export default async function AdminPricingPage() {
  const session = await requireRole('OWNER', 'ADMIN', 'DEVELOPER')

  // Money stays with the OWNER. ADMIN/DEVELOPER land here only via direct URL.
  if (!can(session.role, 'pricing:manage')) {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="border-dashed">
          <CardBody className="flex flex-col items-center py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50 text-navy-400">
              <Lock className="h-7 w-7" aria-hidden="true" />
            </div>
            <h1 className="mt-5 font-display text-xl font-extrabold text-navy-800">
              Owner-only area
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-navy-500">
              Plan prices and promo codes are managed by the platform owner. Your role can see
              everything else in the admin console.
            </p>
            <div className="mt-5">
              <Button href="/admin" variant="secondary" size="sm">
                Back to overview
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  const [plans, promoCodes, subsByPlan] = await Promise.all([
    prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { subscriptions: true } } },
    }),
    prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.subscription.groupBy({
      by: ['planId'],
      where: { status: 'ACTIVE' },
      _count: { _all: true },
    }),
  ])

  const activeByPlan = new Map(subsByPlan.map((s) => [s.planId, s._count._all]))

  return (
    <div className="space-y-10">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-navy-400">Billing</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-800 sm:text-3xl">
          Pricing &amp; promotions
        </h1>
        <p className="mt-2 max-w-2xl text-navy-500">
          Set plan prices and run promo codes. Changing a price never affects learners who are
          already subscribed.
        </p>
      </div>

      {/* Grandfathering explainer */}
      <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-navy-500" aria-hidden="true" />
        <p className="text-sm text-navy-600">
          <span className="font-semibold text-navy-800">Existing subscriptions are grandfathered.</span>{' '}
          Each subscription stores the price paid at purchase, so a new price applies only to future
          sign-ups and renewals.
        </p>
      </div>

      {/* Plans */}
      <section>
        <SectionHeading
          eyebrow="Plans"
          title="Subscription plans"
          subtitle="Edit the current price for each plan. A price-change audit row is recorded automatically."
          className="mb-5"
        />

        {plans.length === 0 ? (
          <Card>
            <CardBody className="flex flex-col items-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-navy-500">
                <CircleDollarSign className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="mt-4 font-display text-lg font-bold text-navy-800">No plans yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-navy-500">
                Plans are seeded with the database. Once seeded they will appear here for editing.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {plans.map((plan) => {
              const active = activeByPlan.get(plan.id) ?? plan._count.subscriptions
              return (
                <Card key={plan.id} className="h-full">
                  <CardBody className="flex h-full flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-lg font-bold text-navy-800">
                            {plan.name}
                          </h3>
                          {plan.highlight && <Badge tone="accent">Popular</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs text-navy-400">
                          {plan.periodDays}-day cycle · {plan.code}
                        </p>
                      </div>
                      <Badge tone={plan.isActive ? 'green' : 'gray'}>
                        {plan.isActive ? 'Active' : 'Hidden'}
                      </Badge>
                    </div>

                    <div>
                      <p className="font-display text-2xl font-extrabold text-navy-800">
                        {formatUzs(plan.priceUzs)}
                      </p>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-navy-400">
                        <UsersIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {active.toLocaleString('en-US')} active{' '}
                        {active === 1 ? 'subscriber' : 'subscribers'}
                      </p>
                    </div>

                    {/* Change price */}
                    <form action={updatePlanPrice} className="mt-auto space-y-3 border-t border-navy-50 pt-4">
                      <input type="hidden" name="planId" value={plan.id} />
                      <Input
                        label="New price (UZS)"
                        name="priceUzs"
                        type="number"
                        min={0}
                        step={1000}
                        defaultValue={plan.priceUzs}
                        inputMode="numeric"
                      />
                      <Button type="submit" variant="primary" size="sm" className="w-full">
                        Update price
                      </Button>
                      <p className="text-[11px] leading-snug text-navy-400">
                        Applies to new sign-ups only. Current subscribers keep their rate.
                      </p>
                    </form>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* Promo codes */}
      <section>
        <SectionHeading
          eyebrow="Promotions"
          title="Promo codes"
          subtitle="Create discount codes and track their redemptions."
          className="mb-5"
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Create form */}
          <Card className="lg:col-span-1">
            <CardBody>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-400/20 text-accent-600">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-display text-base font-bold text-navy-800">New promo code</h3>
              </div>
              <form action={createPromoCode} className="space-y-3">
                <Input
                  label="Code"
                  name="code"
                  placeholder="WELCOME20"
                  required
                  maxLength={32}
                />
                <div>
                  <label
                    htmlFor="discountType"
                    className="mb-1.5 block text-sm font-medium text-navy-700"
                  >
                    Discount type
                  </label>
                  <select
                    id="discountType"
                    name="discountType"
                    defaultValue="PERCENT"
                    className="w-full rounded-xl border border-navy-200 bg-white px-3 py-2.5 text-sm text-navy-800 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-400/40"
                  >
                    <option value="PERCENT">Percent off (%)</option>
                    <option value="FIXED">Fixed amount (UZS)</option>
                  </select>
                </div>
                <Input
                  label="Amount"
                  name="amount"
                  type="number"
                  min={1}
                  placeholder="20"
                  required
                  inputMode="numeric"
                />
                <Button type="submit" variant="accent" size="sm" className="w-full">
                  Create code
                </Button>
                <p className="text-[11px] leading-snug text-navy-400">
                  Percent codes are capped at 100. Codes are unique and stored uppercase.
                </p>
              </form>
            </CardBody>
          </Card>

          {/* List */}
          <div className="lg:col-span-2">
            {promoCodes.length === 0 ? (
              <Card className="h-full">
                <CardBody className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-navy-500">
                    <TicketPercent className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="mt-4 font-display text-lg font-bold text-navy-800">
                    No promo codes yet
                  </p>
                  <p className="mx-auto mt-1 max-w-xs text-sm text-navy-500">
                    Create your first code to offer a discount on any plan.
                  </p>
                </CardBody>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <ul className="divide-y divide-navy-50">
                  {promoCodes.map((promo) => {
                    const exhausted =
                      promo.maxRedemptions != null && promo.redemptions >= promo.maxRedemptions
                    const expired = promo.validUntil != null && promo.validUntil < new Date()
                    const live = promo.isActive && !exhausted && !expired
                    return (
                      <li
                        key={promo.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-4"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold tracking-wide text-navy-800">
                              {promo.code}
                            </span>
                            <Badge tone={live ? 'green' : 'gray'}>
                              {live ? 'Active' : expired ? 'Expired' : exhausted ? 'Used up' : 'Off'}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-navy-400">
                            {promo.discountType === 'PERCENT'
                              ? `${promo.amount}% off`
                              : `${formatUzs(promo.amount)} off`}
                            {promo.planId ? ' · single plan' : ' · any plan'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-navy-700">
                            {promo.redemptions.toLocaleString('en-US')}
                            {promo.maxRedemptions != null
                              ? ` / ${promo.maxRedemptions.toLocaleString('en-US')}`
                              : ''}
                          </p>
                          <p className="text-xs text-navy-400">redemptions</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
