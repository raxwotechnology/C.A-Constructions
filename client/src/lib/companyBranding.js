import { mediaUrl, absoluteMediaUrl } from './media'
import { siteLogoSrc } from '../hooks/useSiteBranding'

/** Build company info object for letters, agreements, invoices */
export function buildCompanyFromSettings(settings = {}) {
  const logo = siteLogoSrc(settings)
  const email =
    settings.adminEmail?.trim() ||
    settings.contactEmail?.trim() ||
    ''
  return {
    name: settings.siteName?.trim() || 'Company',
    tagline: settings.siteDescription?.trim() || '',
    logo,
    logoPath: settings.logoUrl?.trim() || '',
    address: settings.contactAddress?.trim() || '',
    phone: settings.contactPhone?.trim() || '',
    email,
    contactEmail: settings.contactEmail?.trim() || '',
    adminEmail: settings.adminEmail?.trim() || settings.contactEmail?.trim() || '',
    website: settings.websiteUrl?.trim() || '',
    branchDetails: settings.branchDetails?.trim() || '',
    footer: settings.footerText?.trim() || '',
    seal: settings.sealUrl ? mediaUrl(settings.sealUrl) : '',
    letterhead: settings.letterheadUrl ? mediaUrl(settings.letterheadUrl) : '',
    signatures: settings.signatures || {},
  }
}

/** Contact lines for document headers (address, phone, email, website) */
export function companyContactLines(company) {
  const lines = []
  if (company.address) lines.push({ label: 'Address', text: company.address })
  if (company.branchDetails) lines.push({ label: 'Branch', text: company.branchDetails })
  if (company.phone) lines.push({ label: 'Tel', text: company.phone })
  const email = company.email || company.adminEmail || company.contactEmail
  if (email) lines.push({ label: 'Email', text: email })
  if (company.website) lines.push({ label: 'Web', text: company.website })
  return lines
}

function contactBlockHtml(company, { inline = false } = {}) {
  const lines = companyContactLines(company)
  if (!lines.length) return ''
  if (inline) {
    return `<p style="margin:8px 0 0;font-size:9.5pt;color:#475569;line-height:1.5">${lines.map((l) => l.text).join(' · ')}</p>`
  }
  return `<div style="margin:8px 0 0;font-size:9.5pt;color:#475569;line-height:1.65">${lines
    .map(
      (l) =>
        `<div style="margin:2px 0"><span style="color:#94a3b8;min-width:52px;display:inline-block">${l.label}:</span> <span>${escapeHtml(l.text)}</span></div>`,
    )
    .join('')}</div>`
}

function escapeHtml(s) {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Logo img HTML — use forPrint=true in print/PDF */
export function companyLogoHtml(company, { forPrint = false, maxHeight = 56 } = {}) {
  const raw = company.logoPath || company.logo
  const src = forPrint ? absoluteMediaUrl(raw) : company.logo || mediaUrl(raw)
  if (!src) {
    return `<span style="display:inline-flex;width:52px;height:52px;border-radius:10px;background:#1e3a8a;color:#fff;align-items:center;justify-content:center;font-weight:800;font-size:22px">${escapeHtml((company.name || 'C').charAt(0))}</span>`
  }
  return `<img src="${src.replace(/"/g, '')}" alt="" style="max-height:${maxHeight}px;max-width:200px;object-fit:contain;display:block"/>`
}

/** HTML letterhead block for print/PDF */
export function letterheadHtml(company, { forPrint = false } = {}) {
  const logo = companyLogoHtml(company, { forPrint })
  const sealSrc = forPrint ? absoluteMediaUrl(company.seal) : company.seal
  const seal = sealSrc
    ? `<img src="${sealSrc.replace(/"/g, '')}" alt="Seal" style="max-height:64px;margin-left:12px"/>`
    : ''
  return `
    <header style="display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding-bottom:16px;border-bottom:3px solid #1e3a8a;margin-bottom:20px">
      <div style="flex-shrink:0">${logo}</div>
      <div style="text-align:right;flex:1;min-width:180px">
        <h1 style="margin:0;font-size:18px;font-weight:800;color:#0f172a">${escapeHtml(company.name)}</h1>
        ${company.tagline ? `<p style="margin:4px 0 0;font-size:10pt;color:#64748b;font-style:italic">${escapeHtml(company.tagline)}</p>` : ''}
        ${contactBlockHtml(company)}
      </div>
      ${seal}
    </header>`
}

/** Build agreement print options from site settings */
export function buildAgreementPrintOpts(settings, agr, bodyHtml, signatures) {
  const co = buildCompanyFromSettings(settings)
  return {
    siteName: co.name,
    logoUrl: absoluteMediaUrl(co.logoPath || co.logo),
    address: co.address,
    phone: co.phone,
    email: co.email,
    websiteUrl: co.website,
    branchDetails: co.branchDetails,
    locationLine: co.branchDetails || '',
    title: agr?.title,
    agreementNo: agr?.agreementNo || '—',
    agreementDate: agr?.agreementDate
      ? new Date(agr.agreementDate).toLocaleDateString('en-LK')
      : new Date().toLocaleDateString('en-LK'),
    bodyHtml: bodyHtml || '',
    signatures: signatures || agr?.signatures,
  }
}
