import { Input } from '@/components/ui/Input'
import { SourceBadge } from './SourceBadge'
import IucnAssessmentSelector from './IucnAssessmentSelector'
import type { IucnAssessment, SpeciesLookupDraft } from '../types'

export interface ReviewFormValues {
  common_name: string
  guild: string
  ecosystem_service: string
  habitat: string
  typology: string
  endemism: string
  potential_threats: string
  reference: string
}

interface SourceInfo {
  source: string
  reference?: string | null
  retrieved_at?: string | null
  [key: string]: unknown
}

interface ReadOnlyFieldProps {
  label: string
  value?: string | null
  source?: string | SourceInfo | null
}

interface SpeciesReviewFormProps {
  draft: SpeciesLookupDraft
  values: ReviewFormValues
  onChange: (values: ReviewFormValues) => void
  selectedIucnAssessment: IucnAssessment | null
  onIucnAssessmentChange: (
    assessment: IucnAssessment | null
  ) => void
}

function ReadOnlyField({
  label,
  value,
  source,
  critical = false,
  warnIfMissing = false,
}: ReadOnlyFieldProps & {
  critical?: boolean
  warnIfMissing?: boolean
}) {
  const isMissing = !value || value.trim() === ''
  const showWarning = isMissing && (critical || warnIfMissing)

  const missingStyles = critical
    ? 'border-red-300 bg-red-50 text-red-700'
    : 'border-amber-300 bg-amber-50 text-amber-800'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-canopy-900/70">
          {label}
        </span>

        <SourceBadge source={source} />
      </div>

      <p
        className={`rounded-xl border px-4 py-2.5 text-[15px] ${
          showWarning
            ? `${missingStyles} font-medium`
            : 'border-mist-200 bg-mist-100/40 text-ink-950/80'
        }`}
      >
        {showWarning
          ? critical
            ? 'Missing — critical taxonomy data'
            : 'Missing — conservation data'
          : value || '—'}
      </p>
    </div>
  )
}

export function SpeciesReviewForm({
  draft,
  values,
  onChange,
  selectedIucnAssessment,
  onIucnAssessmentChange,
}: SpeciesReviewFormProps) {
  const t = draft.taxonomy
  const c = draft.conservation
  const sources = draft.field_sources

  function set<K extends keyof ReviewFormValues>(
    key: K,
    value: string
  ) {
    onChange({ ...values, [key]: value })
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ─────────────────────────────────────────────
          Taxonomy
      ───────────────────────────────────────────── */}
      <section>
        <h3 className="mb-4 font-display text-sm font-bold text-canopy-950">
          Taxonomy
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyField
            label="Kingdom"
            value={t.kingdom}
            source={sources.kingdom}
            critical
          />

          <ReadOnlyField
            label="Class"
            value={t.class_name}
            source={sources.class_name}
            critical
          />

          <ReadOnlyField
            label="Order"
            value={t.order_name}
            source={sources.order_name}
            critical
          />

          <ReadOnlyField
            label="Family"
            value={t.family}
            source={sources.family}
            critical
          />

          <ReadOnlyField
            label="Genus"
            value={t.genus}
            source={sources.genus}
            critical
          />

          <ReadOnlyField
            label="Species epithet"
            value={t.species_epithet}
            source={sources.species_epithet}
          />
        </div>

        <div className="mt-4">
          <Input
            label="Common name"
            value={values.common_name}
            onChange={(e) =>
              set('common_name', e.target.value)
            }
            placeholder={t.common_name ?? 'e.g. Afares oak'}
          />
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          Conservation
      ───────────────────────────────────────────── */}
      <section>
        <h3 className="mb-4 font-display text-sm font-bold text-canopy-950">
          Conservation status
        </h3>

        {/* Assessment selection */}
        <IucnAssessmentSelector
          assessments={c.iucn_assessments}
          selectedAssessmentId={
            selectedIucnAssessment?.assessment_id ?? null
          }
          onSelect={onIucnAssessmentChange}
        />

        {/* Selected assessment values */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyField
            label="IUCN status"
            value={selectedIucnAssessment?.category ?? null}
            source={
              selectedIucnAssessment
                ? {
                    source: 'iucn',
                    reference: `assessment:${selectedIucnAssessment.assessment_id}`,
                    retrieved_at: null,
                  }
                : sources.iucn_status
            }
            warnIfMissing
          />

          <ReadOnlyField
            label="IUCN trend"
            value={
              selectedIucnAssessment?.population_trend ?? null
            }
            source={
              selectedIucnAssessment
                ? {
                    source: 'iucn',
                    reference: `assessment:${selectedIucnAssessment.assessment_id}`,
                    retrieved_at: null,
                  }
                : sources.iucn_trend
            }
          />
        </div>

        {!selectedIucnAssessment && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">
              No IUCN assessment selected
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-700">
              Select an available assessment above before saving.
              The status and population trend will be taken from
              that same assessment.
            </p>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────
          Ecological traits
      ───────────────────────────────────────────── */}
      <section>
        <h3 className="mb-4 font-display text-sm font-bold text-canopy-950">
          Ecological traits
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Guild"
            value={values.guild}
            onChange={(e) =>
              set('guild', e.target.value)
            }
          />

          <Input
            label="Ecosystem service"
            value={values.ecosystem_service}
            onChange={(e) =>
              set('ecosystem_service', e.target.value)
            }
          />

          <Input
            label="Habitat"
            value={values.habitat}
            onChange={(e) =>
              set('habitat', e.target.value)
            }
          />

          <Input
            label="Typology"
            value={values.typology}
            onChange={(e) =>
              set('typology', e.target.value)
            }
          />

          <Input
            label="Endemism"
            value={values.endemism}
            onChange={(e) =>
              set('endemism', e.target.value)
            }
          />

          <Input
            label="Potential threats"
            value={values.potential_threats}
            onChange={(e) =>
              set('potential_threats', e.target.value)
            }
          />
        </div>

        <div className="mt-4">
          <Input
            label="Reference"
            value={values.reference}
            onChange={(e) =>
              set('reference', e.target.value)
            }
            placeholder="Field notes, citation, or source link"
          />
        </div>
      </section>
    </div>
  )
}