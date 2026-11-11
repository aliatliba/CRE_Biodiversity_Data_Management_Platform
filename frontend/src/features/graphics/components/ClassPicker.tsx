import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import type { SiteClass } from '../types'

interface ClassPickerProps {
  siteSelected: boolean
  classes: SiteClass[]
  isLoading: boolean
  error: string | null
  selected: string[]
  onChange: (selected: string[]) => void
  disabled?: boolean
}

/** Checklist of the taxonomic classes found among a site's validated species. */
export function ClassPicker({
  siteSelected,
  classes,
  isLoading,
  error,
  selected,
  onChange,
  disabled = false,
}: ClassPickerProps) {
  const allSelected = classes.length > 0 && selected.length === classes.length

  function toggle(name: string) {
    onChange(
      selected.includes(name) ? selected.filter((c) => c !== name) : [...selected, name],
    )
  }

  let body
  if (!siteSelected) {
    body = <p className="text-xs text-fg-subtle">Select a site to see its classes.</p>
  } else if (isLoading) {
    body = (
      <div className="flex h-11 items-center justify-center">
        <LoadingSpinner className="h-5 w-5" />
      </div>
    )
  } else if (error) {
    body = <p className="text-xs text-danger">{error}</p>
  } else if (classes.length === 0) {
    body = (
      <p className="text-xs text-fg-subtle">
        No validated species with a class at this site.
      </p>
    )
  } else {
    body = (
      <div className="max-h-56 overflow-y-auto rounded-xl border border-line p-1.5">
        {classes.map((cls) => (
          <label
            key={cls.class_name}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-fg transition-colors hover:bg-surface-muted has-[:disabled]:cursor-default has-[:disabled]:opacity-60"
          >
            <input
              type="checkbox"
              checked={selected.includes(cls.class_name)}
              onChange={() => toggle(cls.class_name)}
              disabled={disabled}
              className="h-3.5 w-3.5 rounded border-line-strong text-canopy-700 focus:ring-ring"
            />
            <span className="min-w-0 flex-1 truncate">{cls.class_name}</span>
            <span className="text-xs tabular-nums text-fg-subtle">{cls.species_count}</span>
          </label>
        ))}
      </div>
    )
  }

  return (
    <div role="group" aria-labelledby="graphics-classes-label">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span id="graphics-classes-label" className="text-xs font-semibold text-fg-muted">
          Classes
          {selected.length > 0 && (
            <span className="ml-1 font-normal text-fg-subtle">({selected.length} selected)</span>
          )}
        </span>
        {siteSelected && classes.length > 1 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(allSelected ? [] : classes.map((c) => c.class_name))}
            className="cursor-pointer text-xs font-medium text-canopy-700 hover:underline disabled:opacity-60"
          >
            {allSelected ? 'Clear' : 'Select all'}
          </button>
        )}
      </div>
      {body}
    </div>
  )
}
