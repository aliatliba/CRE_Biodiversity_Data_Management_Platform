
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  MapPin,
  RotateCcw,
  Save,
  Search,
  Trash2,
} from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

import * as speciesService from '../services/speciesService'
import * as siteService from '@/features/sites/services/siteService'

import type {
  IucnAssessment,
  Species,
  SpeciesCreateInput,
  SpeciesLookupDraft,
} from '../types'

import type { Site } from '@/features/sites/types'

import {
  SpeciesReviewForm,
  type ReviewFormValues,
} from '../components/SpeciesReviewForm'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface BatchSpeciesItem {
  id: string
  inputScientificName: string
  draft: SpeciesLookupDraft | null
  duplicate: boolean
  existingSpecies: Species | null
  error: string | null
  selectedIucnAssessment: IucnAssessment | null
  values: ReviewFormValues
  expanded: boolean
  saveStatus: SaveStatus
  saveError: string | null
}

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

function createId() {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`
}

function normalizeScientificName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function parseScientificNames(value: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const rawLine of value.split('\n')) {
    const name = rawLine.trim().replace(/\s+/g, ' ')

    if (!name) continue

    const normalized = normalizeScientificName(name)

    if (seen.has(normalized)) continue

    seen.add(normalized)
    result.push(name)
  }

  return result
}

function getInitialValues(
  draft: SpeciesLookupDraft,
): ReviewFormValues {
  return {
    common_name: draft.taxonomy.common_name ?? '',
    guild: draft.traits.guild ?? '',
    ecosystem_service:
      draft.traits.ecosystem_service ?? '',
    habitat: draft.traits.habitat ?? '',
    typology: draft.traits.typology ?? '',
    endemism: draft.traits.endemism ?? '',
    potential_threats:
      draft.traits.potential_threats ?? '',
    reference: draft.traits.reference ?? '',
  }
}

function getDefaultIucnAssessment(
  draft: SpeciesLookupDraft | null,
): IucnAssessment | null {
  if (!draft) return null

  const assessments =
    draft.conservation.iucn_assessments ?? []

  if (!assessments.length) return null

  return (
    assessments.find(
      (assessment) =>
        assessment.scope.toLowerCase() === 'global',
    ) ?? assessments[0]
  )
}

function getErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            detail?: string | { message?: string }
            message?: string
          }
        }
      }
    ).response

    const detail = response?.data?.detail

    if (typeof detail === 'string') {
      return detail
    }

    if (
      detail &&
      typeof detail === 'object' &&
      typeof detail.message === 'string'
    ) {
      return detail.message
    }

    if (
      typeof response?.data?.message === 'string'
    ) {
      return response.data.message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'An unexpected error occurred.'
}

export default function AddSpeciesPage() {
  const navigate = useNavigate()

  const [sites, setSites] = useState<Site[]>([])
  const [siteId, setSiteId] = useState<number | ''>('')

  const [scientificNames, setScientificNames] =
    useState('')

  const [items, setItems] = useState<
    BatchSpeciesItem[]
  >([])

  const [isLookingUp, setIsLookingUp] =
    useState(false)

  const [lookupProgress, setLookupProgress] =
  useState({
    processed: 0,
    total: 0,
  })

  const [isSavingAll, setIsSavingAll] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadSites() {
      try {
        const data = await siteService.listSites()

        if (!mounted) return

        setSites(data)
      } catch (err) {
        if (!mounted) return

        setError(
          `Unable to load sites: ${getErrorMessage(
            err,
          )}`,
        )
      }
    }

    loadSites()

    return () => {
      mounted = false
    }
  }, [])

  const parsedScientificNames = useMemo(
    () => parseScientificNames(scientificNames),
    [scientificNames],
  )

  const speciesCount =
    parsedScientificNames.length

  function updateItem(
    id: string,
    updates: Partial<BatchSpeciesItem>,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, ...updates }
          : item,
      ),
    )
  }

  function removeItem(id: string) {
    setItems((current) =>
      current.filter((item) => item.id !== id),
    )
  }

 async function handleLookup() {
  if (!siteId) {
    setError('Select a site before looking up species.')
    return
  }

  if (!speciesCount) {
    setError(
      'Enter at least one scientific name before looking up species.',
    )
    return
  }

  setError(null)
  setItems([])
  setIsLookingUp(true)

  setLookupProgress({
    processed: 0,
    total: speciesCount,
  })

  try {
    console.log(
      'Starting batch lookup with:',
      parsedScientificNames,
    )

    const job =
      await speciesService.startLookupSpeciesBatch(
        parsedScientificNames,
        Number(siteId),
      )

    console.log('LOOKUP JOB RESPONSE:', job)

    setLookupProgress({
      processed: job.processed,
      total: job.total,
    })

    const pollInterval = 500

    while (true) {
      const status =
        await speciesService.getLookupSpeciesBatchStatus(
          job.job_id,
        )

      setLookupProgress({
        processed: status.processed,
        total: status.total,
      })

      if (status.status === 'failed') {
        throw new Error(
          status.error ||
            'The batch lookup failed.',
        )
      }

      if (status.status === 'completed') {
        const nextItems: BatchSpeciesItem[] =
          status.items.map((result) => {
            const draft = result.draft

            return {
              id: createId(),
              inputScientificName:
                result.input_scientific_name,
              draft,
              duplicate: result.duplicate,
              existingSpecies:
                result.existing_species ?? null,
              error: result.error ?? null,
              selectedIucnAssessment:
                getDefaultIucnAssessment(draft),
              values: draft
                ? getInitialValues(draft)
                : { ...EMPTY_VALUES },
              expanded: false,
              saveStatus: 'idle',
              saveError: null,
            }
          })

        setItems(nextItems)
        break
      }

      await new Promise((resolve) =>
        setTimeout(resolve, pollInterval),
      )
    }
  } catch (err) {
    console.error('Batch lookup error:', err)

    setError(
      `Batch lookup failed: ${getErrorMessage(err)}`,
    )
  } finally {
    setIsLookingUp(false)
  }
}



  function buildCreatePayload(
    item: BatchSpeciesItem,
  ): SpeciesCreateInput | null {
    if (!item.draft || !siteId) {
      return null
    }

    const draft = item.draft
    const selectedIucn =
      item.selectedIucnAssessment

    const selectedIucnSource = selectedIucn
      ? {
          source: 'iucn',
          reference: `assessment:${selectedIucn.assessment_id}`,
          assessment_id:
            selectedIucn.assessment_id,
          scope: selectedIucn.scope,
          scope_code:
            selectedIucn.scope_code ?? null,
          year: selectedIucn.year,
          retrieved_at: null,
        }
      : null

    return {
      scientific_name: draft.scientific_name,
      site_id: Number(siteId),

      kingdom: draft.taxonomy.kingdom,
      class_name:
        draft.taxonomy.class_name,
      order_name:
        draft.taxonomy.order_name,
      family: draft.taxonomy.family,
      genus: draft.taxonomy.genus,
      species_epithet:
        draft.taxonomy.species_epithet,

      common_name:
        item.values.common_name ||
        draft.taxonomy.common_name,

      field_sources: {
        ...draft.field_sources,

        ...(selectedIucnSource
          ? {
              iucn_status: selectedIucnSource,
              iucn_trend: selectedIucnSource,
            }
          : {}),
      },

      iucn_status:
        selectedIucn?.category ?? null,

      iucn_trend:
        selectedIucn?.population_trend ?? null,

      guild: item.values.guild || null,
      ecosystem_service:
        item.values.ecosystem_service || null,
      habitat: item.values.habitat || null,
      typology:
        item.values.typology || null,
      endemism:
        item.values.endemism || null,
      potential_threats:
        item.values.potential_threats || null,
      reference:
        item.values.reference || null,
    }
  }

  async function handleSaveItem(
    itemId: string,
  ) {
    const item = items.find(
      (current) => current.id === itemId,
    )

    if (!item) return

    if (item.existingSpecies && !item.duplicate) {
      if (!siteId) {
        setError(
          'Select a site before saving species.',
        )
        return
      }

      updateItem(itemId, {
        saveStatus: 'saving',
        saveError: null,
      })

      try {
        await speciesService.associateSpeciesWithSite(
          Number(siteId),
          item.existingSpecies.id,
        )

        updateItem(itemId, {
          saveStatus: 'saved',
          saveError: null,
          expanded: false,
        })
      } catch (err) {
        updateItem(itemId, {
          saveStatus: 'error',
          saveError: getErrorMessage(err),
        })
      }

      return
    }

    if (item.duplicate) {
      updateItem(itemId, {
        saveStatus: 'error',
        saveError:
          'This species already exists and cannot be created again.',
      })
      return
    }

    if (!item.draft) {
      updateItem(itemId, {
        saveStatus: 'error',
        saveError:
          'This species has no lookup result to save.',
      })
      return
    }

    if (!siteId) {
      setError(
        'Select a site before saving species.',
      )
      return
    }


    const payload =
      buildCreatePayload(item)

    if (!payload) {
      updateItem(itemId, {
        saveStatus: 'error',
        saveError:
          'Unable to build the species payload.',
      })
      return
    }

    updateItem(itemId, {
      saveStatus: 'saving',
      saveError: null,
    })

    try {
      await speciesService.createSpecies(
        payload,
      )

      updateItem(itemId, {
        saveStatus: 'saved',
        saveError: null,
        expanded: false,
      })
    } catch (err) {
      updateItem(itemId, {
        saveStatus: 'error',
        saveError: getErrorMessage(err),
      })
    }
  }

  async function handleSaveAll() {
    if (!siteId) {
      setError(
        'Select a site before using Save All.',
      )
      return
    }

    const eligibleItems = items.filter(
      (item) =>
        !item.duplicate &&
        (item.draft !== null || item.existingSpecies !== null) &&
        item.saveStatus !== 'saving' &&
        item.saveStatus !== 'saved',
    )

    if (!eligibleItems.length) {
      setError(
        'There are no eligible species to save.',
      )
      return
    }

    setError(null)
    setIsSavingAll(true)

    for (const item of eligibleItems) {
      await handleSaveItem(item.id)
    }

    setIsSavingAll(false)
  }

  const lookedUpCount = items.length

  const duplicateCount = items.filter(
    (item) => item.duplicate,
  ).length

  const savedCount = items.filter(
    (item) => item.saveStatus === 'saved',                           
  ).length

  const errorCount = items.filter(
    (item) =>
      item.error !== null ||
      item.saveStatus === 'error',
  ).length

  const pendingCount = items.filter(
    (item) =>
      !item.duplicate &&
      (item.draft !== null || item.existingSpecies !== null) &&
      item.saveStatus !== 'saved',
  ).length

  const canSaveAll =
    Boolean(siteId) &&
    pendingCount > 0 &&
    !isSavingAll &&
    !isLookingUp

  return (
    <AppLayout title="Log a species">
      <div className="mx-auto w-full max-w-5xl">
        {/* =====================================================
            PAGE HEADER
        ====================================================== */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate('/species')}
            className="mb-4 flex items-center gap-1.5 text-sm font-medium text-canopy-700 transition-colors hover:text-canopy-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to species
          </button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.1em] text-canopy-700">
                Species registry
              </p>

              <h1 className="mt-1 font-display text-2xl font-bold text-canopy-950">
                Log a species
              </h1>

              <p className="mt-1.5 max-w-2xl text-sm text-ink-950/60">
                Look up one or more species, review the
                automatically fetched information, and
                save each validated record to the
                catalogue.
              </p>
            </div>

            {items.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setItems([])
                  setScientificNames('')
                  setError(null)
                }}
              >
                Start over
              </Button>
            )}
          </div>
        </div>

        {/* =====================================================
            GLOBAL ERROR
        ====================================================== */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <div className="flex-1">
              {error}
            </div>

            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs font-semibold underline underline-offset-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* =====================================================
            SEARCH / BATCH SETUP
        ====================================================== */}
        <Card className="mx-auto max-w-3xl">
          <h2 className="font-display text-lg font-bold text-canopy-950">
            Start with names
          </h2>

          <p className="mt-1.5 text-sm text-ink-950/60">
            We'll check the catalogue for duplicates,
            then pull in taxonomy and conservation data
            automatically.
          </p>

          <div className="mt-6 flex flex-col gap-5">
            {/* Site */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="species-site"
                className="text-xs font-semibold uppercase tracking-[0.08em] text-canopy-900/70"
              >
                Site
              </label>

              <div className="relative">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-950/35" />

                <select
                  id="species-site"
                  value={siteId}
                  onChange={(event) => {
                    const nextSiteId = event.target.value
                      ? Number(event.target.value)
                      : ''

                    setSiteId(nextSiteId)
                    setItems([])
                    setError(null)
                  }}
                  className="h-12 w-full appearance-none rounded-xl border border-mist-200 bg-paper-0 pl-11 pr-10 text-[15px] outline-none transition-colors focus:border-canopy-600"
                >
                  <option value="">
                    Select a site…
                  </option>

                  {sites.map((site) => (
                    <option
                      key={site.id}
                      value={site.id}
                    >
                      {site.name}
                      {site.code
                        ? ` · ${site.code}`
                        : ''}
                    </option>
                  ))}
                </select>

                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-950/35" />
              </div>
            </div>

            {/* Scientific names */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="scientific-names"
                className="text-xs font-semibold uppercase tracking-[0.08em] text-canopy-900/70"
              >
                Scientific names
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-ink-950/35" />

                <textarea
                  id="scientific-names"
                  value={scientificNames}
                  onChange={(event) =>
                    setScientificNames(
                      event.target.value,
                    )
                  }
                  disabled={isLookingUp}
                  rows={6}
                  placeholder={`Quercus afares
Panthera leo
Canis lupus
Aquila chrysaetos`}
                  className="w-full resize-y rounded-xl border border-mist-200 bg-paper-0 px-4 py-3 pl-11 text-[15px] leading-6 outline-none transition-colors placeholder:text-ink-950/30 focus:border-canopy-600 disabled:bg-mist-50"
                />
              </div>

              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-ink-950/45">
                  Enter one scientific name per line.
                  Blank lines and duplicates are ignored.
                </p>

                {speciesCount > 0 && (
                  <p className="text-xs font-medium text-canopy-700">
                    {speciesCount} unique{' '}
                    {speciesCount === 1
                      ? 'species'
                      : 'species'}{' '}
                    ready
                  </p>
                )}
              </div>
            </div>

            <Button
              type="button"
              onClick={handleLookup}
              isLoading={isLookingUp}
              size="lg"
              disabled={speciesCount === 0}
              className="mt-1 w-full"
            >
              {isLookingUp
                ? 'Looking up…'
                : `Check & look up ${
                    speciesCount || ''
                  } species`}
            </Button>
            {isLookingUp && (
              <div className="mt-4 rounded-xl border border-canopy-100 bg-canopy-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-canopy-700" />

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-canopy-950">
                        Looking up species…
                      </p>

                      <p className="mt-0.5 text-xs text-ink-950/55">
                        Checking biodiversity data sources one species at a time.
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 font-mono text-sm font-semibold text-canopy-800">
                    {lookupProgress.processed} /{' '}
                    {lookupProgress.total}
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-canopy-100">
                  <div
                    className="h-full rounded-full bg-canopy-600 transition-all duration-300 ease-out"
                    style={{
                      width:
                        lookupProgress.total > 0
                          ? `${Math.min(
                              100,
                              (lookupProgress.processed /
                                lookupProgress.total) *
                                100,
                            )}%`
                          : '0%',
                    }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-ink-950/45">
                  <span>
                    {lookupProgress.processed === 0
                      ? 'Preparing lookup…'
                      : lookupProgress.processed ===
                          lookupProgress.total
                        ? 'Finishing…'
                        : `${lookupProgress.total - lookupProgress.processed} remaining`}
                  </span>

                  <span>
                    {lookupProgress.total > 0
                      ? Math.round(
                          (lookupProgress.processed /
                            lookupProgress.total) *
                            100,
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* =====================================================
            RESULTS
        ====================================================== */}
        {items.length > 0 && (
          <div className="mt-8">
            {/* Results header */}
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.1em] text-canopy-700">
                  Batch review
                </p>

                <h2 className="mt-1 font-display text-xl font-bold text-canopy-950">
                  {lookedUpCount} species looked up
                </h2>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="accent">
                    {lookedUpCount} total
                  </Badge>

                  <Badge tone="neutral">
                    {pendingCount} pending
                  </Badge>

                  {savedCount > 0 && (
                    <Badge tone="success">
                      {savedCount} saved
                    </Badge>
                  )}

                  {duplicateCount > 0 && (
                    <Badge tone="warning">
                      {duplicateCount} duplicate
                      {duplicateCount === 1
                        ? ''
                        : 's'}
                    </Badge>
                  )}

                  {errorCount > 0 && (
                    <Badge tone="danger">
                      {errorCount} issue
                      {errorCount === 1
                        ? ''
                        : 's'}
                    </Badge>
                  )}
                </div>
              </div>

              <Button
                type="button"
                disabled={!canSaveAll}
                onClick={handleSaveAll}
                size="lg"
              >
                {isSavingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save All
                  </>
                )}
              </Button>
            </div>

            {/* =================================================
                SPECIES CARDS
            ================================================== */}
            <div className="flex flex-col gap-4">
              {items.map((item, index) => {
                const draft = item.draft
                const taxonomy =
                  draft?.taxonomy

                const canSave =
                  Boolean(siteId) &&
                  (Boolean(draft) ||
                    Boolean(item.existingSpecies)) &&
                  !item.duplicate &&
                  item.saveStatus !== 'saving' &&
                  item.saveStatus !== 'saved'

                const isLookupError =
                  !item.existingSpecies &&
                  (!draft || Boolean(item.error))

                const nationalStatus =
                  draft?.national_status

                const isProtected =
                  nationalStatus
                    ?.toLowerCase()
                    .includes('protected')

                return (
                  <Card
                    key={item.id}
                    className={`overflow-hidden p-0 ${
                      item.saveStatus ===
                      'saved'
                        ? 'border-canopy-200'
                        : item.duplicate
                          ? 'border-amber-200'
                          : isLookupError
                            ? 'border-red-200'
                            : ''
                    }`}
                  >
                    {/* -----------------------------------------
                        CARD MAIN CONTENT
                    ------------------------------------------ */}
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        {/* Species identity */}
                        <div className="flex min-w-0 gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-canopy-50 font-mono text-xs font-bold text-canopy-800">
                            {index + 1}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-display text-lg font-bold italic text-canopy-950">
                                {draft?.scientific_name ??
                                  item.inputScientificName}
                              </h3>

                              {/* Protected / Non-Protected */}
                              {nationalStatus && (
                                <Badge
                                  tone={
                                    isProtected
                                      ? 'accent'
                                      : 'neutral'
                                  }
                                >
                                  {nationalStatus}
                                </Badge>
                              )}

                              {/* Duplicate */}
                              {item.duplicate && (
                                <Badge tone="warning">
                                  Duplicate
                                </Badge>
                              )}

                              {/* Saved */}
                              {item.saveStatus ===
                                'saved' && (
                                <Badge tone="success">
                                  <Check className="mr-1 h-3 w-3" />
                                  Saved
                                </Badge>
                              )}

                              {/* Saving */}
                              {item.saveStatus ===
                                'saving' && (
                                <Badge tone="accent">
                                  Saving…
                                </Badge>
                              )}

                              {/* Save error */}
                              {item.saveStatus ===
                                'error' && (
                                <Badge tone="danger">
                                  Save failed
                                </Badge>
                              )}

                              {/* Lookup error */}
                              {isLookupError &&
                                item.saveStatus !==
                                  'error' && (
                                  <Badge tone="danger">
                                    Lookup issue
                                  </Badge>
                                )}
                            </div>

                            <p className="mt-1 text-xs text-ink-950/45">
                              Input:{' '}
                              {
                                item.inputScientificName
                              }
                            </p>

                            {taxonomy?.common_name && (
                              <p className="mt-1.5 text-sm font-medium text-ink-950/65">
                                {
                                  taxonomy.common_name
                                }
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Card actions */}
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          {item.duplicate &&
                            item.existingSpecies && (
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() =>
                                  navigate(
                                    `/species/${item.existingSpecies?.id}`,
                                  )
                                }
                              >
                                <Eye className="h-4 w-4" />
                                View existing
                              </Button>
                            )}

                          {item.existingSpecies &&
                            !item.duplicate && (
                              <Button
                                type="button"
                                disabled={
                                  item.saveStatus ===
                                    'saving' ||
                                  item.saveStatus ===
                                    'saved'
                                }
                                onClick={() =>
                                  handleSaveItem(item.id)
                                }
                              >
                                {item.saveStatus ===
                                'saving' ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Adding…
                                  </>
                                ) : item.saveStatus ===
                                  'saved' ? (
                                  <>
                                    <Check className="h-4 w-4" />
                                    Added
                                  </>
                                ) : (
                                  <>
                                    <MapPin className="h-4 w-4" />
                                    Add to site
                                  </>
                                )}
                              </Button>
                            )}

                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() =>
                              removeItem(item.id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>

                      {/* -----------------------------------------
                          TAXONOMY SUMMARY
                      ------------------------------------------ */}
                      {draft && (
                        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-mist-200 pt-4 sm:grid-cols-3 lg:grid-cols-7">
                          <SummaryField
                            label="Kingdom"
                            value={
                              taxonomy?.kingdom
                            }
                          />

                          <SummaryField
                            label="Class"
                            value={
                              taxonomy?.class_name
                            }
                          />

                          <SummaryField
                            label="Order"
                            value={
                              taxonomy?.order_name
                            }
                          />

                          <SummaryField
                            label="Family"
                            value={
                              taxonomy?.family
                            }
                          />

                          <SummaryField
                            label="National status"
                            value={
                              nationalStatus
                            }
                          />

                          <SummaryField
                            label="IUCN status"
                            value={
                              item
                                .selectedIucnAssessment
                                ?.category
                            }
                          />

                          <SummaryField
                            label="Trend"
                            value={
                              item
                                .selectedIucnAssessment
                                ?.population_trend
                            }
                          />
                        </div>
                      )}

                      {/* -----------------------------------------
                          DUPLICATE WARNING
                      ------------------------------------------ */}
                      {item.duplicate &&
                        item.existingSpecies && (
                          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3">
                            <p className="text-sm font-semibold text-amber-900">
                              This species already
                              exists
                            </p>

                            <p className="mt-1 text-xs leading-5 text-amber-800">
                              The lookup result is
                              available for review,
                              but saving is disabled
                              to prevent overwriting
                              or creating a duplicate
                              record.
                            </p>
                          </div>
                        )}

                      {/* -----------------------------------------
                          LOOKUP ERROR
                      ------------------------------------------ */}
                      {item.error && (
                        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">
                          <div className="flex gap-2">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                            <div>
                              <p className="font-semibold">
                                Lookup failed
                              </p>

                              <p className="mt-1 text-xs leading-5">
                                {item.error}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* -----------------------------------------
                          SAVE ERROR
                      ------------------------------------------ */}
                      {item.saveError && (
                        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">
                          <p className="font-semibold">
                            Save failed
                          </p>

                          <p className="mt-1 text-xs leading-5">
                            {item.saveError}
                          </p>
                        </div>
                      )}

                      {/* -----------------------------------------
                          NO IUCN ASSESSMENT
                      ------------------------------------------ */}
                      {draft && !item.selectedIucnAssessment && (
                        <div className="mt-5 rounded-lg border border-violet-200 bg-violet-50 px-3.5 py-3 text-sm text-violet-800">
                          <p className="font-semibold">
                            IUCN assessment unavailable
                          </p>

                          <p className="mt-1 text-xs leading-5">
                            No IUCN assessment was found for this species.
                            You can still save the record; the conservation
                            fields will remain empty and can be completed later.
                          </p>
                        </div>
                      )}

                      {/* -----------------------------------------
                          REVIEW TOGGLE
                      ------------------------------------------ */}
                      {draft && (
                        <div className="mt-5 flex items-center justify-between border-t border-mist-200 pt-4">
                          <button
                            type="button"
                            onClick={() =>
                              updateItem(item.id, {
                                expanded:
                                  !item.expanded,
                              })
                            }
                            className="flex items-center gap-2 text-sm font-semibold text-canopy-700 transition-colors hover:text-canopy-950"
                          >
                            {item.expanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}

                            {item.expanded
                              ? 'Hide review'
                              : 'Review & Edit'}
                          </button>

                          <p className="hidden text-xs text-ink-950/40 sm:block">
                            {item.expanded
                              ? 'Review the enriched data below'
                              : 'Open to edit before saving'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* =================================================
                        EXPANDED REVIEW
                    ================================================== */}
                    {draft &&
                      item.expanded && (
                        <div className="border-t border-mist-200 bg-paper-0">
                          <div className="p-5 sm:p-6">
                            <SpeciesReviewForm
                              draft={draft}
                              values={item.values}
                              onChange={(values) =>
                                updateItem(
                                  item.id,
                                  { values },
                                )
                              }
                              selectedIucnAssessment={
                                item.selectedIucnAssessment
                              }
                              onIucnAssessmentChange={(
                                assessment,
                              ) =>
                                updateItem(
                                  item.id,
                                  {
                                    selectedIucnAssessment:
                                      assessment,
                                  },
                                )
                              }
                            />
                          </div>

                          {/* ---------------------------------------
                              SAVE FOOTER
                          ---------------------------------------- */}
                          <div className="border-t border-mist-200 bg-mist-50/50 px-5 py-4 sm:px-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                {item.saveStatus ===
                                'saved' ? (
                                  <>
                                    <p className="flex items-center gap-2 text-sm font-semibold text-canopy-800">
                                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-canopy-100">
                                        <Check className="h-3.5 w-3.5" />
                                      </span>

                                      Species saved
                                      successfully
                                    </p>

                                    <p className="mt-1 text-xs text-ink-950/45">
                                      The record has been
                                      added to the
                                      species registry.
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-sm font-semibold text-ink-950">
                                      Ready to save?
                                    </p>

                                    <p className="mt-1 text-xs text-ink-950/45">
                                      Review the fields
                                      above, then save
                                      the validated
                                      species.
                                    </p>
                                  </>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {item.saveStatus ===
                                  'error' && (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={!canSave}
                                    onClick={() =>
                                      handleSaveItem(
                                        item.id,
                                      )
                                    }
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                    Retry
                                  </Button>
                                )}

                                {item.saveStatus !==
                                  'saved' && (
                                  <Button
                                    type="button"
                                    disabled={!canSave}
                                    onClick={() =>
                                      handleSaveItem(
                                        item.id,
                                      )
                                    }
                                  >
                                    {item.saveStatus ===
                                    'saving' ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving…
                                      </>
                                    ) : (
                                      <>
                                        <Save className="h-4 w-4" />
                                        Save species
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* =================================================
                        LOOKUP ERROR FOOTER
                    ================================================== */}
                    {!draft && !item.existingSpecies && (
                      <div className="border-t border-mist-200 bg-mist-50/50 px-5 py-4 sm:px-6">
                        <p className="text-xs text-ink-950/45">
                          This item cannot be saved
                          because the lookup did not
                          produce a usable species
                          draft.
                        </p>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>

            {/* =====================================================
                COMPLETION STATE
            ====================================================== */}
            {savedCount === lookedUpCount &&
              lookedUpCount > 0 &&
              duplicateCount === 0 &&
              errorCount === 0 && (
                <Card className="mt-5 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-canopy-50 text-canopy-700">
                    <Check className="h-5 w-5" />
                  </div>

                  <p className="mt-3 font-display text-base font-bold text-canopy-950">
                    Batch complete
                  </p>

                  <p className="mt-1 text-sm text-ink-950/60">
                    All {savedCount} species have
                    been successfully saved.
                  </p>
                </Card>
              )}
          </div>
        )}

        {/* =====================================================
            EMPTY STATE
        ====================================================== */}
        {!isLookingUp &&
          items.length === 0 &&
          !error && (
            <div className="mt-8 text-center">
              <p className="font-display text-base font-semibold text-canopy-950">
                Add several species at once
              </p>

              <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-950/50">
                Enter one scientific name per line
                above. You can review and edit each
                enriched record before saving it.
              </p>
            </div>
          )}
      </div>
    </AppLayout>
  )
}

function SummaryField({
  label,
  value,
}: {
  label: string
  value?: string | null
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-canopy-900/55">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-medium text-ink-950/75">
        {value || '—'}
      </p>
    </div>
  )
}

