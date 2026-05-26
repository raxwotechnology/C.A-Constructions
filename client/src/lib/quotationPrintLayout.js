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
  return `
    .quotation-doc { font-size: var(--doc-font-size, ${L.fontSizePt}pt); line-height: var(--doc-line-height, ${L.lineHeight}); }
    .quotation-doc .doc-letterhead-wrap { margin-bottom: var(--doc-header-gap, ${L.headerSpacingPx}px); }
    .quotation-doc .doc-footer-area { margin-top: var(--doc-footer-gap, ${L.footerSpacingPx}px); }
    .quotation-doc table.doc-table th,
    .quotation-doc table.doc-table td { padding: var(--doc-table-pad, ${L.tableCellPaddingPx}px); }
    ${L.showDocumentFrame ? '.doc-print-frame { border: 1px solid #cbd5e1; border-radius: 6px; padding: 28px 32px; }' : '.doc-print-frame { border: none; padding: 0; }'}
  `
}
