import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Edit2, Trash2, Pencil } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
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
import type { Species, SpeciesUpdateInput, ValidationHistoryEntry } from '../types'
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

// Fields the backend allows editing on an existing record (see
// PERMITTED_EDIT_FIELDS in species_service.py) — status, ids, and audit
// fields are intentionally excluded.
type EditableFields = Omit<SpeciesUpdateInput, 'updated_at'>

function toEditableFields(species: Species): EditableFields {
  return {
    kingdom: species.kingdom ?? '',
    class_name: species.class_name ?? '',
    order_name: species.order_name ?? '',
    family: species.family ?? '',
    genus: species.genus ?? '',
    species_epithet: species.species_epithet ?? '',
    common_name: species.common_name ?? '',
    iucn_status: species.iucn_status ?? '',
    iucn_trend: species.iucn_trend ?? '',
    guild: species.guild ?? '',
    ecosystem_service: species.ecosystem_service ?? '',
    habitat: species.habitat ?? '',
    typology: species.typology ?? '',
    endemism: species.endemism ?? '',
    potential_threats: species.potential_threats ?? '',
    reference: species.reference ?? '',
  }
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

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<EditableFields | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

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

  function startEditing() {
    if (!species) return
    setForm(toEditableFields(species))
    setSaveError(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setForm(null)
    setSaveError(null)
  }

  function set<K extends keyof EditableFields>(key: K, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleSave() {
    if (!species || !form) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const payload: SpeciesUpdateInput = {
        updated_at: species.updated_at,
      }

      let changedAny = false

      ;(Object.keys(form) as Array<keyof EditableFields>).forEach((key) => {
        const original = (species[key as keyof Species] ?? '') as string
        const next = form[key] ?? ''

        if (next !== original) {
          payload[key] = next || null
          changedAny = true
        }
      })

      if (!changedAny) {
        setIsEditing(false)
        return
      }

      const updated = await speciesService.updateSpecies(species.id, payload)
      setSpecies(updated)

      const hist = await speciesService.getSpeciesHistory(species.id)
      setHistory(hist)

      setIsEditing(false)
      setForm(null)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setSaveError('This record was updated elsewhere. Refresh and try again.')
      } else if (axios.isAxiosError(err) && err.response?.data?.detail) {
        setSaveError(String(err.response.data.detail))
      } else {
        setSaveError('Could not save these changes.')
      }
    } finally {
      setIsSaving(false)
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

        {species && !isEditing && (
          <div className="flex gap-2">
            <Button
              size="md"
              variant="secondary"
              onClick={startEditing}
              className="gap-2"
            >
              <Pencil size={14} />
              Edit record
            </Button>

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
              {!isEditing ? (
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
                  <Field label="Common name" value={species.common_name} />
                </div>
              ) : (
                form && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label="Kingdom" value={form.kingdom ?? ''} onChange={(e) => set('kingdom', e.target.value)} />
                    <Input label="Class" value={form.class_name ?? ''} onChange={(e) => set('class_name', e.target.value)} />
                    <Input label="Order" value={form.order_name ?? ''} onChange={(e) => set('order_name', e.target.value)} />
                    <Input label="Family" value={form.family ?? ''} onChange={(e) => set('family', e.target.value)} />
                    <Input label="Genus" value={form.genus ?? ''} onChange={(e) => set('genus', e.target.value)} />
                    <Input
                      label="Species epithet"
                      value={form.species_epithet ?? ''}
                      onChange={(e) => set('species_epithet', e.target.value)}
                    />
                    <Input
                      label="Common name"
                      value={form.common_name ?? ''}
                      onChange={(e) => set('common_name', e.target.value)}
                    />
                  </div>
                )
              )}
            </Card>

            <Card>
              <h2 className="mb-4 font-display text-sm font-bold text-canopy-950">
                Conservation &amp; ecology
              </h2>
              {!isEditing ? (
                <>
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
                </>
              ) : (
                form && (
                  <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input label="IUCN status" value={form.iucn_status ?? ''} onChange={(e) => set('iucn_status', e.target.value)} />
                      <Input label="IUCN trend" value={form.iucn_trend ?? ''} onChange={(e) => set('iucn_trend', e.target.value)} />
                      <Input label="Guild" value={form.guild ?? ''} onChange={(e) => set('guild', e.target.value)} />
                      <Input
                        label="Ecosystem service"
                        value={form.ecosystem_service ?? ''}
                        onChange={(e) => set('ecosystem_service', e.target.value)}
                      />
                      <Input label="Habitat" value={form.habitat ?? ''} onChange={(e) => set('habitat', e.target.value)} />
                      <Input label="Typology" value={form.typology ?? ''} onChange={(e) => set('typology', e.target.value)} />
                      <Input label="Endemism" value={form.endemism ?? ''} onChange={(e) => set('endemism', e.target.value)} />
                      <Input
                        label="Potential threats"
                        value={form.potential_threats ?? ''}
                        onChange={(e) => set('potential_threats', e.target.value)}
                      />
                    </div>
                    <div className="mt-4 border-t border-canopy-900/[0.08] pt-4">
                      <Input label="Reference" value={form.reference ?? ''} onChange={(e) => set('reference', e.target.value)} />
                    </div>
                  </>
                )
              )}

              {isEditing && (
                <div className="mt-6 flex flex-col gap-3">
                  {saveError && (
                    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
                      {saveError}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button onClick={handleSave} isLoading={isSaving}>
                      Save changes
                    </Button>
                    <Button variant="secondary" onClick={cancelEditing} disabled={isSaving}>
                      Cancel
                    </Button>
                  </div>
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