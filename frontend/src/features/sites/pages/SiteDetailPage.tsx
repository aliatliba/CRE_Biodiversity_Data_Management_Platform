import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { motion } from 'framer-motion'
import { ArrowLeft, BarChart3, Edit2, Leaf, MapPin, Trash2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { AnimatedBarChart } from '@/components/charts/AnimatedBarChart'
import { AnimatedPieChart } from '@/components/charts/AnimatedPieChart'
import { useAuth } from '@/hooks/useAuth'
import * as dashboardService from '@/features/dashboard/services/dashboardService'
import type { DashboardStats } from '@/features/dashboard/types'
import * as siteService from '../services/siteService'
import * as speciesService from '@/features/species/services/speciesService'
import type { Site } from '../types'
import type { Species } from '@/features/species/types'
import { SpeciesTable } from '@/features/species/components/SpeciesTable'
import { StatCard } from '@/features/dashboard/components/StatCard'

const PAGE_SIZE = 15

export function SiteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [site, setSite] = useState<Site | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [species, setSpecies] = useState<Species[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', code: '', description: '' })
  const [editError, setEditError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const siteId = Number(id)

  async function loadSpeciesList() {
    const result = await speciesService.listSpecies({
      site_id: siteId,
      page,
      page_size: PAGE_SIZE,
    })
    setSpecies(result.items)
    setPages(result.pages || 1)
    setTotal(result.total)
  }

  async function load() {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const [siteData, statsData] = await Promise.all([
        siteService.getSite(siteId),
        dashboardService.getStats(siteId),
      ])
      setSite(siteData)
      setStats(statsData)
      setEditForm({
        name: siteData.name,
        code: siteData.code ?? '',
        description: siteData.description ?? '',
      })
      await loadSpeciesList()
    } catch {
      setError('Could not load this site.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!id) return
    loadSpeciesList().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, id])

  async function handleEdit(event: FormEvent) {
    event.preventDefault()
    if (!site) return
    setEditError(null)
    setIsSaving(true)
    try {
      const updated = await siteService.updateSite(site.id, {
        name: editForm.name.trim(),
        code: editForm.code.trim() || undefined,
        description: editForm.description.trim() || undefined,
      })
      setSite(updated)
      setIsEditOpen(false)
      const statsData = await dashboardService.getStats(siteId)
      setStats(statsData)
    } catch (err) {
      setEditError(
        axios.isAxiosError(err)
          ? (err.response?.data?.detail ?? 'Could not update site.')
          : 'Could not update site.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!site) return
    if (!confirm(`Delete "${site.name}"? This can't be undone.`)) return
    try {
      await siteService.deleteSite(site.id)
      navigate('/sites')
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        if (confirm('This site has species linked to it. Delete anyway?')) {
          await siteService.deleteSite(site.id, true)
          navigate('/sites')
        }
      } else {
        alert('Could not delete site.')
      }
    }
  }

  const completenessData = stats
    ? [
        { label: 'Complete', value: stats.completeness_breakdown.complete },
        { label: 'Missing taxonomy', value: stats.completeness_breakdown.missing_taxonomy },
        { label: 'Missing conservation', value: stats.completeness_breakdown.missing_conservation },
      ]
    : []

  const familyData =
    stats?.top_families.map((f) => ({ label: f.family, value: f.count })) ?? []

  const statusData = stats
    ? Object.entries(stats.status_breakdown).map(([label, value]) => ({ label, value }))
    : []

  return (
    <AppLayout title="Site detail">
      <Link
        to="/sites"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-canopy-700 hover:underline"
      >
        <ArrowLeft size={15} />
        Back to sites
      </Link>

      {isLoading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner className="h-7 w-7" />
        </div>
      )}

      {!isLoading && error && <ErrorState message={error} onRetry={load} />}

      {!isLoading && !error && site && stats && (
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-canopy-700">
                <MapPin size={18} />
                <span className="text-xs font-semibold uppercase tracking-wide">Survey site</span>
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold text-canopy-950">{site.name}</h1>
              {site.code && (
                <span className="mt-2 inline-block rounded-full bg-mist-100 px-2.5 py-0.5 font-mono text-[11px] font-medium text-canopy-800">
                  {site.code}
                </span>
              )}
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-950/65">
                {site.description || 'No description provided.'}
              </p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button variant="secondary" className="gap-2" onClick={() => setIsEditOpen(true)}>
                  <Edit2 size={15} />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  className="gap-2 text-red-600 hover:bg-red-50"
                  onClick={handleDelete}
                >
                  <Trash2 size={15} />
                  Delete
                </Button>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Species at site" value={stats.total_species} icon={Leaf} delay={0} />
            <StatCard
              label="Protected species"
              value={stats.status_breakdown['Protected'] ?? 0}
              icon={BarChart3}
              delay={0.05}
            />
            <StatCard
              label="Complete records"
              value={stats.completeness_breakdown.complete}
              icon={BarChart3}
              delay={0.1}
            />
            <StatCard
              label="Validations (30d)"
              value={stats.validations_last_30_days}
              icon={BarChart3}
              delay={0.15}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
            >
              <Card>
                <h2 className="font-display text-sm font-bold text-canopy-950">Data completeness</h2>
                <div className="mt-5">
                  <AnimatedPieChart data={completenessData} delay={0.15} />
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
            >
              <Card>
                <h2 className="font-display text-sm font-bold text-canopy-950">
                  National status at site
                </h2>
                <div className="mt-5">
                  <AnimatedPieChart data={statusData} delay={0.2} />
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.25 }}
              className="lg:col-span-2"
            >
              <Card>
                <h2 className="font-display text-sm font-bold text-canopy-950">Top families</h2>
                <div className="mt-5">
                  <AnimatedBarChart data={familyData} delay={0.25} />
                </div>
              </Card>
            </motion.div>
          </div>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-canopy-950">Species at this site</h2>
              <Link to={`/species/new`}>
                <Button size="md" className="gap-2">
                  <Leaf size={15} />
                  Log species
                </Button>
              </Link>
            </div>

            {species.length === 0 ? (
              <EmptyState
                icon={<Leaf size={22} />}
                title="No species at this site"
                description="Log the first species observation for this site."
              />
            ) : (
              <>
                <SpeciesTable species={species} />
                <Pagination
                  className="mt-5"
                  page={page}
                  pages={pages}
                  total={total}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              </>
            )}
          </Card>
        </div>
      )}

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit survey site"
        description="Update site name, code, or description."
      >
        <form onSubmit={handleEdit} className="flex flex-col gap-4">
          <Input
            label="Name"
            value={editForm.name}
            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="Code (optional)"
            value={editForm.code}
            onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))}
          />
          <Input
            label="Description (optional)"
            value={editForm.description}
            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
          />
          {editError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
            >
              {editError}
            </div>
          )}
          <Button type="submit" isLoading={isSaving} className="w-full">
            Save changes
          </Button>
        </form>
      </Modal>
    </AppLayout>
  )
}

export default SiteDetailPage
