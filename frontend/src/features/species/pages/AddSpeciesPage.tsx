import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Search } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import * as speciesService from '../services/speciesService'
import * as siteService from '@/features/sites/services/siteService'
import type { Site } from '@/features/sites/types'
import type { Species, SpeciesLookupDraft } from '../types'
import { DuplicateSpeciesDialog } from '../components/DuplicateSpeciesDialog'
import { SpeciesReviewForm, type ReviewFormValues } from '../components/SpeciesReviewForm'

import {
  getCompletenessLabel,
  getDraftCompletenessStatus,
  getCompletenessTone,
} from '@/lib/speciesCompleteness'

type Step = 'search' | 'review'

const EMPTY_VALUES: ReviewFormValues = {
  common_name: '',
  guild: '',
  ecosystem_service: '',
  habitat: '',
  typology: '',
  endemism: '',
  potential_threats: '',
  reference: '',
}

export function AddSpeciesPage() {
  const navigate = useNavigate()

  const [sites, setSites] = useState<Site[]>([])
  const [siteId, setSiteId] = useState<number | ''>('')
  const [scientificName, setScientificName] = useState('')
  const [step, setStep] = useState<Step>('search')

  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [duplicate, setDuplicate] = useState<Species | null>(null)
  const [isAssociating, setIsAssociating] = useState(false)

  const [draft, setDraft] = useState<SpeciesLookupDraft | null>(null)
  const [values, setValues] = useState<ReviewFormValues>(EMPTY_VALUES)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    siteService.listSites().then(setSites).catch(() => setSites([]))
  }, [])

  async function handleSearch() {
    setError(null)
    if (!scientificName.trim()) {
      setError('Enter a scientific name.')
      return
    }
    if (!siteId) {
      setError('Choose a site first.')
      return
    }
    setIsChecking(true)
    try {
      const result = await speciesService.checkDuplicate(scientificName.trim())
      if (result.exists && result.species) {
        setDuplicate(result.species)
        return
      }
      const lookupDraft = await speciesService.lookupSpecies(scientificName.trim())
      setDraft(lookupDraft)
      setValues({
        ...EMPTY_VALUES,
        common_name: lookupDraft.taxonomy.common_name ?? '',
        guild: lookupDraft.traits.guild ?? '',
        ecosystem_service: lookupDraft.traits.ecosystem_service ?? '',
        habitat: lookupDraft.traits.habitat ?? '',
        typology: lookupDraft.traits.typology ?? '',
        endemism: lookupDraft.traits.endemism ?? '',
        potential_threats: lookupDraft.traits.potential_threats ?? '',
        reference: lookupDraft.traits.reference ?? '',
      })
      setStep('review')
    } catch {
      setError('Could not look up that name. Check the spelling and try again.')
    } finally {
      setIsChecking(false)
    }
  }

  async function handleAssociateDuplicate() {
    if (!duplicate || !siteId) return
    setIsAssociating(true)
    try {
      await speciesService.associateSpeciesWithSite(Number(siteId), duplicate.id)
      navigate(`/species/${duplicate.id}`)
    } catch {
      setError('Could not link this species to the site.')
      setDuplicate(null)
    } finally {
      setIsAssociating(false)
    }
  }

  async function handleSubmit() {
    if (!draft || !siteId) return
    setIsSubmitting(true)
    setError(null)
    try {
      const created = await speciesService.createSpecies({
        scientific_name: draft.scientific_name,
        site_id: Number(siteId),
        kingdom: draft.taxonomy.kingdom,
        class_name: draft.taxonomy.class_name,
        order_name: draft.taxonomy.order_name,
        family: draft.taxonomy.family,
        genus: draft.taxonomy.genus,
        species_epithet: draft.taxonomy.species_epithet,
        common_name: values.common_name || draft.taxonomy.common_name,
        field_sources: draft.field_sources,
        iucn_status: draft.conservation.iucn_status,
        iucn_trend: draft.conservation.iucn_trend,
        guild: values.guild || null,
        ecosystem_service: values.ecosystem_service || null,
        habitat: values.habitat || null,
        typology: values.typology || null,
        endemism: values.endemism || null,
        potential_threats: values.potential_threats || null,
        reference: values.reference || null,
      })
      navigate(`/species/${created.id}`)
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? (err.response?.data?.detail ?? 'Could not save this species.')
          : 'Could not save this species.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout title="Log a species">
      {step === 'search' && (
        <Card className="mx-auto max-w-lg">
          <h2 className="font-display text-lg font-bold text-canopy-950">Start with a name</h2>
          <p className="mt-1.5 text-sm text-ink-950/60">
            We'll check the catalogue for duplicates, then pull in taxonomy and conservation data
            automatically.
          </p>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-canopy-900/70">
                Site
              </label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value ? Number(e.target.value) : '')}
                className="h-12 rounded-xl border border-mist-200 bg-paper-0 px-4 text-[15px] outline-none transition-colors focus:border-canopy-600"
              >
                <option value="">Select a site…</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                    {site.code ? ` · ${site.code}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-canopy-900/70">
                Scientific name
              </label>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-950/35" />
                <input
                  value={scientificName}
                  onChange={(e) => setScientificName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Quercus afares"
                  className="h-12 w-full rounded-xl border border-mist-200 bg-paper-0 pl-11 pr-4 text-[15px] italic outline-none transition-colors focus:border-canopy-600"
                />
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <Button onClick={handleSearch} isLoading={isChecking} size="lg" className="mt-1 w-full">
              Check &amp; look up
            </Button>
          </div>
        </Card>
      )}

      {step === 'review' && draft && (
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-baseline justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-canopy-700">New record</p>
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-2xl font-bold italic text-canopy-950">
                  {draft.scientific_name}
                </h2>
                <Badge tone={draft.national_status === 'Protected' ? 'accent' : 'neutral'}>
                  {draft.national_status}
                </Badge>
              </div>
              {draft.input_scientific_name && (
                <p className="text-xs text-ink-950/45">
                  Resolved from synonym "{draft.input_scientific_name}"
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setStep('search')
                setDraft(null)
              }}
              className="text-sm font-medium text-canopy-700 underline underline-offset-4"
            >
              Start over
            </button>
          </div>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-ink-950/60">
                Review auto-fetched data before saving. Missing fields are highlighted below.
              </p>
              <Badge tone={getCompletenessTone(getDraftCompletenessStatus(draft))}>
                {getCompletenessLabel(getDraftCompletenessStatus(draft))}
              </Badge>
            </div>
            <SpeciesReviewForm draft={draft} values={values} onChange={setValues} />
          </Card>

          {error && (
            <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSubmit} isLoading={isSubmitting} size="lg">
              Save to catalogue
            </Button>
          </div>
        </div>
      )}

      {isChecking && step === 'search' && (
        <div className="mt-6 flex justify-center">
          <LoadingSpinner />
        </div>
      )}

      <DuplicateSpeciesDialog
        isOpen={!!duplicate}
        species={duplicate}
        onClose={() => setDuplicate(null)}
        onAssociate={handleAssociateDuplicate}
        isAssociating={isAssociating}
      />
    </AppLayout>
  )
}

export default AddSpeciesPage
