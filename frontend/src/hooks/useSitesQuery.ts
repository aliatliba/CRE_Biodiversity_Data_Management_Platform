import { useQuery } from '@tanstack/react-query'
import * as siteService from '@/features/sites/services/siteService'
import { queryKeys } from '@/lib/queryKeys'

/** All sites. Shared query key: fetched once and reused by every page that needs the list. */
export function useSitesQuery() {
  return useQuery({
    queryKey: queryKeys.sites,
    queryFn: () => siteService.listSites(),
  })
}
