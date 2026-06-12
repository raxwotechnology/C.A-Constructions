import { useRef } from 'react'
import api from '../../lib/api'
import { mediaUrl } from '../../lib/media'
import { useSiteBranding } from '../../hooks/useSiteBranding'
import toast from 'react-hot-toast'

/**
 * Pick saved company signature/seal or upload a new image.
 * value: { data: base64 or url, label?, position? }
 */
export default function DocumentAssetPicker({
  label = 'Signature',
  value = { data: '', label: '', position: 'left' },
  onChange,
  assetType = 'signature', // signature | seal
  roleKey = 'hr', // hr | admin | manager — for saved signatures
  showPosition = false,
}) {
  const { settings } = useSiteBranding()
  const fileRef = useRef(null)

  const savedOptions = assetType === 'seal'
    ? (settings.sealUrl ? [{ id: 'seal', label: 'Company seal', url: settings.sealUrl }] : [])
    : ['hr', 'admin', 'manager'].map((k) => {
      const sig = settings.signatures?.[k]
      if (!sig?.url) return null
      return { id: k, label: sig.label || k.toUpperCase(), url: sig.url }
    }).filter(Boolean)

  const uploadImage = async (file) => {
    const fd = new FormData()
    fd.append('image', file)
    const { data } = await api.post('/uploads/image', fd)
    return data.imageUrl
  }

  const applyUrl = (url) => {
    const src = url.startsWith('data:') ? url : mediaUrl(url)
    onChange?.({ ...value, data: src })
  }

  return (
    <div className="space-y-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">{label}</p>
      {savedOptions.length > 0 && (
        <select
          className="form-select text-sm"
          value=""
          onChange={(e) => {
            const opt = savedOptions.find((o) => o.id === e.target.value)
            if (opt) applyUrl(opt.url)
            e.target.value = ''
          }}
        >
          <option value="">Select saved {assetType}…</option>
          {savedOptions.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      )}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          className="btn-outline btn-sm text-xs"
          onClick={() => fileRef.current?.click()}
        >
          Upload image
        </button>
        {value?.data && (
          <button type="button" className="btn-ghost btn-sm text-xs text-red-500" onClick={() => onChange?.({ ...value, data: '' })}>
            Clear
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
          const url = await uploadImage(file)
          applyUrl(url)
          toast.success('Image uploaded')
        } catch (err) {
          toast.error(err.response?.data?.message || 'Upload failed')
        }
        e.target.value = ''
      }} />
      {showPosition && (
        <select className="form-select text-sm" value={value.position || 'left'} onChange={(e) => onChange?.({ ...value, position: e.target.value })}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      )}
      {value?.data && (
        <img src={mediaUrl(value.data)} alt="" className="max-h-16 object-contain border border-slate-200 rounded bg-white p-1" />
      )}
    </div>
  )
}
