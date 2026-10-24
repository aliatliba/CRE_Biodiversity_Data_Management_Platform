import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  CheckCircle2,
  Download,
  FileImage,
  FileText,
  MapPin,
  RefreshCw,
  Sparkles,
  XCircle,
} from 'lucide-react'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useSitesQuery } from '@/hooks/useSitesQuery'
import { usePolling } from '@/hooks/usePolling'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/lib/queryKeys'
import * as graphicsService from '../services/graphicsService'
import type { GraphicsFormat, GraphicsJob } from '../types'

const ACTIVE = new Set(['queued', 'running'])

export function GraphicsPage() {
  const sitesQuery = useSitesQuery()
  const typesQuery = useQuery({
    queryKey: queryKeys.graphicTypes,
    queryFn: graphicsService.listGraphicTypes,
    staleTime: 5 * 60_000,
  })
  const sites = sitesQuery.data ?? []
  const graphicTypes = typesQuery.data ?? []
  const loading = sitesQuery.isPending || typesQuery.isPending

  const [selectedSiteId, setSelectedSiteId] = useState('')
  const [pickedType, setPickedType] = useState('')
  const [job, setJob] = useState<GraphicsJob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Default to the first graphic type once the list has loaded.
  const selectedType = pickedType || graphicTypes[0]?.key || ''
  const setSelectedType = setPickedType
  const error =
    actionError ??
    (sitesQuery.isError || typesQuery.isError
      ? getErrorMessage(
          sitesQuery.error ?? typesQuery.error,
          'Could not load research sites or graphic types.',
        )
      : null)

  const currentType = graphicTypes.find((t) => t.key === selectedType)
  const jobType = graphicTypes.find((t) => t.key === job?.graphic_type)

  const createMutation = useMutation({
    mutationFn: () => graphicsService.generateGraphics(Number(selectedSiteId), selectedType),
    onSuccess: setJob,
    onError: (err) => setActionError(getErrorMessage(err, 'Could not start graphics generation.')),
  })

  const isRunning = job !== null && ACTIVE.has(job.status)
  const generating = createMutation.isPending || isRunning

  usePolling({
    enabled: isRunning,
    poll: () => graphicsService.getGraphicsJob(job!.job_id),
    onResult: (updated) => {
      setJob(updated)
      return !ACTIVE.has(updated.status)
    },
    onError: (err) =>
      setActionError(getErrorMessage(err, 'Could not check the graphics generation status.')),
    intervalMs: 1500,
  })

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    async function loadPreview() {
      if (!job || job.status !== 'completed' || !job.available_formats.includes('png')) {
        setPreviewUrl(null)
        return
      }
      try {
        const blob = await graphicsService.getGraphicsPreviewBlob(job.job_id)
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
      } catch (err) {
        if (cancelled) return
        setPreviewUrl(null)
        setActionError(getErrorMessage(err, 'Could not load the generated graphics preview.'))
      }
    }
    void loadPreview()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.job_id, job?.status])

  function resetResult() {
    setJob(null)
    setActionError(null)
    setPreviewUrl(null)
  }

  function handleGenerate() {
    if (!selectedSiteId || !selectedType) {
      setActionError('Please select a research site and a graphic type.')
      return
    }
    resetResult()
    createMutation.mutate()
  }

  async function handleDownload(format: GraphicsFormat) {
    if (!job) return
    try {
      await graphicsService.downloadGraphics(job.job_id, format)
    } catch (err) {
      setActionError(getErrorMessage(err, `Could not download the ${format.toUpperCase()} file.`))
    }
  }

  const progress =
    job && job.total_species > 0
      ? Math.min(100, Math.round((job.processed / job.total_species) * 100))
      : job?.status === 'completed'
        ? 100
        : 0

  return (
    <>
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <div className="mb-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-canopy-700/10 text-canopy-700 dark:bg-canopy-700/15">
              <BarChart3 size={19} />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-canopy-950">
                Biodiversity graphics
              </h1>
              <p className="mt-0.5 text-sm text-ink-950/50">
                Generate a graphic from the validated species of a research site.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          {/* SETTINGS */}
          <Card className="h-fit">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canopy-700/10 text-canopy-700 dark:bg-canopy-700/15">
                <MapPin size={17} />
              </div>
              <div>
                <h2 className="font-display text-sm font-bold text-canopy-950">
                  Settings
                </h2>
                <p className="mt-0.5 text-xs text-ink-950/50">
                  Choose a graphic and the site to visualize.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="mt-6 flex h-11 items-center justify-center rounded-xl border border-mist-200">
                <LoadingSpinner className="h-5 w-5" />
              </div>
            ) : (
              <>
                {/* GRAPHIC TYPE */}
                <div className="mt-6">
                  <span className="mb-1.5 block text-xs font-semibold text-ink-950/70">
                    Graphic type
                  </span>
                  <div className="space-y-2" role="radiogroup">
                    {graphicTypes.map((type) => {
                      const active = type.key === selectedType
                      return (
                        <button
                          key={type.key}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          disabled={generating}
                          onClick={() => {
                            setSelectedType(type.key)
                            resetResult()
                          }}
                          className={`w-full rounded-xl border px-3.5 py-3 text-left transition disabled:opacity-60 ${
                            active
                              ? 'border-canopy-600 bg-canopy-700/5 ring-4 ring-canopy-600/10'
                              : 'border-mist-200 hover:border-mist-300'
                          }`}
                        >
                          <p className="text-sm font-semibold text-canopy-950">
                            {type.label}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-ink-950/50">
                            {type.description}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* SITE */}
                <div className="mt-5">
                  <Select
                    label="Site"
                    id="graphics-site"
                    value={selectedSiteId}
                    onChange={(event) => {
                      setSelectedSiteId(event.target.value)
                      resetResult()
                    }}
                    disabled={generating}
                    className="w-full"
                  >
                    <option value="">Select a research site</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            )}

            <Button
              onClick={handleGenerate}
              disabled={!selectedSiteId || !selectedType || generating || loading}
              isLoading={generating}
              className="mt-5 w-full gap-2"
            >
              {!generating && <Sparkles size={16} />}
              {generating
                ? 'Generating…'
                : `Generate ${currentType?.label.toLowerCase() ?? 'graphic'}`}
            </Button>

            {error && (
              <div
                role="alert"
                className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
              >
                <XCircle size={17} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </Card>

          {/* RESULT */}
          <Card className="min-w-0 overflow-hidden">
            {!job && (
              <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-canopy-700/10 text-canopy-700 dark:bg-canopy-700/15">
                  <FileImage size={28} />
                </div>
                <h2 className="mt-5 font-display text-base font-bold text-canopy-950">
                  No graphic generated yet
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-950/50">
                  Select a graphic type and a research site, then generate. The
                  calculation runs in the background.
                </p>
              </div>
            )}

            {job && (
              <div>
                {/* JOB HEADER */}
                <div className="border-b border-mist-200 pb-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {job.status === 'completed' ? (
                          <CheckCircle2 size={18} className="text-canopy-600" />
                        ) : job.status === 'failed' ? (
                          <XCircle size={18} className="text-red-500" />
                        ) : (
                          <RefreshCw size={17} className="animate-spin text-canopy-700" />
                        )}
                        <h2 className="font-display text-sm font-bold text-canopy-950">
                          {jobType?.label ?? 'Graphic'}
                          {job.site_name ? ` — ${job.site_name}` : ''}
                        </h2>
                      </div>
                      <p className="mt-1 text-xs text-ink-950/45">
                        {job.total_species > 0
                          ? `${job.total_species} species`
                          : 'Preparing data…'}
                      </p>
                    </div>

                    <span
                      className={`inline-flex w-fit rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        job.status === 'completed'
                          ? 'bg-canopy-700/10 text-canopy-800'
                          : job.status === 'failed'
                            ? 'bg-red-500/10 text-red-600'
                            : 'bg-mist-100 text-ink-950/60'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  {(isRunning || job.status === 'completed') && (
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-medium text-ink-950/55">
                          {job.status === 'completed'
                            ? 'Generation complete'
                            : 'Generating graphic…'}
                        </span>
                        {job.processed > 0 && (
                          <span className="font-semibold text-canopy-700">{progress}%</span>
                        )}
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-mist-200 dark:bg-mist-100/20">
                        <div
                          className={`h-full rounded-full bg-canopy-700 transition-all duration-500 ${
                            isRunning && job.processed === 0 ? 'animate-pulse' : ''
                          }`}
                          style={{ width: isRunning && job.processed === 0 ? '100%' : `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* FAILED */}
                {job.status === 'failed' && (
                  <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-10 text-center">
                    <XCircle size={30} className="text-red-500" />
                    <h3 className="mt-4 font-display text-sm font-bold text-canopy-950">
                      Generation failed
                    </h3>
                    <p className="mt-2 max-w-lg whitespace-pre-line text-sm leading-relaxed text-red-600/80">
                      {job.error || 'The graphic could not be generated.'}
                    </p>
                  </div>
                )}

                {/* PREVIEW + DOWNLOADS */}
                {job.status === 'completed' && (
                  <div className="pt-5">
                    {previewUrl && (
                      <div className="overflow-hidden rounded-xl border border-mist-200 bg-white dark:bg-paper-50">
                        <img
                          src={previewUrl}
                          alt={`${jobType?.label ?? 'Graphic'} for ${job.site_name || 'research site'}`}
                          className="block h-auto w-full"
                        />
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      {job.available_formats.map((format) => (
                        <Button
                          key={format}
                          variant="secondary"
                          size="md"
                          onClick={() => handleDownload(format)}
                          className="gap-2"
                        >
                          {format === 'pdf' ? <FileText size={15} /> : <Download size={15} />}
                          {format.toUpperCase()}
                        </Button>
                      ))}
                    </div>

                    <p className="mt-3 text-xs text-ink-950/40">
                      PNG and TIFF are high-resolution rasters. PDF is exported as vector graphics.
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

export default GraphicsPage