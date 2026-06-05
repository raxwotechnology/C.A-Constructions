import { useEffect, useRef, useState, useCallback } from 'react'
import {
  LETTER_PAGE_WIDTH,
  LETTER_PAGE_HEIGHT,
  LETTER_PAGE_PADDING,
  LETTER_PAGE_GAP,
  LETTER_COMPACT_CSS,
} from '../../lib/letterDocument'

/**
 * WYSIWYG A4 page preview — stacked sheets + page-break guides that update with content and scale.
 */
export default function LetterPaginatedPreview({
  children,
  scale = 100,
  compact = false,
  measureKey = '',
  className = '',
}) {
  const contentRef = useRef(null)
  const [pageCount, setPageCount] = useState(1)

  const zoom = Math.max(0.85, Math.min(1.15, scale / 100))
  const scaledW = LETTER_PAGE_WIDTH * zoom
  const scaledH = LETTER_PAGE_HEIGHT * zoom
  const compactClass = compact ? 'letter-compact letter-compact-more' : ''

  const measure = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    const h = el.scrollHeight || el.offsetHeight || 0
    setPageCount(Math.max(1, Math.ceil(h / LETTER_PAGE_HEIGHT)))
  }, [])

  useEffect(() => {
    measure()
    const el = contentRef.current
    if (!el) return undefined

    const ro = new ResizeObserver(() => measure())
    ro.observe(el)

    const mo = new MutationObserver(() => measure())
    mo.observe(el, { childList: true, subtree: true, characterData: true })

    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [measure, scale, compact, children, measureKey])

  useEffect(() => {
    const t = setTimeout(measure, 50)
    return () => clearTimeout(t)
  }, [measureKey, measure])

  const sheetStep = scaledH + LETTER_PAGE_GAP
  const totalHeight = pageCount * scaledH + Math.max(0, pageCount - 1) * LETTER_PAGE_GAP

  return (
    <div className={`letter-paginated-preview ${className}`}>
      <style>{LETTER_COMPACT_CSS}</style>

      <div
        className="relative mx-auto"
        style={{ width: scaledW, minHeight: totalHeight }}
      >
        {/* A4 sheet backgrounds */}
        {Array.from({ length: pageCount }).map((_, i) => (
          <div
            key={`sheet-${i}`}
            className="absolute left-0 bg-white rounded-lg shadow-lg border border-slate-200 pointer-events-none"
            style={{
              top: i * sheetStep,
              width: scaledW,
              height: scaledH,
              zIndex: 0,
            }}
          >
            <span
              className="absolute top-2.5 right-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
              style={{ zoom: 1 / zoom }}
            >
              Page {i + 1} of {pageCount}
            </span>
          </div>
        ))}

        {/* Flowing letter content (single DOM — works in edit + preview) */}
        <div
          className="relative"
          style={{ zIndex: 1, width: scaledW }}
        >
          <div
            ref={contentRef}
            className={`letter-pdf-prose letter-page-content ${compactClass}`}
            style={{
              width: LETTER_PAGE_WIDTH,
              padding: LETTER_PAGE_PADDING,
              fontFamily: "'Segoe UI',system-ui,-apple-system,sans-serif",
              color: '#0f172a',
              fontSize: '11pt',
              lineHeight: 1.6,
              zoom,
              transformOrigin: 'top left',
            }}
          >
            {children}
          </div>
        </div>

        {/* Page break indicators between sheets */}
        {pageCount > 1 &&
          Array.from({ length: pageCount - 1 }).map((_, i) => (
            <div
              key={`break-${i}`}
              className="absolute left-0 right-0 flex items-center justify-center pointer-events-none"
              style={{
                top: (i + 1) * sheetStep - 1,
                height: 2,
                zIndex: 2,
              }}
            >
              <div className="absolute inset-x-3 border-t-2 border-dashed border-sky-400/70" />
              <span
                className="relative shrink-0 rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700"
                style={{ zoom: 1 / zoom }}
              >
                Page {i + 2} starts here
              </span>
            </div>
          ))}
      </div>

      <p className="text-center text-xs text-slate-500 mt-3">
        {pageCount === 1 ? (
          <>Fits on <strong>1 page</strong> at {scale}% scale{compact ? ' (compact)' : ''}.</>
        ) : (
          <span className="text-amber-700">
            Spans <strong>{pageCount} pages</strong> at {scale}% scale
            {compact ? ' (compact)' : ''}
            {!compact && ' — enable Compact to one page when printing if needed.'}
          </span>
        )}
      </p>
    </div>
  )
}
