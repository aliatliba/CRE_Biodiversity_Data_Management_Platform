import { Search } from 'lucide-react'

interface SpeciesSearchProps {
  familyFilter: string
  onFamilyChange: (value: string) => void
  nationalStatusFilter: string
  onNationalStatusChange: (value: string) => void
}

export function SpeciesSearch({
  familyFilter,
  onFamilyChange,
  nationalStatusFilter,
  onNationalStatusChange,
}: SpeciesSearchProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full max-w-xs">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-950/35" />
        <input
          value={familyFilter}
          onChange={(e) => onFamilyChange(e.target.value)}
          placeholder="Filter by family…"
          className="h-11 w-full rounded-xl border border-mist-200 bg-paper-0 pl-10 pr-4 text-sm outline-none transition-colors focus:border-canopy-600"
        />
      </div>
      <select
        value={nationalStatusFilter}
        onChange={(e) => onNationalStatusChange(e.target.value)}
        className="h-11 rounded-xl border border-mist-200 bg-paper-0 px-3.5 text-sm text-ink-950/80 outline-none transition-colors focus:border-canopy-600"
      >
        <option value="">All national statuses</option>
        <option value="Protected">Protected</option>
        <option value="Non Protected">Non Protected</option>
      </select>
    </div>
  )
}
