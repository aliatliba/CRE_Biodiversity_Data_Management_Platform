import { useState, useRef, useEffect } from 'react'
import { Download, FileSpreadsheet, FileText, CheckCircle2, XCircle } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import * as exportService from '../services/exportService'
import type { ExportJob } from '../types'

export function ExportsPage() {
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv')
  const [job, setJob] = useState<ExportJob | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  async function handleCreate() {
    setError(null)
    setIsCreating(true)
    setJob(null)
    try {
      const created = await exportService.createExport(format)
      setJob(created)
      if (created.status !== 'done') {
        pollRef.current = setInterval(async () => {
          const updated = await exportService.getExport(created.id)
          setJob(updated)
          if (updated.status === 'done' || updated.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current)
          }
        }, 1500)
      }
    } catch {
      setError('Could not start the export.')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDownload() {
    if (!job) return
    try {
      await exportService.downloadExport(job)
    } catch {
      setError('Could not download the file.')
    }
  }

  return (
    <AppLayout title="Exports">
      <p className="mb-6 max-w-lg text-sm text-ink-950/55">
        Generate a snapshot of the species catalogue as a CSV or Excel file.
      </p>

      <Card className="max-w-md">
        <h2 className="font-display text-sm font-bold text-canopy-950">New export</h2>
        <div className="mt-4 flex gap-3">
          {(['csv', 'xlsx'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`flex flex-1 flex-col items-center gap-2 rounded-xl border px-4 py-4 text-sm font-medium transition-colors ${
                format === f
                  ? 'border-canopy-700 bg-canopy-700/10 text-canopy-800'
                  : 'border-mist-200 text-ink-950/60 hover:bg-mist-100'
              }`}
            >
              {f === 'csv' ? <FileText size={18} /> : <FileSpreadsheet size={18} />}
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        <Button onClick={handleCreate} isLoading={isCreating} className="mt-5 w-full">
          Generate export
        </Button>

        {error && (
          <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {job && (
          <div className="mt-5 flex items-center justify-between rounded-xl border border-canopy-900/10 bg-mist-100/50 p-4">
            <div className="flex items-center gap-2.5">
              {job.status === 'done' && <CheckCircle2 size={18} className="text-canopy-600" />}
              {job.status === 'failed' && <XCircle size={18} className="text-red-500" />}
              {job.status !== 'done' && job.status !== 'failed' && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-canopy-700 border-t-transparent" />
              )}
              <div>
                <p className="text-sm font-medium text-ink-950">Export #{job.id}</p>
                <Badge tone={job.status === 'done' ? 'success' : job.status === 'failed' ? 'danger' : 'neutral'}>
                  {job.status}
                </Badge>
              </div>
            </div>
            {job.status === 'done' && (
              <Button size="md" variant="secondary" onClick={handleDownload} className="gap-2">
                <Download size={15} />
                Download
              </Button>
            )}
          </div>
        )}
      </Card>
    </AppLayout>
  )
}

export default ExportsPage
