import { mediaUrl, absoluteMediaUrl } from './media'
import { siteLogoSrc } from '../hooks/useSiteBranding'

/** Build company info object for letters, agreements, invoices, BOQs */
export function buildCompanyFromSettings(settings = {}) {
  const logo = siteLogoSrc(settings)
  const email =
    settings.adminEmail?.trim() ||
    settings.contactEmail?.trim() ||
    'racreationshd@gmail.com'
  return {
    name: settings.siteName?.trim() || 'R.A CREATIONS & HOME DESIGNS (PVT) LTD',
    tagline: settings.letterheadTagline?.trim() || settings.siteDescription?.trim() || 'Construction & Home Designs',
    logo,
    logoPath: settings.logoUrl?.trim() || '',
    address: settings.contactAddress?.trim() || 'Sri Lanka / Kossinna',
    phone: settings.contactPhone?.trim() || '0770749690',
    email,
    contactEmail: settings.contactEmail?.trim() || 'racreationshd@gmail.com',
    adminEmail: settings.adminEmail?.trim() || settings.contactEmail?.trim() || 'racreationshd@gmail.com',
    website: settings.websiteUrl?.trim() || 'www.rac.lk',
    branchDetails: settings.branchDetails?.trim() || '',
    footer: settings.footerText?.trim() || '© R.A CREATIONS & HOME DESIGNS (PVT) LTD. All rights reserved.',
    seal: settings.sealUrl ? mediaUrl(settings.sealUrl) : '',
    letterhead: settings.letterheadUrl ? mediaUrl(settings.letterheadUrl) : '',
    signatures: settings.signatures || {},
  }
}

/** Contact lines for document headers */
export function companyContactLines(company) {
  const lines = []
  if (company.address) lines.push({ label: 'Address', text: company.address })
  if (company.phone) lines.push({ label: 'Tel', text: company.phone })
  const email = company.email || company.adminEmail || company.contactEmail
  if (email) lines.push({ label: 'Email', text: email })
  if (company.website) lines.push({ label: 'Web', text: company.website })
  return lines
}

export function contactBlockHtml(company, { inline = false } = {}) {
  const lines = companyContactLines(company)
  if (!lines.length) return ''
  if (inline) {
    return `<p style="margin:4px 0 0;font-size:9.5pt;color:#cbd5e1;line-height:1.5">${lines.map((l) => `<span style="color:#f59e0b;font-weight:700">${l.label}:</span> ${escapeHtml(l.text)}`).join(' · ')}</p>`
  }
  return `<table style="margin:0 0 0 auto;font-size:9pt;color:#e2e8f0;line-height:1.4;border-collapse:collapse;text-align:left">
    <tbody>
      ${lines
        .map(
          (l) =>
            `<tr>
              <td style="padding:1px 6px 1px 0;color:#f59e0b;font-weight:700;text-align:right;vertical-align:top;white-space:nowrap">${l.label}:</td>
              <td style="padding:1px 0;vertical-align:top;white-space:pre-wrap;color:#f8fafc">${escapeHtml(l.text)}</td>
            </tr>`,
        )
        .join('')}
    </tbody>
  </table>`
}

function escapeHtml(s) {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Logo img HTML with fixed dimensions width: 115px; height: 75px; object-fit: contain */
export function companyLogoHtml(company, { forPrint = false } = {}) {
  const raw = company.logoPath || company.logo
  const src = forPrint ? absoluteMediaUrl(raw) : company.logo || mediaUrl(raw)
  if (!src) {
    return `<span style="display:inline-flex;width:115px;height:75px;border-radius:8px;background:#06b6d4;color:#0f172a;align-items:center;justify-content:center;font-weight:900;font-size:24px">RAC</span>`
  }
  return `<img src="${src.replace(/"/g, '')}" alt="Logo" style="width:115px;height:75px;object-fit:contain;display:block"/>`
}

/** HTML letterhead block for print/PDF with Dark Navy/Black background & Gold/Cyan accents */
export function letterheadHtml(company, { forPrint = false, metadata = {} } = {}) {
  const logo = companyLogoHtml(company, { forPrint })
  const contact = contactBlockHtml(company)

  const metaFields = []
  if (metadata.refNo) metaFields.push(`<span><b style="color:#f59e0b">Ref No:</b> ${escapeHtml(metadata.refNo)}</span>`)
  if (metadata.projectName) metaFields.push(`<span><b style="color:#06b6d4">Project:</b> ${escapeHtml(metadata.projectName)}</span>`)
  if (metadata.siteLocation) metaFields.push(`<span><b style="color:#f59e0b">Location:</b> ${escapeHtml(metadata.siteLocation)}</span>`)
  if (metadata.date) metaFields.push(`<span><b style="color:#06b6d4">Date:</b> ${escapeHtml(metadata.date)}</span>`)

  const metaHtml = metaFields.length
    ? `<div style="margin-top:10px;padding:8px 12px;background:rgba(255,255,255,0.08);border-radius:6px;font-size:9pt;color:#e2e8f0;display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between">${metaFields.join('')}</div>`
    : ''

  return `
    <header class="doc-letterhead" style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%);color:#ffffff;padding:16px 20px;border-radius:10px;border-bottom:4px solid #f59e0b;margin-bottom:20px;box-shadow:0 4px 12px rgba(0,0,0,0.15)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:nowrap">
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="flex-shrink:0;width:115px;height:75px;background:#ffffff;border-radius:6px;padding:2px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.2)">
            ${logo}
          </div>
          <div>
            <h1 style="margin:0;font-size:18px;font-weight:900;color:#ffffff;letter-spacing:0.02em;line-height:1.2">${escapeHtml(company.name)}</h1>
            <p style="margin:4px 0 0;font-size:11pt;font-weight:700;color:#06b6d4;letter-spacing:0.04em">${escapeHtml(company.tagline)}</p>
            <div style="height:3px;width:180px;background:linear-gradient(90deg, #f59e0b, #06b6d4);border-radius:9999px;margin-top:6px"></div>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${contact}
        </div>
      </div>
      ${metaHtml}
    </header>`
}

/** Build agreement print options from site settings */
export function buildAgreementPrintOpts(settings, agr, bodyHtml, signatures) {
  const co = buildCompanyFromSettings(settings)
  return {
    company: co,
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
    hasFrame: agr?.hasFrame || false,
  }
}
