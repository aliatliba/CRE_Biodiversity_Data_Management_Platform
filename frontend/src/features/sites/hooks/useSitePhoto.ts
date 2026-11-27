import { useEffect, useState } from 'react'
import { useQuery, type QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import * as siteService from '../services/siteService'
import type { PhotoChange, Site } from '../types'

/** An object URL for `blob`, revoked when the blob changes or the component unmounts. */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])
  return url
}

/**
 * The site's photo as a displayable URL (null while loading, on error, or when the
 * site has no photo). Each version is fetched once and kept: it never changes.
 */
export function useSitePhotoUrl(site: Pick<Site, 'id' | 'photo_updated_at'>) {
  const version = site.photo_updated_at
  const query = useQuery({
    queryKey: queryKeys.sitePhoto(site.id, version ?? ''),
    queryFn: () => siteService.getSitePhoto(site.id, version!),
    enabled: version != null,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  })
  const url = useObjectUrl(version != null ? query.data : null)
  return { url, isLoading: version != null && query.isPending, isError: query.isError }
}

/**
 * Upload or remove the photo as `change` says. A new photo is put in the cache
 * under its new version, so it shows at once without being downloaded again.
 */
export async function savePhotoChange(
  queryClient: QueryClient,
  siteId: number,
  change: PhotoChange,
): Promise<void> {
  if (change.kind === 'set') {
    const site = await siteService.uploadSitePhoto(siteId, change.photo)
    if (site.photo_updated_at) {
      queryClient.setQueryData(queryKeys.sitePhoto(siteId, site.photo_updated_at), change.photo)
    }
  } else if (change.kind === 'remove') {
    await siteService.removeSitePhoto(siteId)
  }
}
