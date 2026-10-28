import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ComboboxProps {
  label: string
  value: string
  options: readonly string[]
  placeholder: string
  onChange: (value: string) => void
  /** Maximum options rendered at once; the list narrows as the user types. */
  maxVisible?: number
}

/**
 * Searchable single-select for long option lists (families, genera, ...),
 * where a native <select> with thousands of rows is unusable. Renders at most
 * `maxVisible` matches. Supports ArrowUp/Down, Enter and Escape.
 */
export function Combobox({
  label,
  value,
  options,
  placeholder,
  onChange,
  maxVisible = 50,
}: ComboboxProps) {
  const id = useId()
  const listId = `${id}-list`
  const containerRef = useRef<HTMLDivElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const found = needle
      ? options.filter((option) => option.toLowerCase().includes(needle))
      : options
    return found.slice(0, maxVisible)
  }, [options, query, maxVisible])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function select(next: string) {
    onChange(next)
    setIsOpen(false)
    setQuery('')
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((index) => Math.min(index + 1, matches.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && isOpen && matches[activeIndex]) {
      event.preventDefault()
      select(matches[activeIndex])
    } else if (event.key === 'Escape') {
      setIsOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium text-fg-muted"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={isOpen ? query : value}
          placeholder={value || placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
            setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          className="h-10 w-full rounded-xl border border-line-strong bg-surface px-3 pr-16 text-sm text-fg outline-none transition-colors duration-150 placeholder:text-fg-subtle hover:border-fg-subtle/50 focus:border-ring focus:ring-2 focus:ring-ring/20"
        />

        {value && (
          <button
            type="button"
            onClick={() => select('')}
            aria-label={`Clear ${label}`}
            className="absolute right-9 top-1/2 -translate-y-1/2 rounded-md p-1 text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg"
          >
            <X size={14} />
          </button>
        )}

        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle"
        />
      </div>

      {isOpen && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-overlay"
        >
          {matches.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-fg-subtle">No matches.</li>
          )}

          {matches.map((option, index) => (
            <li
              key={option}
              role="option"
              aria-selected={option === value}
              onMouseDown={(event) => {
                event.preventDefault()
                select(option)
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                'cursor-pointer rounded-md px-3 py-2 text-sm text-fg',
                index === activeIndex && 'bg-surface-muted',
                option === value && 'font-semibold text-primary',
              )}
            >
              {option}
            </li>
          ))}

          {options.length > matches.length && (
            <li className="px-3 py-2 text-center text-xs text-fg-subtle">
              Type to narrow {options.length.toLocaleString()} options…
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
