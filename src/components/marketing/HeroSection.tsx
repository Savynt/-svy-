'use client'

import { motion, type Variants } from 'framer-motion'
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CardBody } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Logo } from '@/components/Logo'
import { formatUzs } from '@/lib/format'
const ease: [number, number, number, number] = [0.22, 1, 0.36, 1]

const heroLeft: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
}
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
}
const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease } },
}
const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease } },
}
const cardVariant: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, delay: 0.3, ease } },
}

export function HeroSection({ price }: { price: number }) {
  return (
    <section className="relative overflow-hidden bg-navy-900 text-white">
      {/* Aurora blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-blob absolute -right-16 -top-16 h-[420px] w-[420px] rounded-full bg-[#4dc3ee]/20 blur-[80px]" />
        <div
          className="animate-blob absolute -bottom-20 -left-10 h-[360px] w-[360px] rounded-full bg-accent-400/15 blur-[80px]"
          style={{ animationDelay: '3s', animationDuration: '13s' }}
        />
        <div
          className="animate-blob absolute left-1/2 top-1/3 h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-navy-600/40 blur-[60px]"
          style={{ animationDelay: '6s' }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <div className="container-app relative py-20 sm:py-24 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">

          {/* ── Left: animated text ── */}
          <motion.div initial="hidden" animate="visible" variants={heroLeft}>
            <motion.div variants={scaleIn}>
              <Badge tone="accent">
                <Sparkles className="h-3.5 w-3.5" />
                IELTS · SAT · General English prep
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-5 font-display text-4xl font-extrabold leading-[1.07] tracking-tight sm:text-5xl lg:text-[3.5rem]"
            >
              Pass your English exam{' '}
              <span className="relative">
                <span className="text-[#4dc3ee]">with confidence.</span>
                <motion.span
                  className="absolute -bottom-1 left-0 h-[2px] w-full origin-left rounded-full bg-[#4dc3ee]/50"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.65, delay: 0.9, ease }}
                />
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-5 max-w-xl text-lg leading-relaxed text-navy-200">
              One subscription unlocks real exam-style mock tests, instant scoring, band estimates
              and progress tracking — everything you need to reach your target, in one place.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/register" variant="accent" size="lg">
                Start — {formatUzs(price)} / month
              </Button>
              <Button href="/register" variant="secondary" size="lg">
                Explore IELTS
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>

            <motion.p variants={fadeIn} className="mt-6 flex items-center gap-2 text-sm font-medium text-navy-300">
              <span aria-hidden="true">🇺🇿</span>
              Built for learners in Uzbekistan
            </motion.p>
          </motion.div>

          {/* ── Right: glass card ── */}
          <div className="relative">

            {/* Glow behind card */}
            <div className="absolute inset-0 -z-0 translate-y-8 scale-90 rounded-3xl bg-[#4dc3ee]/20 blur-3xl" />

            <motion.div
              initial="hidden"
              animate="visible"
              variants={cardVariant}
              className="animate-float relative z-10 rounded-2xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl"
            >
              <CardBody className="space-y-5">
                <div className="flex items-center justify-between">
                  <Logo size={48} variant="light" />
                  <Badge tone="green">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Today
                  </Badge>
                </div>

                <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-sky-300">
                      Sample · General English
                    </p>
                    <Badge tone="sky">Q1 / 20</Badge>
                  </div>
                  <p className="font-medium text-white">
                    One of the most interesting sports _____ football.
                  </p>
                  <div className="mt-3 space-y-2">
                    <GlassOption label="A) is" active correct />
                    <GlassOption label="B) are" />
                    <GlassOption label="C) were" />
                    <GlassOption label="D) have" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-white">Weekly goal</span>
                    <span className="font-semibold text-sky-300">68%</span>
                  </div>
                  <ProgressBar value={68} />
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <GlassStat value="3" label="Tracks" />
                    <GlassStat value="5.0→7.0" label="Band" />
                    <GlassStat value="12" label="Day streak" />
                  </div>
                </div>
              </CardBody>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  )
}

function GlassOption({ label, active = false, correct = false }: { label: string; active?: boolean; correct?: boolean }) {
  const isCorrectActive = active && correct
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
        isCorrectActive
          ? 'border-emerald-400/60 bg-emerald-500/20 text-white'
          : active
          ? 'border-[#4dc3ee]/50 bg-[#4dc3ee]/15 text-white'
          : 'border-white/10 bg-white/5 text-navy-200'
      }`}
    >
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border-2 ${
          isCorrectActive ? 'border-emerald-400 bg-emerald-400' : active ? 'border-[#4dc3ee]' : 'border-white/25'
        }`}
      >
        {isCorrectActive && <span className="text-[10px] font-bold text-navy-900">✓</span>}
        {active && !correct && <span className="h-2 w-2 rounded-full bg-[#4dc3ee]" />}
      </span>
      {label}
    </div>
  )
}

function GlassStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 px-2 py-3 text-center">
      <p className="font-display text-base font-extrabold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-sky-300">{label}</p>
    </div>
  )
}
