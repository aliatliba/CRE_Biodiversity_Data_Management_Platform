import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import * as speciesService from '../services/speciesService'
import type { Species } from '../types'

const IUCN_OPTIONS = ['', 'LC', 'NT', 'VU', 'EN', 'CR', 'DD', 'NE']

export function EditSpeciesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [species, setSpecies] = useState<Species | null>(null)
  const [form, setForm] = useState({
    guild: '',
    ecosystem_service: '',
    habitat: '',
    typology: '',
    endemism: '',
    potential_threats: '',
    reference: '',
    iucn_status: '',
    iucn_trend: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function load() {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const sp = await speciesService.getSpecies(Number(id))
      setSpecies(sp)
      setForm({
        guild: sp.guild ?? '',
        ecosystem_service: sp.ecosystem_service ?? '',
        habitat: sp.habitat ?? '',
        typology: sp.typology ?? '',
        endemism: sp.endemism ?? '',
        potential_threats: sp.potential_threats ?? '',
        reference: sp.reference ?? '',
        iucn_status: sp.iucn_status ?? '',
        iucn_trend: sp.iucn_trend ?? '',
      })
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!species) return
    setFormError(null)
    setIsSubmitting(true)
    try {
      const updated = await speciesService.updateSpecies(species.id, {
        guild: form.guild || null,
        ecosystem_service: form.ecosystem_service || null,
        habitat: form.habitat || null,
        typology: form.typology || null,
        endemism: form.endemism || null,
        potential_threats: form.potential_threats || null,
        reference: form.reference || null,
        iucn_status: form.iucn_status || null,
        iucn_trend: form.iucn_trend || null,
        updated_at: species.updated_at,
      })
      navigate(`/species/${updated.id}`)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setFormError('This record was updated by someone else. Refresh and try again.')
      } else {
        setFormError(
          axios.isAxiosError(err)
            ? (err.response?.data?.detail ?? 'Could not save changes.')
            : 'Could not save changes.'
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout title="Edit species">
      <Link
        to={id ? `/species/${id}` : '/species'}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-canopy-700 hover:underline"
      >
        <ArrowLeft size={15} />
        Back to species record
      </Link>

      {isLoading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner className="h-7 w-7" />
        </div>
      )}

      {!isLoading && error && <ErrorState message={error} onRetry={load} />}

      {!isLoading && !error && species && (
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl flex-col gap-6">
          <Card>
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-canopy-700">
              {species.family ?? 'Unclassified family'}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold italic text-canopy-950">
              {species.scientific_name}
            </h1>
            <p className="mt-2 text-sm text-ink-950/55">
              Taxonomy fields are read-only after creation. You can update conservation and ecological
              traits below.
            </p>
          </Card>

          <Card>
            <h2 className="mb-4 font-display text-sm font-bold text-canopy-950">
              Conservation status
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-canopy-900/60">
                  IUCN status
                </span>
                <select
                  value={form.iucn_status}
                  onChange={(e) => setForm((f) => ({ ...f, iucn_status: e.target.value }))}
                  className="h-11 rounded-xl border border-mist-200 bg-paper-0 px-3.5 text-sm outline-none focus:border-canopy-600"
                >
                  {IUCN_OPTIONS.map((opt) => (
                    <option key={opt || 'empty'} value={opt}>
                      {opt || '— Not set —'}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="IUCN trend"
                value={form.iucn_trend}
                onChange={(e) => setForm((f) => ({ ...f, iucn_trend: e.target.value }))}
              />
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 font-display text-sm font-bold text-canopy-950">
              Ecological traits
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Guild"
                value={form.guild}
                onChange={(e) => setForm((f) => ({ ...f, guild: e.target.value }))}
              />
              <Input
                label="Ecosystem service"
                value={form.ecosystem_service}
                onChange={(e) => setForm((f) => ({ ...f, ecosystem_service: e.target.value }))}
              />
              <Input
                label="Habitat"
                value={form.habitat}
                onChange={(e) => setForm((f) => ({ ...f, habitat: e.target.value }))}
              />
              <Input
                label="Typology"
                value={form.typology}
                onChange={(e) => setForm((f) => ({ ...f, typology: e.target.value }))}
              />
              <Input
                label="Endemism"
                value={form.endemism}
                onChange={(e) => setForm((f) => ({ ...f, endemism: e.target.value }))}
              />
              <Input
                label="Potential threats"
                value={form.potential_threats}
                onChange={(e) => setForm((f) => ({ ...f, potential_threats: e.target.value }))}
              />
            </div>
            <div className="mt-4">
              <Input
                label="Reference"
                value={form.reference}
                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              />
            </div>
          </Card>

          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
            >
              {formError}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" isLoading={isSubmitting}>
              Save changes
            </Button>
            <Link to={`/species/${species.id}`}>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      )}
    </AppLayout>
  )
}

export default EditSpeciesPage
