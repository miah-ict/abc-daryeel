const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

export function isTransientDatabaseError(error) {
  if (!error || error.status || error.name === 'ZodError') return false
  const seen = new Set(), pending = [error]
  while (pending.length) {
    const current = pending.pop()
    if (!current || typeof current !== 'object' || seen.has(current)) continue
    seen.add(current)
    const code = String(current.code || '')
    const message = String(current.message || '')
    if (/^(08|57P0[123]|53300)/.test(code) || /ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ENOTFOUND|socket hang up/i.test(`${code} ${message}`)) return true
    if (current.cause) pending.push(current.cause)
    if (Array.isArray(current.errors)) pending.push(...current.errors)
    for (const key of Reflect.ownKeys(current)) {
      try { const value = current[key]; if (value && typeof value === 'object') pending.push(value) } catch { /* inaccessible event property */ }
    }
  }
  return false
}

export async function retryDatabase(operation, { attempts = 3, delays = [250, 750] } = {}) {
  let lastError
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (!isTransientDatabaseError(error) || attempt === attempts - 1) throw error
      await wait(delays[attempt] ?? delays.at(-1) ?? 5000)
    }
  }
  throw lastError
}
