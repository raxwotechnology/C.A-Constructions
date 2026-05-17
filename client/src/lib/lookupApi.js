import api from './api'

/** Async loader for SearchableSelect — returns { options, hasMore } */
export function createLookupLoader(type, extraParams = {}) {
  return async ({ search = '', page = 1 } = {}) => {
    const params = new URLSearchParams({ search, page: String(page), limit: '20' })
    Object.entries(extraParams).forEach(([k, v]) => {
      if (v != null && v !== '') params.set(k, v)
    })
    const { data } = await api.get(`/lookups/${type}?${params}`)
    return {
      options: data.options || [],
      hasMore: Boolean(data.hasMore),
    }
  }
}

/** Stable loader — uses /lookups/clients, falls back to /clients if lookup fails or is empty */
async function loadClientOptions({ search = '', page = 1 } = {}) {
  const limit = 20
  try {
    const params = new URLSearchParams({ search, page: String(page), limit: String(limit) })
    const { data } = await api.get(`/lookups/clients?${params}`)
    if (data?.options?.length) {
      return { options: data.options, hasMore: Boolean(data.hasMore) }
    }
  } catch {
    /* fall through to /clients */
  }

  const { data } = await api.get('/clients')
  const q = search.trim().toLowerCase()
  const all = (data?.clients || []).map((c) => ({
    value: String(c._id),
    label: `${c.name || 'Client'}${c.email ? ` (${c.email})` : ''}`,
  }))
  const filtered = q
    ? all.filter((o) => o.label.toLowerCase().includes(q))
    : all
  const start = (Math.max(1, page) - 1) * limit
  const slice = filtered.slice(start, start + limit + 1)
  const hasMore = slice.length > limit
  return {
    options: hasMore ? slice.slice(0, limit) : slice,
    hasMore,
  }
}

export const lookupLoaders = {
  employees: (extra = {}) => createLookupLoader('employees', { assignable: '1', ...extra }),
  employeesAll: (extra = {}) => createLookupLoader('employees', extra),
  clients: () => loadClientOptions,
  banks: (extra = {}) => createLookupLoader('banks', extra),
  projects: (extra = {}) => createLookupLoader('projects', extra),
  invoices: () => createLookupLoader('invoices'),
  suppliers: () => createLookupLoader('suppliers'),
  loans: (extra = {}) => createLookupLoader('loans', extra),
  branches: () => createLookupLoader('branches'),
}
