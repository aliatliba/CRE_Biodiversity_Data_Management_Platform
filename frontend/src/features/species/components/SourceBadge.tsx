import { Badge } from '@/components/ui/Badge'

interface SourceInfo {
  source: string
  reference?: string | null
  retrieved_at?: string | null
}

const SOURCE_LABELS: Record<string, string> = {
  GbifClient: 'GBIF',
  IucnClient: 'IUCN',
  PowoClient: 'POWO',
  InaturalistClient: 'iNaturalist',
  WikidataClient: 'Wikidata',
}

export function SourceBadge({
  source,
}: {
  source: SourceInfo | string | null | undefined
}) {
  if (!source) return null

  const sourceName = typeof source === 'string' ? source : source.source

  return (
    <Badge tone="accent" className="font-mono text-[10px] normal-case">
      {SOURCE_LABELS[sourceName] ?? sourceName}
    </Badge>
  )
}