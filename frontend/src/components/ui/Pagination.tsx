import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  pages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  className?: string
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = [1]

  if (current > 3) pages.push('ellipsis')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (current < total - 2) pages.push('ellipsis')

  pages.push(total)
  return pages
}

export function Pagination({
  page,
  pages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const pageNumbers = getPageNumbers(page, pages)

  return (
    <div
      className={cn(
        'flex flex-col gap-3 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="tabular-nums">
          Showing {from}–{to} of {total}
        </span>
        {onPageSizeChange && (
          <label className="flex items-center gap-2">
            <span className="text-xs">Per page</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-lg border border-line-strong bg-surface px-2 text-xs text-fg outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              {[10, 15, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-1">
        <NavButton
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          aria-label="First page"
        >
          <ChevronsLeft size={15} />
        </NavButton>
        <NavButton
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} />
        </NavButton>

        <div className="hidden items-center gap-1 px-1 sm:flex">
          {pageNumbers.map((num, idx) =>
            num === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-fg-subtle">
                …
              </span>
            ) : (
              <button
                key={num}
                onClick={() => onPageChange(num)}
                aria-current={num === page ? 'page' : undefined}
                className={cn(
                  'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold tabular-nums transition-colors',
                  num === page
                    ? 'bg-primary text-on-primary'
                    : 'text-fg-muted hover:bg-surface-muted hover:text-fg'
                )}
              >
                {num}
              </button>
            )
          )}
        </div>

        <span className="px-2 text-xs tabular-nums sm:hidden">
          {page} / {pages}
        </span>

        <NavButton
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
        >
          <ChevronRight size={15} />
        </NavButton>
        <NavButton
          onClick={() => onPageChange(pages)}
          disabled={page >= pages}
          aria-label="Last page"
        >
          <ChevronsRight size={15} />
        </NavButton>
      </div>
    </div>
  )
}

function NavButton({
  children,
  disabled,
  onClick,
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode
  disabled: boolean
  onClick: () => void
  'aria-label': string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}
