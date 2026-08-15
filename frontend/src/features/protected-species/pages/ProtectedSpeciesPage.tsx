import { useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { ShieldCheck, Plus, Trash2, Search } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import * as protectedSpeciesService from '../services/protectedSpeciesService'
import type { ProtectedSpeciesEntry } from '../types'

export function ProtectedSpeciesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [entries, setEntries] = useState<ProtectedSpeciesEntry[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({ scientific_name: '', source_reference: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function load(query?: string) {
    setIsLoading(true)
    setError(null)
    try {
      const data = await protectedSpeciesService.listProtectedSpecies(query)
      setEntries(data)
    } catch {
      setError('Could not load the protected species list.')
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
    if (!form.scientific_name.trim()) {
      setFormError('Scientific name is required.')
      return
    }
    setIsSubmitting(true)
    try {
      await protectedSpeciesService.addProtectedSpecies({
        scientific_name: form.scientific_name.trim(),
        source_reference: form.source_reference.trim() || undefined,
      })
      setIsModalOpen(false)
      setForm({ scientific_name: '', source_reference: '' })
      load(search || undefined)
    } catch (err) {
      setFormError(
        axios.isAxiosError(err)
          ? (err.response?.data?.detail ?? 'Could not add this species.')
          : 'Could not add this species.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRemove(entry: ProtectedSpeciesEntry) {
    if (!confirm(`Remove "${entry.scientific_name}" from the protected list?`)) return
    try {
      await protectedSpeciesService.removeProtectedSpecies(entry.id)
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
    } catch {
      alert('Could not remove this entry.')
    }
  }

  return (
    <AppLayout title="Protected species list">
      <p className="mb-6 max-w-xl text-sm text-ink-950/55">
        Species on this list are automatically marked{' '}
        <span className="font-semibold text-canopy-800">Protected</span> under national status the
        moment they're logged — this reference list drives that check.
      </p>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-950/35" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search protected list…"
            className="h-11 w-full rounded-xl border border-mist-200 bg-paper-0 pl-10 pr-4 text-sm outline-none transition-colors focus:border-canopy-600"
          />
        </div>
        {isAdmin && (
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus size={16} />
            Add species
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner className="h-7 w-7" />
        </div>
      )}

      {!isLoading && error && <ErrorState message={error} onRetry={() => load(search || undefined)} />}

      {!isLoading && !error && entries.length === 0 && (
        <EmptyState
          icon={<ShieldCheck size={22} />}
          title="Nothing on the protected list yet"
          description={
            isAdmin
              ? 'Add a scientific name to have it flagged as Protected whenever it\'s logged.'
              : 'Your administrator hasn\'t added any species to this list yet.'
          }
        />
      )}

      {!isLoading && !error && entries.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-canopy-900/10 bg-paper-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-canopy-900/[0.08] bg-mist-100/50 text-xs font-semibold uppercase tracking-wide text-ink-950/50">
                <th className="px-5 py-3">Scientific name</th>
                <th className="hidden px-5 py-3 sm:table-cell">Source</th>
                <th className="px-5 py-3">Added</th>
                {isAdmin && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-canopy-900/[0.05] last:border-0">
                  <td className="px-5 py-3.5 font-medium italic text-canopy-900">{entry.scientific_name}</td>
                  <td className="hidden px-5 py-3.5 text-ink-950/60 sm:table-cell">
                    {entry.source_reference || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-ink-950/50">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleRemove(entry)}
                        aria-label={`Remove ${entry.scientific_name}`}
                        className="rounded-full p-1.5 text-ink-950/30 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add to protected list"
        description="Any species logged with this exact scientific name will be marked Protected."
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Scientific name"
            value={form.scientific_name}
            onChange={(e) => setForm((f) => ({ ...f, scientific_name: e.target.value }))}
            placeholder="Quercus afares"
            required
          />
          <Input
            label="Source reference (optional)"
            value={form.source_reference}
            onChange={(e) => setForm((f) => ({ ...f, source_reference: e.target.value }))}
            placeholder="National decree, IUCN listing, etc."
          />
          {formError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
              {formError}
            </div>
          )}
          <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full">
            Add to list
          </Button>
        </form>
      </Modal>
    </AppLayout>
  )
}

export default ProtectedSpeciesPage
