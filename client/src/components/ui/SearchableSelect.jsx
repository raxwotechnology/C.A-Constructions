import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi'

/**
 * Async searchable select with keyboard navigation and pagination.
 * @param {string} value - selected option value
 * @param {function} onChange - (value, option) => void
 * @param {function} loadOptions - async ({ search, page }) => { options: [{value,label}], hasMore }
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
}) {
  const listId = useId()
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const debounceRef = useRef(null)

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [selectedLabel, setSelectedLabel] = useState(initialLabel)

  const fetchPage = useCallback(async (q, p, append = false) => {
    if (!loadOptions) return
    setLoading(true)
    try {
      const result = await loadOptions({ search: q, page: p })
      const opts = result?.options || []
      setOptions(prev => (append ? [...prev, ...opts] : opts))
      setHasMore(Boolean(result?.hasMore))
      setHighlight(0)
    } catch {
      if (!append) setOptions([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [loadOptions])

  useEffect(() => {
    if (initialLabel) setSelectedLabel(initialLabel)
  }, [initialLabel])

  useEffect(() => {
    if (!open) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      fetchPage(search, 1, false)
    }, 280)
    return () => clearTimeout(debounceRef.current)
  }, [search, open, fetchPage])

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

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
      setHighlight(h => Math.min(h + 1, Math.max(0, options.length - 1)))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(h - 1, 0))
    }
    if (e.key === 'Enter' && options[highlight]) {
      e.preventDefault()
      selectOption(options[highlight])
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

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={onKeyDown}
        className={`form-select w-full text-left flex items-center justify-between gap-2 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={`truncate ${!display ? 'text-slate-400' : ''}`}>{display || placeholder}</span>
        <FiChevronDown size={14} className={`text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {clearable && value && !disabled && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange('', null); setSelectedLabel('') }}
          className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
          aria-label="Clear"
        >
          <FiX size={14} />
        </button>
      )}

      {open && (
        <div className="absolute z-[200] mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
            <FiSearch size={14} className="text-slate-400" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type to search…"
              className="flex-1 text-sm outline-none bg-transparent"
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
            {!loading && options.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-slate-400">No results</li>
            )}
            {options.map((opt, i) => (
              <li key={`${opt.value}-${i}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === opt.value}
                  onClick={() => selectOption(opt)}
                  className={`w-full text-left px-3 py-2 text-sm truncate ${
                    i === highlight ? 'bg-secondary/10 text-secondary' : 'hover:bg-slate-50'
                  } ${value === opt.value ? 'font-semibold' : ''}`}
                >
                  {opt.label}
                </button>
              </li>
            ))}
            {loading && options.length > 0 && (
              <li className="px-3 py-2 text-center text-xs text-slate-400">Loading more…</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
