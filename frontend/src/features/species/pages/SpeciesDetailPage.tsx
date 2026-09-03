import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { useAuth } from '@/hooks/useAuth'
import {
  getCompletenessLabel,
  getCompletenessStatus,
  getCompletenessTone,
} from '@/lib/speciesCompleteness'
import * as speciesService from '../services/speciesService'
import type { Species, ValidationHistoryEntry } from '../types'
import { ValidationHistory } from '../components/ValidationHistory'
import { SourceBadge } from '../components/SourceBadge'

const CRITICAL_TAXONOMY_LABELS: Record<string, string> = {
  kingdom: 'Kingdom',
  class_name: 'Class',
  order_name: 'Order',
  family: 'Family',
  genus: 'Genus',
}

function Field({
  label,
  value,
  source,
  critical = false,
  warnIfMissing = false,
}: {
  label: string
  value?: string | null
  source?: string | null
  critical?: boolean
  warnIfMissing?: boolean
}) {
  const isMissing = !value || value.trim() === ''
  const showWarning = isMissing && (critical || warnIfMissing)
  const missingClass = critical
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-amber-200 bg-amber-50 text-amber-800'

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-canopy-900/60">
          {label}
        </span>
        <SourceBadge source={source} />
      </div>
      {showWarning ? (
        <p className={`mt-1 rounded-lg border px-3 py-2 text-[15px] font-medium ${missingClass}`}>
          {critical ? 'Missing — critical taxonomy data' : 'Missing — conservation data'}
        </p>
      ) : (
        <p className="mt-1 text-[15px] text-ink-950/85">{value || '—'}</p>
      )}
    </div>
  )
}

export function SpeciesDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [species, setSpecies] = useState<Species | null>(null)
  const [history, setHistory] = useState<ValidationHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function load() {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const [sp, hist] = await Promise.all([
        speciesService.getSpecies(Number(id)),
        speciesService.getSpeciesHistory(Number(id)),
      ])
      setSpecies(sp)
      setHistory(hist)
    } catch {
      setError('Could not load this species.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleDelete() {
    if (!species) return
    if (!confirm(`Delete "${species.scientific_name}" permanently? This can't be undone.`)) return
    setIsDeleting(true)
    try {
      await speciesService.deleteSpecies(species.id)
      navigate('/species')
    } catch {
      alert('Could not delete species.')
    } finally {
      setIsDeleting(false)
    }
  }

  const sources = species?.field_sources ?? {}
  const completeness = species ? getCompletenessStatus(species) : null

  return (
    <AppLayout title="Species record">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/species"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-canopy-700 hover:underline"
        >
          <ArrowLeft size={15} />
          Back to species
        </Link>
        {species && (
          <div className="flex gap-2">
            <Link to={`/species/${species.id}/edit`}>
              <Button variant="secondary" className="gap-2">
                <Edit2 size={15} />
                Edit
              </Button>
            </Link>
            {isAdmin && (
              <Button
                variant="ghost"
                className="gap-2 text-red-600 hover:bg-red-50"
                onClick={handleDelete}
                isLoading={isDeleting}
              >
                <Trash2 size={15} />
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner className="h-7 w-7" />
        </div>
      )}

      {!isLoading && error && <ErrorState message={error} onRetry={load} />}

      {!isLoading && !error && species && completeness && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-6">
            <Card>
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-canopy-700">
                {species.family ?? 'Unclassified family'}
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold italic text-canopy-950">
                {species.scientific_name}
              </h1>
              {species.common_name && <p className="text-ink-950/60">{species.common_name}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {species.iucn_status ? (
                  <Badge tone="warning">{species.iucn_status}</Badge>
                ) : (
                  <Badge tone="warning">No IUCN status</Badge>
                )}
                <Badge tone={species.national_status === 'Protected' ? 'accent' : 'neutral'}>
                  {species.national_status}
                </Badge>
                <Badge tone="neutral" className="capitalize">
                  {species.status}
                </Badge>
                <Badge tone={getCompletenessTone(completeness)}>
                  {getCompletenessLabel(completeness)}
                </Badge>
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 font-display text-sm font-bold text-canopy-950">Taxonomy</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Object.entries(CRITICAL_TAXONOMY_LABELS).map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    value={species[key as keyof Species] as string | null}
                    source={sources[key]}
                    critical
                  />
                ))}
                <Field
                  label="Species epithet"
                  value={species.species_epithet}
                  source={sources.species_epithet}
                />
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 font-display text-sm font-bold text-canopy-950">
                Conservation &amp; ecology
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="IUCN status"
                  value={species.iucn_status}
                  source={sources.iucn_status}
                  warnIfMissing
                />
                <Field label="IUCN trend" value={species.iucn_trend} source={sources.iucn_trend} />
                <Field label="Guild" value={species.guild} />
                <Field label="Ecosystem service" value={species.ecosystem_service} />
                <Field label="Habitat" value={species.habitat} />
                <Field label="Typology" value={species.typology} />
                <Field label="Endemism" value={species.endemism} />
                <Field label="Potential threats" value={species.potential_threats} />
              </div>
              {species.reference && (
                <div className="mt-4 border-t border-canopy-900/[0.08] pt-4">
                  <Field label="Reference" value={species.reference} />
                </div>
              )}
            </Card>
          </div>

          <Card className="h-fit">
            <h2 className="mb-4 font-display text-sm font-bold text-canopy-950">Validation history</h2>
            <ValidationHistory entries={history} />
          </Card>
        </div>
      )}
    </AppLayout>
  )
}

export default SpeciesDetailPage
