import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import * as speciesService from '../services/speciesService'
import type { Species, ValidationHistoryEntry } from '../types'
import { ValidationHistory } from '../components/ValidationHistory'
import { SourceBadge } from '../components/SourceBadge'

function Field({ label, value, source }: { label: string; value?: string | null; source?: string | null }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-canopy-900/60">{label}</span>
        <SourceBadge source={source} />
      </div>
      <p className="mt-1 text-[15px] text-ink-950/85">{value || '—'}</p>
    </div>
  )
}

export function SpeciesDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [species, setSpecies] = useState<Species | null>(null)
  const [history, setHistory] = useState<ValidationHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const sources = species?.field_sources ?? {}

  return (
    <AppLayout title="Species record">
      <Link to="/species" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-canopy-700 hover:underline">
        <ArrowLeft size={15} />
        Back to species
      </Link>

      {isLoading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner className="h-7 w-7" />
        </div>
      )}

      {!isLoading && error && <ErrorState message={error} onRetry={load} />}

      {!isLoading && !error && species && (
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
                {species.iucn_status && <Badge tone="warning">{species.iucn_status}</Badge>}
                <Badge tone={species.national_status === 'Protected' ? 'accent' : 'neutral'}>
                  {species.national_status}
                </Badge>
                <Badge tone="neutral" className="capitalize">
                  {species.status}
                </Badge>
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 font-display text-sm font-bold text-canopy-950">Taxonomy</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Kingdom" value={species.kingdom} source={sources.kingdom} />
                <Field label="Class" value={species.class_name} source={sources.class_name} />
                <Field label="Order" value={species.order_name} source={sources.order_name} />
                <Field label="Family" value={species.family} source={sources.family} />
                <Field label="Genus" value={species.genus} source={sources.genus} />
                <Field label="Species epithet" value={species.species_epithet} source={sources.species_epithet} />
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 font-display text-sm font-bold text-canopy-950">Conservation &amp; ecology</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="IUCN status" value={species.iucn_status} source={sources.iucn_status} />
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
