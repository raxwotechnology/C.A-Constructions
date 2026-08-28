import { absoluteMediaUrl } from './media'

export const LETTER_SIGNATORY_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'director', label: 'Director' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr', label: 'HR' },
  { value: 'custom', label: 'Custom' },
]

function sealDataFrom(sig = {}, siteSettings = {}) {
  const raw = sig.seal?.data || siteSettings.sealUrl || ''
  return raw ? absoluteMediaUrl(raw) : ''
}

/** Resolve the active signatory for display / print from saved letter + site settings */
export function resolveLetterSignatory(signatures = {}, siteSettings = {}) {
  const siteSigs = siteSettings.signatures || {}
  const activeRole = signatures.activeRole || signatures.selectedRole || 'admin'
  const sealData = sealDataFrom(signatures, siteSettings)

  const buildSignatory = (name, title, data, role) => ({
    role: role || activeRole,
    name: name || '',
    title: title || '',
    data: data ? absoluteMediaUrl(data) : '',
  })

  if (signatures.signatory?.data || signatures.signatory?.name) {
    return {
      activeRole,
      signatory: buildSignatory(
        signatures.signatory.name,
        signatures.signatory.title,
        signatures.signatory.data,
        signatures.signatory.role,
      ),
      seal: { data: sealData },
    }
  }

  const legacyByRole = {
    admin: signatures.hr,
    hr: signatures.hr,
    manager: signatures.manager,
    director: signatures.director,
  }
  const legacy = legacyByRole[activeRole] || signatures.hr || {}
  const fromSite = siteSigs[activeRole] || siteSigs.admin || null

  return {
    activeRole,
    signatory: buildSignatory(
      legacy.name || fromSite?.label || siteSettings.quotationDirectorName || '',
      legacy.title || fromSite?.label || 'Authorized Signatory',
      legacy.data || fromSite?.url || '',
      activeRole,
    ),
    seal: { data: sealData },
  }
}

/** Normalize API letter signatures into editor state */
export function normalizeLetterSignatures(sig = {}, siteSettings = {}) {
  const resolved = resolveLetterSignatory(sig, siteSettings)
  return {
    activeRole: resolved.activeRole,
    signatory: { ...resolved.signatory },
    seal: { data: resolved.seal?.data || '' },
    includeSignature: sig.includeSignature !== false,
    includeSeal: sig.includeSeal !== false,
    hr: sig.hr || { data: '', name: '', title: 'Human Resources' },
    manager: sig.manager || { data: '', name: '', title: 'Line Manager' },
    director: sig.director || { data: '', name: '', title: 'Director' },
  }
}

/** Payload for API save */
export function letterSignaturesToPayload(state = {}) {
  const role = state.activeRole || 'admin'
  return {
    activeRole: role,
    selectedRole: role,
    includeSignature: state.includeSignature !== false,
    includeSeal: state.includeSeal !== false,
    signatory: {
      role,
      name: state.signatory?.name || '',
      title: state.signatory?.title || '',
      data: state.signatory?.data || '',
    },
    seal: { data: state.seal?.data || '' },
    hr: state.hr,
    manager: state.manager,
    director: state.director,
  }
}

export function applySignatoryRole(role, siteSettings = {}, current = {}) {
  const siteSigs = siteSettings.signatures || {}
  const profile = siteSigs[role]
  if (role === 'custom') {
    return {
      ...current,
      activeRole: 'custom',
      signatory: {
        role: 'custom',
        name: current.signatory?.name || '',
        title: current.signatory?.title || 'Authorized Signatory',
        data: current.signatory?.data ? absoluteMediaUrl(current.signatory.data) : '',
      },
      seal: {
        data: current.seal?.data || sealDataFrom(current, siteSettings),
      },
    }
  }
  return {
    ...current,
    activeRole: role,
    signatory: {
      role,
      name: profile?.label || siteSettings.quotationDirectorName || '',
      title: profile?.label || 'Authorized Signatory',
      data: profile?.url ? absoluteMediaUrl(profile.url) : '',
    },
    seal: {
      data: current.seal?.data || sealDataFrom(current, siteSettings),
    },
  }
}
