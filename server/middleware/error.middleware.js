export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status }
}
import { isTransientDatabaseError, retryDatabase } from '../db/retry.js'

const canRetryRequest = req => req.method === 'GET' || req.method === 'HEAD' || (req.method === 'POST' && req.baseUrl === '/api/auth' && req.path === '/login')

export const asyncRoute = fn => async (req, res, next) => {
  try {
    if (!canRetryRequest(req)) return await fn(req, res, next)
    return await retryDatabase(() => fn(req, res, next))
  } catch (error) {
    next(error)
  }
}
export function errorMiddleware(err, req, res, next) {
  if (res.headersSent) return next(err)
  const status = err.status || (err.name === 'ZodError' ? 400 : err.code === '23505' ? 409 : err.code === '23503' ? 400 : 500)
  if (status >= 500) {
    console.error('API error:', err.message)
    if (process.env.NODE_ENV !== 'production') {
      if (err.cause) console.error('Inner error:', err.cause)
      if (err.stack) console.error(err.stack)
    }
  }
  if (status >= 500 && isTransientDatabaseError(err)) res.set('Retry-After', '2')
  const serverMessage = err.name === 'SifaloError'
    ? err.message
    : 'The database service is temporarily unavailable. Please retry in a moment.'
  res.status(status).json({ error: status >= 500 ? serverMessage : err.code === '23505' ? 'This record already exists.' : err.code === '23503' ? 'A referenced record does not exist.' : err.name === 'ZodError' ? err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') : err.message })
}
