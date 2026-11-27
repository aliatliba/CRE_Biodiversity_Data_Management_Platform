import { Mountain } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSitePhotoUrl } from '../hooks/useSitePhoto'
import type { Site } from '../types'

interface SitePhotoBannerProps {
  site: Pick<Site, 'id' | 'name' | 'photo_updated_at'>
  /** Size it here (e.g. "h-32"); the photo covers the whole box. */
  className?: string
  /** Without a photo: show a plain banner (true) or render nothing (false). */
  placeholder?: boolean
}

/** The site's landscape photo, cropped to fill its box, fading in once loaded. */
export function SitePhotoBanner({ site, className, placeholder = false }: SitePhotoBannerProps) {
  const { url, isLoading } = useSitePhotoUrl(site)
  if (site.photo_updated_at == null && !placeholder) return null

  return (
    <div className={cn('relative overflow-hidden bg-canopy-700/10', className)}>
      {url ? (
        <img
          key={url}
          src={url}
          alt={`Landscape at ${site.name}`}
          decoding="async"
          // Set on the element itself: the fade needs no re-render.
          onLoad={(e) => {
            e.currentTarget.dataset.loaded = 'true'
          }}
          className="h-full w-full object-cover opacity-0 transition-opacity duration-500 data-[loaded=true]:opacity-100"
        />
      ) : isLoading ? (
        <div className="absolute inset-0 animate-pulse bg-canopy-700/10" aria-hidden="true" />
      ) : (
        <div className="flex h-full items-center justify-center text-canopy-700/35" aria-hidden="true">
          <Mountain size={28} strokeWidth={1.5} />
        </div>
      )}
    </div>
  )
}
