'use client'

import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode
  /** error message — shown in red, also wires aria-invalid + aria-describedby */
  error?: string
  /** helper text shown under the field when there is no error */
  hint?: ReactNode
  /** optional element rendered inside the field on the right (e.g. a show/hide toggle) */
  trailing?: ReactNode
  wrapperClassName?: string
}

/**
 * Labeled text input for the SVY platform.
 *
 * T9 / autocorrect protection is BAKED IN — every input ships with
 * autoCorrect / autoCapitalize / autoComplete off and spellCheck disabled so
 * exam answers and credentials are never mangled by the keyboard. Auth screens
 * can override these per the contract (e.g. autoComplete="email" / "new-password").
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    hint,
    trailing,
    wrapperClassName,
    className,
    id,
    type = 'text',
    required,
    // T9-protection defaults — overridable by the caller
    autoCorrect = 'off',
    autoCapitalize = 'off',
    autoComplete = 'off',
    spellCheck = false,
    ...rest
  },
  ref,
) {
  const reactId = useId()
  const inputId = id ?? reactId
  const describedById = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  return (
    <div className={cn('w-full', wrapperClassName)}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-navy-700">
          {label}
          {required && <span className="ml-0.5 text-accent-600">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={type}
          required={required}
          autoCorrect={autoCorrect}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          spellCheck={spellCheck}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedById}
          className={cn(
            'block w-full rounded-xl border bg-white px-3.5 py-2.5 text-navy-800 placeholder:text-navy-300',
            'min-h-[44px] transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-50',
            'disabled:cursor-not-allowed disabled:bg-navy-50 disabled:text-navy-400',
            error
              ? 'border-red-400 focus-visible:ring-red-400'
              : 'border-navy-200 hover:border-navy-300 focus-visible:ring-navy-400',
            trailing && 'pr-11',
            className,
          )}
          {...rest}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-navy-400">
            {trailing}
          </div>
        )}
      </div>
      {error ? (
        <p id={describedById} className="mt-1.5 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={describedById} className="mt-1.5 text-sm text-navy-400">
          {hint}
        </p>
      ) : null}
    </div>
  )
})

export default Input
