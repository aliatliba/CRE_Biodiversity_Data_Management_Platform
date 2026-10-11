import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Leaf,
  MapPin,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { AnimatedBarChart } from '@/components/charts/AnimatedBarChart'
import { AnimatedPieChart } from '@/components/charts/AnimatedPieChart'
import { ChartCard } from '@/components/charts/ChartCard'
import { toChartData } from '@/lib/chartData'
import { getErrorMessage } from '@/lib/errors'
import { IUCN_COLORS, THREATENED_STATUSES_PARAM } from '@/lib/iucn'
import { queryKeys } from '@/lib/queryKeys'
import { ROUTES, siteUrl, speciesListUrl } from '@/lib/constants'
import * as dashboardService from '../services/dashboardService'
import { StatCard } from '../components/StatCard'

const COMPOSITION_LABELS = ['Fauna', 'Flora', 'Micro-organisms', 'Fungi']

export function DashboardPage() {
  const { user } = useAuth()

  const query = useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: () => dashboardService.getStats(),
  })
  const stats = query.data

  const compositionData = COMPOSITION_LABELS.map((label) => ({
    label,
    value: stats?.biodiversity_composition[label] ?? 0,
  }))
  const iucnData = toChartData(stats?.iucn_breakdown)
  const statusData = toChartData(stats?.status_breakdown)
  const siteRichnessData =
    stats?.species_richness_by_site.map((site) => ({
      label: site.site_name,
      value: site.species_count,
    })) ?? []

  return (
    <>
      <p className="mb-6 text-sm text-ink-950/55">
        Welcome back,{' '}
        <span className="font-medium text-ink-950">
          {user?.full_name}
        </span>
        . Here's what's in the registry right now.
      </p>

      {query.isPending && (
        <div className="flex justify-center py-20">
          <LoadingSpinner className="h-7 w-7" />
        </div>
      )}

      {query.isError && (
        <ErrorState
          message={getErrorMessage(query.error, 'Could not load dashboard stats.')}
          onRetry={() => query.refetch()}
        />
      )}

      {stats && (
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
              to={speciesListUrl({ iucn_status: THREATENED_STATUSES_PARAM })}
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

            <ChartCard title="Biodiversity composition" delay={0.1}>
              <AnimatedPieChart data={compositionData} delay={0.15} showValues />
            </ChartCard>

            <ChartCard title="IUCN status breakdown" delay={0.15}>
              <AnimatedPieChart data={iucnData} delay={0.2} showValues colorMap={IUCN_COLORS} />
            </ChartCard>

            <ChartCard title="National status breakdown" delay={0.2}>
              <AnimatedPieChart data={statusData} delay={0.25} showValues />
            </ChartCard>

            <ChartCard title="Species richness by site" delay={0.25}>
              <AnimatedBarChart
                data={siteRichnessData}
                colors={['#49AA7F', '#80C6A2', '#95D5B3']}
                delay={0.3}
              />
            </ChartCard>
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
                              to={siteUrl(site.site_id)}
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
              to={ROUTES.addSpecies}
              className="flex items-center gap-3 rounded-xl border border-canopy-900/10 px-3.5 py-3 text-sm font-medium text-ink-950/75 transition-colors hover:border-canopy-700/30 hover:bg-mist-100"
            >
              <Leaf
                size={16}
                className="text-canopy-700"
              />
              Log a species observation
            </Link>

            <Link
              to={ROUTES.protectedSpecies}
              className="flex items-center gap-3 rounded-xl border border-canopy-900/10 px-3.5 py-3 text-sm font-medium text-ink-950/75 transition-colors hover:border-canopy-700/30 hover:bg-mist-100"
            >
              <ShieldCheck
                size={16}
                className="text-canopy-700"
              />
              View protected species list
            </Link>

            <Link
              to={ROUTES.sites}
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
    </>
  )
}

export default DashboardPage