import { Input } from '@/components/ui/Input'
import { SourceBadge } from './SourceBadge'
import type { SpeciesLookupDraft } from '../types'

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
}

function ReadOnlyField({
  label,
  value,
  source,
}: ReadOnlyFieldProps): React.ReactNode {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-canopy-900/70">
          {label}
        </span>

        <SourceBadge source={source} />
      </div>

      <p className="rounded-xl border border-mist-200 bg-mist-100/40 px-4 py-2.5 text-[15px] text-ink-950/80">
        {value || '—'}
      </p>
    </div>
  )
}

export function SpeciesReviewForm({
  draft,
  values,
  onChange,
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
      <section>
        <h3 className="mb-4 font-display text-sm font-medium text-ink-950">
          Taxonomy
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyField
            label="Kingdom"
            value={t.kingdom}
            source={sources.kingdom}
          />

          <ReadOnlyField
            label="Class"
            value={t.class_name}
            source={sources.class_name}
          />

          <ReadOnlyField
            label="Order"
            value={t.order_name}
            source={sources.order_name}
          />

          <ReadOnlyField
            label="Family"
            value={t.family}
            source={sources.family}
          />

          <ReadOnlyField
            label="Genus"
            value={t.genus}
            source={sources.genus}
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
            onChange={(e) => set('common_name', e.target.value)}
            placeholder={t.common_name ?? 'e.g. Afares oak'}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-4 font-display text-sm font-medium text-ink-950">
          Conservation status
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyField
            label="IUCN status"
            value={c.iucn_status}
            source={sources.iucn_status}
          />

          <ReadOnlyField
            label="IUCN trend"
            value={c.iucn_trend}
            source={sources.iucn_trend}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-4 font-display text-sm font-medium text-ink-950">
          Ecological traits
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Guild"
            value={values.guild}
            onChange={(e) => set('guild', e.target.value)}
          />

          <Input
            label="Ecosystem service"
            value={values.ecosystem_service}
            onChange={(e) => set('ecosystem_service', e.target.value)}
          />

          <Input
            label="Habitat"
            value={values.habitat}
            onChange={(e) => set('habitat', e.target.value)}
          />

          <Input
            label="Typology"
            value={values.typology}
            onChange={(e) => set('typology', e.target.value)}
          />

          <Input
            label="Endemism"
            value={values.endemism}
            onChange={(e) => set('endemism', e.target.value)}
          />

          <Input
            label="Potential threats"
            value={values.potential_threats}
            onChange={(e) => set('potential_threats', e.target.value)}
          />
        </div>

        <div className="mt-4">
          <Input
            label="Reference"
            value={values.reference}
            onChange={(e) => set('reference', e.target.value)}
            placeholder="Field notes, citation, or source link"
          />
        </div>
      </section>
    </div>
  )
}