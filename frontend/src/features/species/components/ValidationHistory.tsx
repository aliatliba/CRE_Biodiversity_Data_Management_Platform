import { History } from 'lucide-react'
import type { ValidationHistoryEntry } from '../types'

export function ValidationHistory({ entries }: { entries: ValidationHistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-ink-950/45">No validation history yet.</p>
  }

  return (
    <ol className="flex flex-col gap-4">
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-canopy-700/10 text-canopy-700">
            <History size={12} />
          </div>
          <div>
            <p className="text-sm font-medium capitalize text-ink-950">{entry.action}</p>
            <p className="text-xs text-ink-950/45">
              {new Date(entry.validated_at).toLocaleString()}
            </p>
            {Object.keys(entry.changed_fields).length > 0 && (
              <p className="mt-1 font-mono text-xs text-ink-950/50">
                {Object.keys(entry.changed_fields).join(', ')}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
