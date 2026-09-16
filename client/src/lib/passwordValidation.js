export function validateStrongPassword(password) {
  const p = String(password || '')
  if (p.length < 8) return 'Password must be at least 8 characters'
  if (!/[a-z]/.test(p)) return 'Password must include a lowercase letter'
  if (!/[A-Z]/.test(p)) return 'Password must include an uppercase letter'
  if (!/[0-9]/.test(p)) return 'Password must include a number'
  return null
}

export function passwordStrengthHints() {
  return 'At least 8 characters with uppercase, lowercase, and a number'
}
