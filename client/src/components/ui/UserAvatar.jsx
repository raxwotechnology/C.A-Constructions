import { useState, useEffect } from 'react'
import { mediaUrl, normalizeUploadPath } from '../../lib/media'

export default function UserAvatar({ user, className = '', imgClassName = 'w-full h-full object-cover' }) {
  const [broken, setBroken] = useState(false)
  const avatarPath = user?.avatar || ''

  // Reset broken state whenever the avatar URL changes (e.g. after re-fetch or user change)
  useEffect(() => { setBroken(false) }, [avatarPath])

  const src = avatarPath && !broken ? mediaUrl(normalizeUploadPath(avatarPath) || avatarPath) : ''
  const initial = user?.name?.charAt(0)?.toUpperCase() || '?'

  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-secondary/10 text-secondary font-semibold ${className}`}>
        {initial}
      </div>
    )
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <img
        src={src}
        alt={user?.name || 'User'}
        className={imgClassName}
        onError={() => setBroken(true)}
      />
    </div>
  )
}
