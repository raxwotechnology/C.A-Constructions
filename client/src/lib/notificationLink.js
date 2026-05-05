export function resolveNotificationLink(link, role, id) {
  if (!link) return `/${role}/notifications/${id}`

  if (link === '/messages') {
    if (role === 'client') return '/messages'
    return `/${role}/messages`
  }

  if (link === '/notifications') {
    if (role === 'client') return '/notifications'
    if (role === 'developer') return '/developer/notifications'
    return `/${role}/notifications/${id}`
  }

  if (link === '/admin/bookings' && role !== 'admin') {
    return `/${role}/notifications/${id}`
  }

  return link
}

