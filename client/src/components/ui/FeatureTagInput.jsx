import { useState } from 'react'
import { FiX } from 'react-icons/fi'

/** Dynamic tag input — type feature and press Enter */
export default function FeatureTagInput({ value = [], onChange, placeholder = 'Type a feature and press Enter' }) {
  const tags = Array.isArray(value) ? value : []
  const [draft, setDraft] = useState('')

  const addTag = (raw) => {
    const t = String(raw || '').trim()
    if (!t) return
    if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) return
    onChange?.([...tags, t])
    setDraft('')
  }

  const removeTag = (idx) => onChange?.(tags.filter((_, i) => i !== idx))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border border-slate-200 rounded-xl bg-white">
        {tags.map((tag, i) => (
          <span key={`${tag}-${i}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-secondary/10 text-secondary text-sm font-medium rounded-lg border border-secondary/20">
            {tag}
            <button type="button" onClick={() => removeTag(i)} className="p-0.5 hover:bg-secondary/20 rounded" aria-label="Remove">
              <FiX size={12} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag(draft)
            }
            if (e.key === 'Backspace' && !draft && tags.length) removeTag(tags.length - 1)
          }}
          onBlur={() => { if (draft.trim()) addTag(draft) }}
          placeholder={tags.length ? 'Add another…' : placeholder}
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent py-1"
        />
      </div>
      <p className="text-xs text-slate-400">Press Enter to add each feature as a tag</p>
    </div>
  )
}
