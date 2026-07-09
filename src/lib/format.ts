/**
 * Formatting helpers for the Savynt platform.
 * Prices are always shown in UZS with a thousands separator, e.g. 20000 -> "20,000 UZS".
 */

/** Format a number of som as "20,000 UZS". Non-finite input falls back to 0. */
export function formatUzs(amount: number): string {
  const value = Number.isFinite(amount) ? Math.round(amount) : 0
  return `${value.toLocaleString('en-US')} UZS`
}

/** Group digits with commas without a currency suffix, e.g. 12000 -> "12,000". */
export function formatNumber(value: number): string {
  return (Number.isFinite(value) ? value : 0).toLocaleString('en-US')
}

/** Clamp + round a percentage into the 0–100 range (integer). */
export function formatPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(Math.max(0, Math.min(100, value)))
}

/** Mask the local part of an email for display, e.g. "alisher@gmail.com" -> "al•••r@gmail.com". */
export function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at <= 0) return email
  const local = email.slice(0, at)
  const domain = email.slice(at)
  if (local.length <= 2) return `${local[0] ?? ''}•••${domain}`
  return `${local.slice(0, 2)}•••${local.slice(-1)}${domain}`
}

/** Human-friendly date, e.g. "6 Jun 2026". Accepts a Date or ISO string. */
export function formatDate(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Take the first letters of the first and last name for an avatar, e.g. ("Ali","Valiev") -> "AV". */
export function initials(firstName?: string | null, lastName?: string | null): string {
  const a = firstName?.trim()?.[0] ?? ''
  const b = lastName?.trim()?.[0] ?? ''
  return `${a}${b}`.toUpperCase() || '?'
}
