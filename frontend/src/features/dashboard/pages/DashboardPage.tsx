import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Leaf,
  MapPin,
  Link2,
  History,
  ShieldCheck,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { AnimatedBarChart } from '@/components/charts/AnimatedBarChart'
import { AnimatedPieChart } from '@/components/charts/AnimatedPieChart'
import * as dashboardService from '../services/dashboardService'
import type { DashboardStats } from '../types'
import { StatCard } from '../components/StatCard'

export function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await dashboardService.getStats()
      setStats(data)
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? (err.response?.data?.detail ?? 'Could not load dashboard stats.')
          : 'Could not load dashboard stats.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const completenessData = stats
    ? [
        { label: 'Complete', value: stats.completeness_breakdown.complete },
        { label: 'Missing taxonomy', value: stats.completeness_breakdown.missing_taxonomy },
        { label: 'Missing conservation', value: stats.completeness_breakdown.missing_conservation },
      ]
    : []

  const iucnData = stats
    ? Object.entries(stats.iucn_breakdown).map(([label, value]) => ({ label, value }))
    : []

  const statusData = stats
    ? Object.entries(stats.status_breakdown).map(([label, value]) => ({ label, value }))
    : []

  const familyData =
    stats?.top_families.map((f) => ({ label: f.family, value: f.count })) ?? []

  const siteChartData =
    stats?.site_stats.map((s) => ({ label: s.site_name, value: s.species_count })) ?? []

  return (
    <AppLayout title="Dashboard">
      <p className="mb-6 text-sm text-ink-950/55">
        Welcome back, <span className="font-medium text-ink-950">{user?.full_name}</span>. Here's
        what's in the registry right now.
      </p>

      {isLoading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner className="h-7 w-7" />
        </div>
      )}

      {!isLoading && error && <ErrorState message={error} onRetry={load} />}

      {!isLoading && !error && stats && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total species" value={stats.total_species} icon={Leaf} delay={0} />
            <StatCard label="Survey sites" value={stats.total_sites} icon={MapPin} delay={0.05} />
            <StatCard
              label="Site ↔ species links"
              value={stats.total_associations}
              icon={Link2}
              delay={0.1}
            />
            <StatCard
              label="Validations (30d)"
              value={stats.validations_last_30_days}
              icon={History}
              delay={0.15}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold tabular-nums text-canopy-950">
                    {stats.completeness_breakdown.complete}
                  </p>
                  <p className="text-xs font-medium text-ink-950/50">Complete records</p>
                </div>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <Card className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold tabular-nums text-canopy-950">
                    {stats.completeness_breakdown.missing_taxonomy}
                  </p>
                  <p className="text-xs font-medium text-ink-950/50">Missing taxonomy</p>
                </div>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Card className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold tabular-nums text-canopy-950">
                    {stats.completeness_breakdown.missing_conservation}
                  </p>
                  <p className="text-xs font-medium text-ink-950/50">Missing conservation</p>
                </div>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card>
                <h2 className="font-display text-sm font-bold text-canopy-950">Data completeness</h2>
                <div className="mt-5">
                  <AnimatedPieChart data={completenessData} delay={0.15} />
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <Card>
                <h2 className="font-display text-sm font-bold text-canopy-950">IUCN status breakdown</h2>
                <div className="mt-5">
                  <AnimatedPieChart data={iucnData} delay={0.2} />
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card>
                <h2 className="font-display text-sm font-bold text-canopy-950">
                  National status breakdown
                </h2>
                <div className="mt-5">
                  <AnimatedPieChart data={statusData} delay={0.25} />
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <Card>
                <h2 className="font-display text-sm font-bold text-canopy-950">Top families</h2>
                <div className="mt-5">
                  <AnimatedBarChart data={familyData} delay={0.3} />
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="lg:col-span-2"
            >
              <Card>
                <h2 className="font-display text-sm font-bold text-canopy-950">
                  Species count per site
                </h2>
                <div className="mt-5">
                  <AnimatedBarChart data={siteChartData} delay={0.35} />
                </div>
              </Card>
            </motion.div>
          </div>

          {stats.site_stats.length > 0 && (
            <Card>
              <h2 className="mb-4 font-display text-sm font-bold text-canopy-950">
                Per-site statistics
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-canopy-900/[0.08] text-xs font-semibold uppercase tracking-wide text-ink-950/50">
                      <th className="px-4 py-3">Site</th>
                      <th className="px-4 py-3">Species</th>
                      <th className="px-4 py-3">Protected</th>
                      <th className="px-4 py-3">Complete</th>
                      <th className="px-4 py-3">Incomplete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.site_stats.map((site, index) => (
                      <motion.tr
                        key={site.site_id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay: 0.05 * index }}
                        className="border-b border-canopy-900/[0.05] last:border-0 hover:bg-mist-100/40"
                      >
                        <td className="px-4 py-3">
                          <Link
                            to={`/sites/${site.site_id}`}
                            className="font-medium text-canopy-900 hover:underline"
                          >
                            {site.site_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 tabular-nums">{site.species_count}</td>
                        <td className="px-4 py-3 tabular-nums">{site.protected_count}</td>
                        <td className="px-4 py-3 tabular-nums text-green-700">
                          {site.complete_count}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-amber-700">
                          {site.incomplete_count}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card className="flex flex-col gap-3">
            <h2 className="font-display text-sm font-bold text-canopy-950">Quick links</h2>
            <Link
              to="/species/new"
              className="flex items-center gap-3 rounded-xl border border-canopy-900/10 px-3.5 py-3 text-sm font-medium text-ink-950/75 transition-colors hover:border-canopy-700/30 hover:bg-mist-100"
            >
              <Leaf size={16} className="text-canopy-700" />
              Log a species observation
            </Link>
            <Link
              to="/protected-species"
              className="flex items-center gap-3 rounded-xl border border-canopy-900/10 px-3.5 py-3 text-sm font-medium text-ink-950/75 transition-colors hover:border-canopy-700/30 hover:bg-mist-100"
            >
              <ShieldCheck size={16} className="text-canopy-700" />
              View protected species list
            </Link>
            <Link
              to="/sites"
              className="flex items-center gap-3 rounded-xl border border-canopy-900/10 px-3.5 py-3 text-sm font-medium text-ink-950/75 transition-colors hover:border-canopy-700/30 hover:bg-mist-100"
            >
              <MapPin size={16} className="text-canopy-700" />
              Browse survey sites
            </Link>
          </Card>
        </div>
      )}
    </AppLayout>
  )
}

export default DashboardPage
