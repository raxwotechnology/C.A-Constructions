import { useState, useEffect } from 'react'
import { mediaUrl, normalizeUploadPath } from '../../lib/media'

export default function UserAvatar({ user, className = '', imgClassName = 'w-full h-full object-cover' }) {
  const [broken, setBroken] = useState(false)
  const avatarPath = user?.avatar || ''

  // Reset broken state whenever the avatar URL changes (e.g. after re-fetch or user change)
  useEffect(() => { setBroken(false) }, [avatarPath])

  const src = avatarPath && !broken 
    ? mediaUrl(normalizeUploadPath(avatarPath) || avatarPath) 
    : (user?.email && !broken ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=ea580c&color=fff&size=128` : '')
    
  const initial = user?.name?.charAt(0)?.toUpperCase() || '?'

  if (!src || broken) {
    return (
      <div className={`flex items-center justify-center bg-orange-100 text-orange-700 font-bold uppercase ${className}`}>
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
