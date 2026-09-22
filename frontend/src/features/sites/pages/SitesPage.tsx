import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { MapPin, Plus, Trash2, Search } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import * as siteService from '../services/siteService'
import type { Site } from '../types'

export function SitesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [sites, setSites] = useState<Site[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', description: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function load(query?: string) {
    setIsLoading(true)
    setError(null)
    try {
      const data = await siteService.listSites(query)
      setSites(data)
    } catch {
      setError('Could not load sites.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => load(search || undefined), 350)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    if (!form.name.trim()) {
      setFormError('Site name is required.')
      return
    }
    setIsSubmitting(true)
    try {
      await siteService.createSite({
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
      })
      setIsModalOpen(false)
      setForm({ name: '', code: '', description: '' })
      load(search || undefined)
    } catch (err) {
      setFormError(
        axios.isAxiosError(err) ? (err.response?.data?.detail ?? 'Could not create site.') : 'Could not create site.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(site: Site) {
    if (!confirm(`Delete "${site.name}"? This can't be undone.`)) return
    try {
      await siteService.deleteSite(site.id)
      setSites((prev) => prev.filter((s) => s.id !== site.id))
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        if (confirm('This site has species linked to it. Delete anyway?')) {
          await siteService.deleteSite(site.id, true)
          setSites((prev) => prev.filter((s) => s.id !== site.id))
        }
      } else {
        alert('Could not delete site.')
      }
    }
  }

  return (
    <AppLayout title="Sites">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-950/35" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sites…"
            className="h-11 w-full rounded-xl border border-mist-200 bg-paper-0 pl-10 pr-4 text-sm outline-none transition-colors focus:border-canopy-600"
          />
        </div>
        {isAdmin && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="w-full gap-2 sm:w-auto"
          >
            <Plus size={16} />
            New site
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner className="h-7 w-7" />
        </div>
      )}

      {!isLoading && error && <ErrorState message={error} onRetry={() => load(search || undefined)} />}

      {!isLoading && !error && sites.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <Link key={site.id} to={`/sites/${site.id}`}>
              <Card className="flex h-full min-h-[210px] flex-col transition-colors hover:border-canopy-700/30 hover:bg-mist-100/40">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <MapPin
                      size={17}
                      className="mt-0.5 shrink-0 text-canopy-700"
                    />

                    <h3 className="min-w-0 break-words font-display text-[15px] font-bold leading-snug text-canopy-950">
                      {site.name}
                    </h3>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDelete(site)
                      }}
                      aria-label={`Delete ${site.name}`}
                      className="shrink-0 rounded-full p-1.5 text-ink-950/30 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {/* Description */}
                <div className="mt-4 flex-1 border-t border-canopy-900/[0.07] pt-3.5">
                  <p className="line-clamp-4 text-sm leading-relaxed text-ink-950/60">
                    {site.description || 'No description provided.'}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New survey site"
        description="Sites are where researchers log species observations."
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Chréa foothills"
            required
          />
          <Input
            label="Code (optional)"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="SITE-014"
          />
          <div className="w-full min-w-0">
            <label
              htmlFor="site-description"
              className="mb-2 block text-sm font-medium text-ink-950/75"
            >
              Description (optional)
            </label>

            <textarea
              id="site-description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Mixed oak forest, north-facing slope. The site includes a dense woodland area with seasonal streams."
              rows={4}
              className="w-full resize-none rounded-xl border border-canopy-900/12 bg-paper-0 px-4 py-3 text-[15px] text-ink-950 outline-none transition-all placeholder:text-ink-950/35 focus:border-canopy-600 focus:ring-2 focus:ring-canopy-600/10"
            />
          </div>
          {formError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
              {formError}
            </div>
          )}
          <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full">
            Create site
          </Button>
        </form>
      </Modal>
    </AppLayout>
  )
}

export default SitesPage

MapPin