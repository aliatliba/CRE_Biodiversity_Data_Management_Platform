import { Check, Globe2, Map, MapPinned, TrendingDown, CalendarDays } from 'lucide-react'
import type { IucnAssessment } from '../types'

interface IucnAssessmentSelectorProps {
  assessments?: IucnAssessment[]
  selectedAssessmentId?: number | string | null
  onSelect: (assessment: IucnAssessment | null) => void
}

const SCOPES = [
  {
    key: 'Global' as const,
    label: 'Global',
    description: 'Worldwide IUCN Red List assessment',
    icon: Globe2,
  },
  {
    key: 'Europe' as const,
    label: 'Europe',
    description: 'European regional assessment',
    icon: Map,
  },
  {
    key: 'Mediterranean' as const,
    label: 'Mediterranean',
    description: 'Mediterranean regional assessment',
    icon: MapPinned,
  },
]

export default function IucnAssessmentSelector({
  assessments = [],
  selectedAssessmentId,
  onSelect,
}: IucnAssessmentSelectorProps) {
  const getAssessment = (scope: IucnAssessment['scope']) =>
    assessments.find((assessment) => assessment.scope === scope)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-fg">
          IUCN Red List assessment
        </h3>

        <p className="mt-1 text-sm text-fg-subtle">
          Select the assessment you want to use for this species.
          The IUCN status and population trend will always come from
          the same assessment.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {SCOPES.map((scope) => {
          const assessment = getAssessment(scope.key)
          const Icon = scope.icon

          const isSelected =
            !!assessment &&
            String(selectedAssessmentId) ===
              String(assessment.assessment_id)

          if (!assessment) {
            return (
              <div
                key={scope.key}
                className="relative rounded-xl border border-dashed border-line bg-mist-100/60 p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-fg-subtle shadow-sm ring-1 ring-mist-200">
                    <Icon size={19} />
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold text-fg-muted">
                      {scope.label}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-fg-subtle">
                      No assessment available
                    </p>
                  </div>
                </div>
              </div>
            )
          }

          return (
            <button
              key={scope.key}
              type="button"
              onClick={() => onSelect(assessment)}
              className={[
                'group relative w-full rounded-xl border p-5 text-left transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-canopy-600/30',
                isSelected
                  ? 'border-canopy-600 bg-canopy-50 shadow-md shadow-canopy-900/5'
                  : 'border-line bg-surface hover:-translate-y-0.5 hover:border-canopy-200 hover:shadow-md',
              ].join(' ')}
            >
              {isSelected && (
                <div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-canopy-600 text-white">
                  <Check size={15} strokeWidth={2.5} />
                </div>
              )}

              <div className="flex items-start gap-3">
                <div
                  className={[
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                    isSelected
                      ? 'bg-canopy-600 text-white'
                      : 'bg-canopy-50 text-canopy-700 group-hover:bg-canopy-100',
                  ].join(' ')}
                >
                  <Icon size={19} />
                </div>

                <div className="min-w-0 pr-8">
                  <p className="font-semibold text-fg">
                    {scope.label}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-fg-subtle">
                    {scope.description}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-paper-0/80 px-3 py-2.5 ring-1 ring-mist-200">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                    <CalendarDays size={12} />
                    Year
                  </div>

                  <p className="mt-1 text-sm font-semibold text-fg-muted">
                    {assessment.year ?? '—'}
                  </p>
                </div>

                <div className="rounded-xl bg-paper-0/80 px-3 py-2.5 ring-1 ring-mist-200">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                    Category
                  </p>

                  <p className="mt-1 text-sm font-bold text-canopy-700">
                    {assessment.category ?? '—'}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-paper-0/80 px-3 py-2.5 ring-1 ring-mist-200">
                <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                  <TrendingDown size={12} />
                  Population trend
                </div>

                <p className="mt-1 text-sm font-medium text-fg-muted">
                  {assessment.population_trend ?? 'Not available'}
                </p>
              </div>

              <div
                className={[
                  'mt-4 text-center text-xs font-semibold',
                  isSelected
                    ? 'text-canopy-700'
                    : 'text-fg-subtle group-hover:text-canopy-700',
                ].join(' ')}
              >
                {isSelected ? 'Selected assessment' : 'Use this assessment'}
              </div>
            </button>
          )
        })}
      </div>

      {selectedAssessmentId != null && (
        <div className="flex items-center gap-2 rounded-xl border border-canopy-200 bg-canopy-50 px-4 py-3 text-sm text-canopy-900">
          <Check size={17} className="shrink-0" />

          <span>
            The selected assessment will provide both the IUCN status
            and population trend when the species is saved.
          </span>
        </div>
      )}
    </div>
  )
}