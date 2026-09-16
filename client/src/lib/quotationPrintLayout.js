const STORAGE_KEY = 'raxwo-quotation-print-layout'

export const DEFAULT_QUOTATION_LAYOUT = {
  fontSizePt: 11,
  lineHeight: 1.5,
  pagePaddingMm: 14,
  headerSpacingPx: 24,
  footerSpacingPx: 32,
  tableCellPaddingPx: 10,
  contentMaxWidth: '100%',
  showDocumentFrame: true,
  showRefOnDocument: true,
}

export function quotationLayoutFromSettings(settings = {}) {
  return {
    fontSizePt: Number(settings.quotationLayoutFontSizePt ?? DEFAULT_QUOTATION_LAYOUT.fontSizePt),
    lineHeight: Number(settings.quotationLayoutLineHeight ?? DEFAULT_QUOTATION_LAYOUT.lineHeight),
    pagePaddingMm: Number(settings.quotationLayoutPagePaddingMm ?? DEFAULT_QUOTATION_LAYOUT.pagePaddingMm),
    headerSpacingPx: Number(settings.quotationLayoutHeaderSpacingPx ?? DEFAULT_QUOTATION_LAYOUT.headerSpacingPx),
    footerSpacingPx: Number(settings.quotationLayoutFooterSpacingPx ?? DEFAULT_QUOTATION_LAYOUT.footerSpacingPx),
    tableCellPaddingPx: Number(settings.quotationLayoutTableCellPaddingPx ?? DEFAULT_QUOTATION_LAYOUT.tableCellPaddingPx),
    contentMaxWidth: settings.quotationLayoutContentMaxWidth || DEFAULT_QUOTATION_LAYOUT.contentMaxWidth,
    showDocumentFrame:
      settings.quotationLayoutShowDocumentFrame == null
        ? DEFAULT_QUOTATION_LAYOUT.showDocumentFrame
        : Boolean(settings.quotationLayoutShowDocumentFrame),
    showRefOnDocument:
      settings.quotationLayoutShowRefOnDocument == null
        ? DEFAULT_QUOTATION_LAYOUT.showRefOnDocument
        : Boolean(settings.quotationLayoutShowRefOnDocument),
  }
}

export function quotationLayoutToSettings(layout = DEFAULT_QUOTATION_LAYOUT) {
  const L = { ...DEFAULT_QUOTATION_LAYOUT, ...layout }
  return {
    quotationLayoutFontSizePt: Number(L.fontSizePt),
    quotationLayoutLineHeight: Number(L.lineHeight),
    quotationLayoutPagePaddingMm: Number(L.pagePaddingMm),
    quotationLayoutHeaderSpacingPx: Number(L.headerSpacingPx),
    quotationLayoutFooterSpacingPx: Number(L.footerSpacingPx),
    quotationLayoutTableCellPaddingPx: Number(L.tableCellPaddingPx),
    quotationLayoutContentMaxWidth: L.contentMaxWidth || '100%',
    quotationLayoutShowDocumentFrame: Boolean(L.showDocumentFrame),
    quotationLayoutShowRefOnDocument: Boolean(L.showRefOnDocument),
  }
}

export function loadQuotationLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_QUOTATION_LAYOUT }
    return { ...DEFAULT_QUOTATION_LAYOUT, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_QUOTATION_LAYOUT }
  }
}

export function saveQuotationLayout(layout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch {
    /* ignore */
  }
}

/** CSS custom properties applied on `.quotation-doc` */
export function layoutToStyle(layout = DEFAULT_QUOTATION_LAYOUT) {
  const L = { ...DEFAULT_QUOTATION_LAYOUT, ...layout }
  return {
    '--doc-font-size': `${L.fontSizePt}pt`,
    '--doc-line-height': String(L.lineHeight),
    '--doc-page-pad': `${L.pagePaddingMm}mm`,
    '--doc-header-gap': `${L.headerSpacingPx}px`,
    '--doc-footer-gap': `${L.footerSpacingPx}px`,
    '--doc-table-pad': `${L.tableCellPaddingPx}px`,
    fontSize: 'var(--doc-font-size)',
    lineHeight: 'var(--doc-line-height)',
    padding: 'var(--doc-page-pad)',
    maxWidth: L.contentMaxWidth,
  }
}

export function layoutPrintExtraCss(layout = DEFAULT_QUOTATION_LAYOUT) {
  const L = { ...DEFAULT_QUOTATION_LAYOUT, ...layout }
  const docSel = '.quotation-doc, .invoice-doc, .doc-print-frame'
  const frameRule = L.showDocumentFrame
    ? `${docSel} { border: 1px solid #cbd5e1; border-radius: 6px; padding: ${L.pagePaddingMm}mm; font-size: ${L.fontSizePt}pt; line-height: ${L.lineHeight}; box-sizing: border-box; }`
    : `${docSel} { border: none; padding: ${L.pagePaddingMm}mm; font-size: ${L.fontSizePt}pt; line-height: ${L.lineHeight}; box-sizing: border-box; }`
  return `
    ${frameRule}
    .quotation-doc, .invoice-doc { font-size: var(--doc-font-size, ${L.fontSizePt}pt); line-height: var(--doc-line-height, ${L.lineHeight}); }
    .quotation-doc .doc-letterhead-wrap, .invoice-doc .doc-letterhead-wrap { margin-bottom: var(--doc-header-gap, ${L.headerSpacingPx}px); }
    .quotation-doc .doc-footer-area, .invoice-doc .doc-footer-area { margin-top: var(--doc-footer-gap, ${L.footerSpacingPx}px); }
    .quotation-doc table.doc-table th, .quotation-doc table.doc-table td,
    .invoice-doc table.doc-table th, .invoice-doc table.doc-table td { padding: var(--doc-table-pad, ${L.tableCellPaddingPx}px); }
    .invoice-doc-inner, .quotation-doc-inner { font-family: 'Segoe UI', system-ui, sans-serif; color: #0f172a; }
    @media print {
      @page { size: A4; margin: 16mm 14mm 14mm 14mm; }
      ${docSel} {
        border: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        font-size: ${L.fontSizePt}pt !important;
        line-height: ${L.lineHeight} !important;
      }
      .quotation-doc-inner, .invoice-doc-inner {
        font-size: ${L.fontSizePt}pt !important;
        line-height: ${L.lineHeight} !important;
      }
      .doc-letterhead-wrap { page-break-after: avoid; page-break-inside: avoid; }
    }
  `
}
