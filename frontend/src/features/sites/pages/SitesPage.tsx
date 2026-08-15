import { useEffect, useState, type FormEvent } from 'react'
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
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
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

      {!isLoading && !error && sites.length === 0 && (
        <EmptyState
          icon={<MapPin size={22} />}
          title="No sites yet"
          description={
            isAdmin
              ? 'Create the first survey site to start logging species against it.'
              : 'Ask your administrator to set up a survey site.'
          }
        />
      )}

      {!isLoading && !error && sites.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <Card key={site.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="shrink-0 text-canopy-700" />
                  <h3 className="font-display text-[15px] font-bold text-canopy-950">{site.name}</h3>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(site)}
                    aria-label={`Delete ${site.name}`}
                    className="rounded-full p-1.5 text-ink-950/30 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              {site.code && (
                <span className="w-fit rounded-full bg-mist-100 px-2.5 py-0.5 font-mono text-[11px] font-medium text-canopy-800">
                  {site.code}
                </span>
              )}
              <p className="text-sm leading-relaxed text-ink-950/60">
                {site.description || 'No description provided.'}
              </p>
            </Card>
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
          <Input
            label="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Mixed oak forest, north-facing slope"
          />
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
