import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Leaf, MapPin, Link2, History, ShieldCheck } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
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

  const statusEntries = stats ? Object.entries(stats.status_breakdown) : []
  const maxCount = Math.max(1, ...statusEntries.map(([, count]) => count))

  return (
    <AppLayout title="Dashboard">
      <p className="mb-7 text-sm text-ink-950/55">
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

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
            <Card>
              <h2 className="font-display text-lg font-medium text-ink-950">
                National status breakdown
              </h2>
              <div className="mt-5 flex flex-col gap-3">
                {statusEntries.length === 0 && (
                  <p className="text-sm text-ink-950/50">No species logged yet.</p>
                )}
                {statusEntries.map(([status, count]) => (
                  <div key={status} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-xs font-medium text-ink-950/60">
                      {status}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist-100">
                      <div
                        className="h-full rounded-full bg-canopy-700"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-canopy-800">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-medium text-ink-950">Quick links</h2>
              <Link
                to="/species/new"
                className="flex items-center gap-3 rounded-xl border border-mist-200/80 px-3.5 py-3 text-sm font-medium text-ink-950/75 transition-colors hover:border-canopy-700/30 hover:bg-paper-50"
              >
                <Leaf size={16} className="text-canopy-700" />
                Log a species observation
              </Link>
              <Link
                to="/protected-species"
                className="flex items-center gap-3 rounded-xl border border-mist-200/80 px-3.5 py-3 text-sm font-medium text-ink-950/75 transition-colors hover:border-canopy-700/30 hover:bg-paper-50"
              >
                <ShieldCheck size={16} className="text-canopy-700" />
                View protected species list
              </Link>
              <Link
                to="/sites"
                className="flex items-center gap-3 rounded-xl border border-mist-200/80 px-3.5 py-3 text-sm font-medium text-ink-950/75 transition-colors hover:border-canopy-700/30 hover:bg-paper-50"
              >
                <MapPin size={16} className="text-canopy-700" />
                Browse survey sites
              </Link>
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

export default DashboardPage
