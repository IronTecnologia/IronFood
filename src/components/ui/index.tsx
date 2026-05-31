import { cn } from '../../utils/cn'
import { Loader2, X } from 'lucide-react'
import { forwardRef, type InputHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react'

// ──────────────────────────────────────────
// Button
// ──────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
type BtnSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
  loading?: boolean
  leftIcon?: ReactNode
}

const btnBase = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'
const btnVariants: Record<BtnVariant, string> = {
  primary:   'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400',
  danger:    'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500',
  ghost:     'text-slate-600 hover:bg-slate-100 focus:ring-slate-400',
  outline:   'border border-slate-200 text-slate-700 hover:bg-slate-50 focus:ring-slate-400',
}
const btnSizes: Record<BtnSize, string> = {
  sm: 'text-xs px-3 py-1.5 h-7',
  md: 'text-sm px-4 py-2 h-9',
  lg: 'text-sm px-5 py-2.5 h-11',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, leftIcon, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(btnBase, btnVariants[variant], btnSizes[size], className)}
      {...props}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : leftIcon}
      {children}
    </button>
  )
)
Button.displayName = 'Button'

// ──────────────────────────────────────────
// Input
// ──────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow',
            error && 'border-rose-400 focus:ring-rose-400',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-500">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

// ──────────────────────────────────────────
// Select
// ──────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow',
            error && 'border-rose-400',
            className
          )}
          {...props}
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-rose-500">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'

// ──────────────────────────────────────────
// Textarea
// ──────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const taId = id ?? label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label htmlFor={taId} className="text-sm font-medium text-slate-700">{label}</label>}
        <textarea
          ref={ref}
          id={taId}
          rows={3}
          className={cn(
            'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 resize-none',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow',
            error && 'border-rose-400',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-500">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

// ──────────────────────────────────────────
// Badge
// ──────────────────────────────────────────
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger:  'bg-rose-100 text-rose-700',
  info:    'bg-sky-100 text-sky-700',
  purple:  'bg-purple-100 text-purple-700',
}

export function Badge({ variant = 'default', className, style, children }: {
  variant?: BadgeVariant; className?: string; style?: React.CSSProperties; children: ReactNode
}) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', badgeVariants[variant], className)} style={style}>
      {children}
    </span>
  )
}

// ──────────────────────────────────────────
// Card
// ──────────────────────────────────────────
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm', className)}>
      {children}
    </div>
  )
}

// ──────────────────────────────────────────
// Modal
// ──────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-white rounded-2xl shadow-xl w-full animate-fade-in', maxWidth)}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">{title}</h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
              <X size={18} className="text-slate-500" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
// Spinner
// ──────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-indigo-600" />
}

// ──────────────────────────────────────────
// Empty State
// ──────────────────────────────────────────
export function EmptyState({ icon, title, description }: {
  icon?: ReactNode; title: string; description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-slate-300 mb-4">{icon}</div>}
      <p className="font-medium text-slate-600">{title}</p>
      {description && <p className="text-sm text-slate-400 mt-1 max-w-xs">{description}</p>}
    </div>
  )
}
