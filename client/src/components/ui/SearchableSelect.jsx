import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi'

/**
 * Async searchable select with keyboard navigation and pagination.
 * Dropdown renders in a portal so it is not clipped inside modals.
 */
export default function SearchableSelect({
  value,
  onChange,
  loadOptions,
  placeholder = 'Search…',
  disabled = false,
  className = '',
  clearable = true,
  initialLabel = '',
  allowCustom = false,
}) {
  const listId = useId()
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const debounceRef = useRef(null)
  const loadOptionsRef = useRef(loadOptions)

  loadOptionsRef.current = loadOptions

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [selectedLabel, setSelectedLabel] = useState(initialLabel)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 })

  const menuDomId = `menu-${listId.replace(/:/g, '')}`

  const updateMenuPos = useCallback(() => {
    if (!rootRef.current) return
    const rect = rootRef.current.getBoundingClientRect()
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 220),
    })
  }, [])

  const fetchPage = useCallback(async (q, p, append = false) => {
    const loader = loadOptionsRef.current
    if (!loader) return
    setLoading(true)
    setLoadError('')
    try {
      const result = await loader({ search: q, page: p })
      const opts = result?.options || []
      setOptions((prev) => (append ? [...prev, ...opts] : opts))
      setHasMore(Boolean(result?.hasMore))
      setHighlight(0)
    } catch (err) {
      if (!append) setOptions([])
      setHasMore(false)
      setLoadError(err?.response?.data?.message || 'Could not load options')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialLabel) setSelectedLabel(initialLabel)
  }, [initialLabel])

  useEffect(() => {
    if (!open) return
    updateMenuPos()
    const onScroll = () => updateMenuPos()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, updateMenuPos])

  useEffect(() => {
    if (!open) return

    if (!search.trim()) {
      setPage(1)
      fetchPage('', 1, false)
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      fetchPage(search, 1, false)
    }, 280)
    return () => clearTimeout(debounceRef.current)
  }, [search, open, fetchPage])

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current?.contains(e.target)) return
      const menu = document.getElementById(menuDomId)
      if (menu?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuDomId])

  const selectOption = (opt) => {
    onChange?.(opt?.value ?? '', opt)
    setSelectedLabel(opt?.label ?? '')
    setOpen(false)
    setSearch('')
  }

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault()
      setOpen(true)
      return
    }
    if (!open) return
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const maxHighlight = options.length - 1 + (allowCustom && search.trim() ? 1 : 0)
      setHighlight((h) => Math.min(h + 1, Math.max(0, maxHighlight)))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const hasCustom = allowCustom && search.trim()
      if (hasCustom && highlight === 0) {
        selectOption({ value: search, label: search })
      } else {
        const optIndex = hasCustom ? highlight - 1 : highlight
        if (options[optIndex]) {
          selectOption(options[optIndex])
        }
      }
    }
  }

  const onListScroll = () => {
    const el = listRef.current
    if (!el || loading || !hasMore) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      const next = page + 1
      setPage(next)
      fetchPage(search, next, true)
    }
  }

  const display = selectedLabel || (value ? String(value) : '')
  const hasCustomOpt = allowCustom && search.trim()

  const dropdown = open && (
    <div
      id={menuDomId}
      role="presentation"
      style={{
        position: 'fixed',
        top: menuPos.top,
        left: menuPos.left,
        width: menuPos.width,
        zIndex: 9999999,
      }}
      className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
        <FiSearch size={14} className="text-slate-400" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type to search…"
          className="flex-1 text-sm outline-none bg-transparent font-sans"
        />
      </div>
      <ul
        id={listId}
        ref={listRef}
        role="listbox"
        onScroll={onListScroll}
        className="max-h-56 overflow-y-auto py-1"
      >
        {loading && options.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-slate-400">Loading…</li>
        )}
        {!loading && loadError && (
          <li className="px-3 py-4 text-center text-sm text-red-500">{loadError}</li>
        )}
        {!loading && !loadError && options.length === 0 && !hasCustomOpt && (
          <li className="px-3 py-4 text-center text-sm text-slate-400">No results</li>
        )}
        
        {hasCustomOpt && (
          <li>
            <button
              type="button"
              role="option"
              aria-selected={highlight === 0}
              onClick={() => selectOption({ value: search, label: search })}
              className={`w-full text-left px-3 py-2 text-sm truncate font-sans font-medium text-primary ${
                highlight === 0 ? 'bg-secondary/10' : 'hover:bg-slate-50'
              }`}
            >
              Use "{search}"
            </button>
          </li>
        )}

        {options.map((opt, i) => {
          const listIndex = hasCustomOpt ? i + 1 : i;
          return (
            <li key={`${opt.value}-${i}`}>
              <button
                type="button"
                role="option"
                aria-selected={value === opt.value}
                onClick={() => selectOption(opt)}
                className={`w-full text-left px-3 py-2 text-sm truncate font-sans ${
                  listIndex === highlight ? 'bg-secondary/10 text-secondary' : 'hover:bg-slate-50'
                } ${value === opt.value ? 'font-semibold' : ''}`}
              >
                {opt.label}
              </button>
            </li>
          )
        })}
        {loading && options.length > 0 && (
          <li className="px-3 py-2 text-center text-xs text-slate-400">Loading more…</li>
        )}
      </ul>
    </div>
  )

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          if (disabled) return
          if (!open) updateMenuPos()
          setOpen((o) => !o)
        }}
        onKeyDown={onKeyDown}
        className={`form-select w-full text-left flex items-center justify-between gap-2 font-sans text-sm ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={`truncate ${!display ? 'text-slate-400' : ''}`}>{display || placeholder}</span>
        <FiChevronDown size={14} className={`text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {clearable && value && !disabled && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => { e.stopPropagation(); onChange('', null); setSelectedLabel('') }}
          className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
          aria-label="Clear"
        >
          <FiX size={14} />
        </button>
      )}

      {typeof document !== 'undefined' && dropdown && createPortal(dropdown, document.body)}
    </div>
  )
}
