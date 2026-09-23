import { useEffect, useRef, useState } from 'react'
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

import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

import * as siteService from '@/features/sites/services/siteService'
import type { Site } from '@/features/sites/types'

import * as graphicsService from '../services/graphicsService'

type GraphicsJob = graphicsService.GraphicsJob

export function GraphicsPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState('')

  const [job, setJob] = useState<GraphicsJob | null>(null)

  const [loadingSites, setLoadingSites] = useState(true)
  const [generating, setGenerating] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const pollRef =
    useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function loadSites() {
      try {
        const data = await siteService.listSites()

        setSites(data)
      } catch {
        setError('Could not load research sites.')
      } finally {
        setLoadingSites(false)
      }
    }

    loadSites()

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
      }
    }
  }, [])

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  async function fetchJob(jobId: string) {
    const updated = await graphicsService.getGraphicsJob(jobId)

    setJob(updated)

    if (
      updated.status === 'completed' ||
      updated.status === 'failed'
    ) {
      stopPolling()
      setGenerating(false)
    }

    return updated
  }

  async function startPolling(jobId: string) {
    stopPolling()

    try {
      await fetchJob(jobId)
    } catch {
      setGenerating(false)
      setError(
        'Could not check the graphics generation status.',
      )
      return
    }

    pollRef.current = setInterval(async () => {
      try {
        await fetchJob(jobId)
      } catch {
        stopPolling()
        setGenerating(false)
        setError(
          'Could not check the graphics generation status.',
        )
      }
    }, 1500)
  }

  async function handleGenerate() {
    if (!selectedSiteId) {
      setError('Please select a research site.')
      return
    }

    stopPolling()

    setError(null)
    setJob(null)
    setGenerating(true)

    try {
      const created =
        await graphicsService.generateGraphics(
          Number(selectedSiteId),
        )

      /*
       * generateGraphics() only returns the newly-created job ID.
       * It does NOT return a complete GraphicsJob.
       *
       * Therefore we fetch the complete job before putting it
       * into the job state.
       */
      await startPolling(created.job_id)
    } catch (err) {
      console.error(err)

      setGenerating(false)

      setError(
        'Could not start graphics generation.',
      )
    }
  }

  async function handleDownload(
    format: 'png' | 'tiff' | 'pdf',
  ) {
    if (!job) return

    try {
      await graphicsService.downloadGraphics(
        job.job_id,
        format,
      )
    } catch {
      setError(
        `Could not download the ${format.toUpperCase()} file.`,
      )
    }
  }

  const progress =
    job && job.total_species > 0
      ? Math.min(
          100,
          Math.round(
            (job.processed / job.total_species) * 100,
          ),
        )
      : job?.status === 'completed'
        ? 100
        : 0

  const isRunning =
    job?.status === 'queued' ||
    job?.status === 'running'

  return (
    <AppLayout title="Graphics">
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
                Generate a circular taxonomic dendrogram for a research site.
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
                  Research site
                </h2>

                <p className="mt-0.5 text-xs text-ink-950/50">
                  Select the site whose validated species will be visualized.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <label
                htmlFor="graphics-site"
                className="mb-1.5 block text-xs font-semibold text-ink-950/70"
              >
                Site
              </label>

              {loadingSites ? (
                <div className="flex h-11 items-center justify-center rounded-xl border border-mist-200">
                  <LoadingSpinner className="h-5 w-5" />
                </div>
              ) : (
                <select
                  id="graphics-site"
                  value={selectedSiteId}
                  onChange={(event) => {
                    setSelectedSiteId(event.target.value)
                    setJob(null)
                    setError(null)
                    stopPolling()
                  }}
                  disabled={generating}
                  className="h-11 w-full rounded-xl border border-mist-200 bg-white px-3.5 text-sm text-ink-950 outline-none transition hover:border-mist-300 focus:border-canopy-600 focus:ring-4 focus:ring-canopy-600/10 dark:bg-paper-50 dark:[color-scheme:dark]"
                >
                  <option value="">
                    Select a research site
                  </option>

                  {sites.map((site) => (
                    <option
                      key={site.id}
                      value={site.id}
                    >
                      {site.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="mt-5 rounded-xl bg-mist-100/70 p-4 dark:bg-mist-100/10">
              <div className="flex gap-3">
                <Sparkles
                  size={17}
                  className="mt-0.5 shrink-0 text-canopy-700"
                />

                <div>
                  <p className="text-xs font-semibold text-canopy-950">
                    What will be generated?
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-ink-950/55">
                    A circular hierarchy from kingdom to class,
                    order, family, genus and terminal species.
                    Only validated species associated with the
                    selected site are included.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={
                !selectedSiteId ||
                generating ||
                loadingSites
              }
              isLoading={generating}
              className="mt-5 w-full gap-2"
            >
              {!generating && <Sparkles size={16} />}

              {generating
                ? 'Generating…'
                : 'Generate dendrogram'}
            </Button>

            {error && (
              <div
                role="alert"
                className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
              >
                <XCircle
                  size={17}
                  className="mt-0.5 shrink-0"
                />

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
                  Select a research site and generate its circular
                  taxonomic dendrogram. The calculation runs in the
                  background.
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
                          <CheckCircle2
                            size={18}
                            className="text-canopy-600"
                          />
                        ) : job.status === 'failed' ? (
                          <XCircle
                            size={18}
                            className="text-red-500"
                          />
                        ) : (
                          <RefreshCw
                            size={17}
                            className="animate-spin text-canopy-700"
                          />
                        )}

                        <h2 className="font-display text-sm font-bold text-canopy-950">
                          {job.site_name ||
                            'Generating dendrogram'}
                        </h2>
                      </div>

                      <p className="mt-1 text-xs text-ink-950/45">
                        {job.total_species > 0
                          ? `${job.total_species} validated species`
                          : 'Preparing taxonomic data…'}
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

                  {(isRunning ||
                    job.status === 'completed') && (
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-medium text-ink-950/55">
                          {job.status === 'completed'
                            ? 'Generation complete'
                            : 'Generating graphic…'}
                        </span>

                        <span className="font-semibold text-canopy-700">
                          {progress}%
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-mist-200 dark:bg-mist-100/20">
                        <div
                          className="h-full rounded-full bg-canopy-700 transition-all duration-500"
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>

                      {job.total_species > 0 && (
                        <p className="mt-2 text-[11px] text-ink-950/40">
                          {job.processed} of{' '}
                          {job.total_species} species processed
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* FAILED */}
                {job.status === 'failed' && (
                  <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-10 text-center">
                    <XCircle
                      size={30}
                      className="text-red-500"
                    />

                    <h3 className="mt-4 font-display text-sm font-bold text-canopy-950">
                      Generation failed
                    </h3>

                    <p className="mt-2 max-w-lg text-sm leading-relaxed text-red-600/80">
                      {job.error ||
                        'The dendrogram could not be generated.'}
                    </p>
                  </div>
                )}

                {/* PREVIEW */}
                {job.status === 'completed' &&
                  job.png_available && (
                    <div className="pt-5">
                      <div className="overflow-hidden rounded-xl border border-mist-200 bg-white dark:bg-paper-50">
                        <img
                          src={graphicsService.getGraphicsPreviewUrl(
                            job.job_id,
                          )}
                          alt={`Circular taxonomic dendrogram for ${job.site_name || 'research site'}`}
                          className="block h-auto w-full"
                        />
                      </div>

                      {/* DOWNLOADS */}
                      <div className="mt-5 flex flex-wrap gap-2">
                        {job.png_available && (
                          <Button
                            variant="secondary"
                            size="md"
                            onClick={() =>
                              handleDownload('png')
                            }
                            className="gap-2"
                          >
                            <Download size={15} />
                            PNG
                          </Button>
                        )}

                        {job.tiff_available && (
                          <Button
                            variant="secondary"
                            size="md"
                            onClick={() =>
                              handleDownload('tiff')
                            }
                            className="gap-2"
                          >
                            <Download size={15} />
                            TIFF
                          </Button>
                        )}

                        {job.pdf_available && (
                          <Button
                            variant="secondary"
                            size="md"
                            onClick={() =>
                              handleDownload('pdf')
                            }
                            className="gap-2"
                          >
                            <FileText size={15} />
                            PDF
                          </Button>
                        )}
                      </div>

                      <p className="mt-3 text-xs text-ink-950/40">
                        PNG and TIFF are exported at 600 DPI.
                        PDF is exported as vector graphics.
                      </p>
                    </div>
                  )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}

export default GraphicsPage