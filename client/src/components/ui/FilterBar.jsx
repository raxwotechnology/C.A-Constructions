import { useState } from 'react'
import { FiSearch, FiCalendar, FiChevronDown } from 'react-icons/fi'

const PRESETS = [
  { label: 'Today', getValue: () => { const d = new Date().toISOString().split('T')[0]; return { start: d, end: d } } },
  { label: 'This Week', getValue: () => {
    const now = new Date(); const day = now.getDay()
    const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    return { start: mon.toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] }
  }},
  { label: 'This Month', getValue: () => {
    const now = new Date()
    return { start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], end: now.toISOString().split('T')[0] }
  }},
  { label: 'This Quarter', getValue: () => {
    const now = new Date(); const q = Math.floor(now.getMonth() / 3)
    return { start: new Date(now.getFullYear(), q * 3, 1).toISOString().split('T')[0], end: now.toISOString().split('T')[0] }
  }},
  { label: 'This Year', getValue: () => {
    const y = new Date().getFullYear()
    return { start: `${y}-01-01`, end: new Date().toISOString().split('T')[0] }
  }},
]

/**
 * FilterBar — universal filter bar for all list pages
 *
 * Props:
 *   search, onSearchChange
 *   startDate, endDate, onStartChange, onEndChange
 *   categoryOptions  — [{ label, value }]
 *   category, onCategoryChange
 *   branchOptions    — [{ label, value }]
 *   branch, onBranchChange
 *   extraFilters     — any JSX to slot in (e.g. status dropdown)
 */
export default function FilterBar({
  search = '', onSearchChange,
  startDate = '', endDate = '',
  onStartChange, onEndChange,
  categoryOptions = [], category = '', onCategoryChange,
  branchOptions = [], branch = '', onBranchChange,
  extraFilters,
  searchPlaceholder = 'Search...',
}) {
  const [showPresets, setShowPresets] = useState(false)

  const applyPreset = (preset) => {
    const { start, end } = preset.getValue()
    onStartChange?.(start)
    onEndChange?.(end)
    setShowPresets(false)
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Search */}
      {onSearchChange && (
        <div className="relative flex-1 min-w-[180px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="form-input pl-9 py-2 text-sm w-full"
          />
        </div>
      )}

      {/* Date presets + custom range */}
      {(onStartChange || onEndChange) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="relative">
            <button
              onClick={() => setShowPresets(s => !s)}
              className="flex items-center gap-1 py-2 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <FiCalendar size={13} />
              <span className="hidden sm:inline">Preset</span>
              <FiChevronDown size={12} />
            </button>
            {showPresets && (
              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden min-w-[130px]">
                {PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="date"
            value={startDate}
            onChange={e => onStartChange?.(e.target.value)}
            className="form-input py-2 text-sm"
          />
          <span className="text-gray-400 text-xs">–</span>
          <input
            type="date"
            value={endDate}
            onChange={e => onEndChange?.(e.target.value)}
            className="form-input py-2 text-sm"
          />
        </div>
      )}

      {/* Category filter */}
      {categoryOptions.length > 0 && (
        <select
          value={category}
          onChange={e => onCategoryChange?.(e.target.value)}
          className="form-select py-2 text-sm"
        >
          <option value="">All Categories</option>
          {categoryOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {/* Branch filter */}
      {branchOptions.length > 0 && (
        <select
          value={branch}
          onChange={e => onBranchChange?.(e.target.value)}
          className="form-select py-2 text-sm"
        >
          <option value="">All Branches</option>
          {branchOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {/* Slot for page-specific filters */}
      {extraFilters}
    </div>
  )
}
