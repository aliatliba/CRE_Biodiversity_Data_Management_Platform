import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Leaf,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { AnimatedBarChart } from '@/components/charts/AnimatedBarChart'
import { AnimatedPieChart, IUCN_COLORS } from '@/components/charts/AnimatedPieChart'
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
          ? (err.response?.data?.detail ??
              'Could not load dashboard stats.')
          : 'Could not load dashboard stats.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const biodiversityCompositionData = stats
    ? [
        {
          label: 'Fauna',
          value: stats.biodiversity_composition['Fauna'] ?? 0,
        },
        {
          label: 'Flora',
          value: stats.biodiversity_composition['Flora'] ?? 0,
        },
        {
          label: 'Micro-organisms',
          value:
            stats.biodiversity_composition['Micro-organisms'] ?? 0,
        },
        {
          label: 'Fungi',
          value: stats.biodiversity_composition['Fungi'] ?? 0,
        },
      ]
    : []

  const iucnData = stats
    ? Object.entries(stats.iucn_breakdown).map(([label, value]) => ({
        label: label.toLowerCase() === 'unknown' ? 'NE' : label,
        value,
      }))
    : []

  const statusData = stats
    ? Object.entries(stats.status_breakdown).map(
        ([label, value]) => ({
          label,
          value,
        })
      )
    : []

  const siteRichnessData =
    stats?.species_richness_by_site.map((site) => ({
      label: site.site_name,
      value: site.species_count,
    })) ?? []

  return (
    <AppLayout title="Dashboard">
      <p className="mb-6 text-sm text-ink-950/55">
        Welcome back,{' '}
        <span className="font-medium text-ink-950">
          {user?.full_name}
        </span>
        . Here's what's in the registry right now.
      </p>

      {isLoading && (
        <div className="flex justify-center py-20">
          <LoadingSpinner className="h-7 w-7" />
        </div>
      )}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={load} />
      )}

      {!isLoading && !error && stats && (
        <div className="flex flex-col gap-6">

          {/* -------------------------------------------------------- */}
          {/* Summary cards                                            */}
          {/* -------------------------------------------------------- */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Survey sites"
              value={stats.total_sites}
              icon={MapPin}
              delay={0}
            />

            <StatCard
              label="Total species"
              value={stats.total_species}
              icon={Leaf}
              delay={0.05}
            />

            <Link
              to="/species/threatened"
              className="block rounded-2xl transition-transform duration-200 hover:-translate-y-0.5"
            >
              <StatCard
                label="IUCN threatened species - VU · EN · CR "
                value={stats.iucn_threatened_species}
                icon={ShieldCheck}
                delay={0.1}
              />
            </Link>
          </div>

          {/* -------------------------------------------------------- */}
          {/* Chart grid                                               */}
          {/* -------------------------------------------------------- */}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

            {/* Biodiversity composition */}

            <motion.div
              className="h-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.1,
              }}
            >
              <Card className="h-full min-w-0 overflow-hidden">
                <h2 className="font-display text-sm font-bold text-canopy-950">
                  Biodiversity composition
                </h2>

                <div className="mt-5 min-w-0 overflow-hidden">
                  <AnimatedPieChart
                    data={biodiversityCompositionData}
                    delay={0.15}
                    showValues
                  />
                </div>
              </Card>
            </motion.div>

            {/* IUCN status */}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.15,
              }}
            >
              <Card className="min-w-0 overflow-hidden">
                <h2 className="font-display text-sm font-bold text-canopy-950">
                  IUCN status breakdown
                </h2>

                <div className="mt-5 min-w-0 overflow-hidden">
                  <AnimatedPieChart
                    data={iucnData}
                    delay={0.2}
                    showValues
                    colorMap={IUCN_COLORS}
                  />
                </div>
              </Card>
            </motion.div>

            {/* National status */}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.2,
                
              }}
            >
              <Card className="min-w-0 overflow-hidden">
                <h2 className="font-display text-sm font-bold text-canopy-950">
                  National status breakdown
                </h2>

                <div className="mt-5 min-w-0 overflow-hidden">
                  <AnimatedPieChart
                    data={statusData}
                    delay={0.25}
                    showValues
                  />
                </div>
              </Card>
            </motion.div>

            {/* Species richness by site */}

            <motion.div
              className="h-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.25,
                
              }}
            >
              <Card className="h-full min-w-0 overflow-hidden">
                <h2 className="font-display text-sm font-bold text-canopy-950">
                  Species richness by site
                </h2>

                <div className="mt-5 min-w-0 overflow-hidden">
                  <AnimatedBarChart
                    data={siteRichnessData}
                    colors={[
                      '#49AA7F',
                      '#80C6A2',
                      '#95D5B3'
                    ]}
                    delay={0.3}
                    
                  />
                </div>
              </Card>
            </motion.div>
          </div>

          {/* -------------------------------------------------------- */}
          {/* Per-site statistics                                      */}
          {/* -------------------------------------------------------- */}

          {stats.site_stats.length > 0 && (
            <Card className="min-w-0 overflow-hidden">
              <h2 className="mb-4 font-display text-sm font-bold text-canopy-950">
                Per-site statistics
              </h2>

              <div className="mt-5 min-w-0 overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-canopy-900/[0.08] text-xs font-semibold uppercase tracking-wide text-ink-950/50">
                      <th className="px-4 py-3">
                        Site
                      </th>

                      <th className="px-4 py-3">
                        Species
                      </th>

                      <th className="px-4 py-3">
                        Protected
                      </th>

                      <th className="px-4 py-3">
                        Complete
                      </th>

                      <th className="px-4 py-3">
                        Incomplete
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {stats.site_stats.map(
                      (site, index) => (
                        <motion.tr
                          key={site.site_id}
                          initial={{
                            opacity: 0,
                            x: -8,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            duration: 0.35,
                            delay: 0.05 * index,
                          }}
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

                          <td className="px-4 py-3 tabular-nums">
                            {site.species_count}
                          </td>

                          <td className="px-4 py-3 tabular-nums">
                            {site.protected_count}
                          </td>

                          <td className="px-4 py-3 tabular-nums text-green-700">
                            {site.complete_count}
                          </td>

                          <td className="px-4 py-3 tabular-nums text-amber-700">
                            {site.incomplete_count}
                          </td>
                        </motion.tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* -------------------------------------------------------- */}
          {/* Quick links                                              */}
          {/* -------------------------------------------------------- */}

          <Card className="flex flex-col gap-3">
            <h2 className="font-display text-sm font-bold text-canopy-950">
              Quick links
            </h2>

            <Link
              to="/species/new"
              className="flex items-center gap-3 rounded-xl border border-canopy-900/10 px-3.5 py-3 text-sm font-medium text-ink-950/75 transition-colors hover:border-canopy-700/30 hover:bg-mist-100"
            >
              <Leaf
                size={16}
                className="text-canopy-700"
              />
              Log a species observation
            </Link>

            <Link
              to="/protected-species"
              className="flex items-center gap-3 rounded-xl border border-canopy-900/10 px-3.5 py-3 text-sm font-medium text-ink-950/75 transition-colors hover:border-canopy-700/30 hover:bg-mist-100"
            >
              <ShieldCheck
                size={16}
                className="text-canopy-700"
              />
              View protected species list
            </Link>

            <Link
              to="/sites"
              className="flex items-center gap-3 rounded-xl border border-canopy-900/10 px-3.5 py-3 text-sm font-medium text-ink-950/75 transition-colors hover:border-canopy-700/30 hover:bg-mist-100"
            >
              <MapPin
                size={16}
                className="text-canopy-700"
              />
              Browse survey sites
            </Link>
          </Card>
        </div>
      )}
    </AppLayout>
  )
}

export default DashboardPage