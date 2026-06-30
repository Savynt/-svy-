'use client'

import { motion, type Variants } from 'framer-motion'
import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

const easeOut: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

interface AnimateInProps {
  children: ReactNode
  className?: string
  delay?: number
  from?: 'bottom' | 'left' | 'right' | 'none'
}

export function AnimateIn({ children, className, delay = 0, from = 'bottom' }: AnimateInProps) {
  const initial =
    from === 'bottom' ? { opacity: 0, y: 28 }
    : from === 'left'  ? { opacity: 0, x: -28 }
    : from === 'right' ? { opacity: 0, x: 28 }
    : { opacity: 0 }

  return (
    <motion.div
      initial={initial}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: easeOut }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOut } },
}

export function AnimateStagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={staggerContainer}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

export function AnimateStaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItem} className={cn(className)}>
      {children}
    </motion.div>
  )
}
