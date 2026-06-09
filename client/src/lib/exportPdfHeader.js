import { companyContactLines } from './companyBranding'
import { absoluteMediaUrl } from './media'

export function loadImgBase64(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    
    const drawAndResolve = (imageElement) => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = imageElement.width
        canvas.height = imageElement.height
        canvas.getContext('2d').drawImage(imageElement, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch (e) {
        resolve(null)
      }
    }

    img.onload = () => drawAndResolve(img)
    img.onerror = () => {
      const fallbackImg = new Image()
      fallbackImg.onload = () => drawAndResolve(fallbackImg)
      fallbackImg.onerror = () => resolve(null)
      fallbackImg.src = url
    }
    img.src = url
  })
}

/** Quotation-style letterhead on jsPDF — logo + name left, contact right, sky-blue rule. */
export async function drawQuotationStylePdfHeader(doc, company, options = {}) {
  const margin = options.margin ?? 14
  const pageWidth = options.pageWidth ?? doc.internal.pageSize.getWidth()
  const rightX = pageWidth - margin
  let y = options.startY ?? margin

  const logoUrl = absoluteMediaUrl(company.logoPath || company.logo)
  const logoBase64 = logoUrl ? await loadImgBase64(logoUrl) : null

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, y, 22, 22, '', 'FAST')
  } else {
    doc.setFillColor(14, 165, 233)
    doc.roundedRect(margin, y, 18, 18, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text((company.name || 'C').charAt(0), margin + 9, y + 12, { align: 'center' })
  }

  const nameX = margin + (logoBase64 ? 26 : 22)
  doc.setFontSize(16)
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.text(company.name || 'Company', nameX, y + 8)

  if (company.tagline) {
    doc.setFontSize(10)
    doc.setTextColor(56, 189, 248) // sky-400 light blue
    doc.setFont('helvetica', 'normal')
    doc.text(company.tagline, nameX, y + 14)
  }

  // Contact details on the right — labels in light blue, values in dark
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  let contactY = y + 4
  companyContactLines(company).forEach((c) => {
    // Label in light blue
    doc.setTextColor(56, 189, 248) // sky-400
    doc.setFont('helvetica', 'bold')
    const labelText = `${c.label}: `
    const labelWidth = doc.getTextWidth(labelText)
    // Value in dark
    doc.setTextColor(71, 85, 105) // slate-600
    doc.setFont('helvetica', 'normal')
    const valueText = c.text
    const fullWidth = labelWidth + doc.getTextWidth(valueText)
    const startX = rightX - fullWidth
    // Draw label
    doc.setTextColor(56, 189, 248)
    doc.setFont('helvetica', 'bold')
    doc.text(labelText, startX, contactY)
    // Draw value
    doc.setTextColor(71, 85, 105)
    doc.setFont('helvetica', 'normal')
    doc.text(valueText, startX + labelWidth, contactY)
    contactY += 5
  })

  const lineY = Math.max(y + 24, contactY + 2)
  // Gradient-like line: draw a thicker sky-blue line
  doc.setDrawColor(14, 165, 233)
  doc.setLineWidth(1.2)
  doc.line(margin, lineY, rightX, lineY)
  // Subtle secondary thin line below
  doc.setDrawColor(186, 230, 253) // sky-200
  doc.setLineWidth(0.4)
  doc.line(margin, lineY + 1.8, rightX, lineY + 1.8)

  return lineY + 12
}

export function drawPdfReportMeta(doc, { title, filterSummary, recordCount, startY, margin = 14 }) {
  let y = startY
  const pageWidth = doc.internal.pageSize.getWidth()
  const rightX = pageWidth - margin

  // Modern title with accent bar
  doc.setFillColor(14, 165, 233) // sky-500
  doc.rect(margin, y - 4, 3, 14, 'F')

  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42) // slate-900
  doc.setFont('helvetica', 'bold')
  doc.text(title, margin + 7, y + 6)
  y += 16
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139) // slate-500
  doc.setFont('helvetica', 'normal')
  if (filterSummary) {
    const filterLines = doc.splitTextToSize(`Filters: ${filterSummary}`, rightX - margin)
    doc.text(filterLines, margin, y)
    y += (filterLines.length * 5) + 2
  }
  doc.text(`Generated: ${new Date().toLocaleString()}  |  Records: ${recordCount ?? 0}`, margin, y)
  // Subtle divider
  y += 6
  doc.setDrawColor(226, 232, 240) // slate-200
  doc.setLineWidth(0.3)
  doc.line(margin, y, rightX, y)
  return y + 8
}
