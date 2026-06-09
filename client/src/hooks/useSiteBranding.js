import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { mediaUrl } from '../lib/media'

export const SITE_SETTINGS_QUERY_KEY = ['site-settings']

export function siteLogoSrc(settings) {
  if (!settings?.logoUrl?.trim()) return ''
  const v = settings.updatedAt ? new Date(settings.updatedAt).getTime() : ''
  return `${mediaUrl(settings.logoUrl.trim())}${v ? `?v=${v}` : ''}`
}

export function useSiteBranding() {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: SITE_SETTINGS_QUERY_KEY,
    queryFn: () => api.get('/site-settings').then((r) => r.data),
    staleTime: 5 * 60_000,        // 5 minutes — reduces unnecessary refetches
    refetchOnWindowFocus: true,    // refresh logo/branding when user returns to tab
    refetchOnReconnect: true,      // refresh after network recovery
  })

  const settings = data?.settings || {}
  const logoSrc = siteLogoSrc(settings)
  const siteName = settings.siteName?.trim() || 'Raxwo'
  const siteTagline = settings.siteDescription?.trim() || ''

  return {
    settings,
    logoSrc,
    siteName,
    siteTagline,
    isLoading: isLoading || isFetching,
  }
}

/** Call after admin saves site settings so all pages pick up the new logo. */
export function invalidateSiteBranding(queryClient) {
  queryClient.invalidateQueries({
    predicate: (q) => {
      const root = q.queryKey?.[0]
      return root === 'site-settings' || String(root || '').startsWith('site-settings') || root === 'letter-company-info'
    },
  })
}
