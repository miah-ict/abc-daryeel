import { HttpError } from './error.middleware.js'

const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor'])
const stateChanging = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function securityHeaders(env) {
  return (_req, res, next) => {
    res.set({
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    })
    if (env.NODE_ENV === 'production') res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    next()
  }
}

export function allowedOrigins(env) {
  return new Set(String(env.CLIENT_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean))
}

export function corsOptions(env) {
  const origins = allowedOrigins(env)
  return {
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    maxAge: 600,
    origin(origin, callback) {
      if (!origin || origins.has(origin)) return callback(null, true)
      callback(new HttpError(403, 'Origin is not allowed.'))
    },
  }
}

export function validateRequestShape(req, _res, next) {
  try {
    if (req.originalUrl.length > 2_048) throw new HttpError(414, 'Request URL is too long.')
    if (stateChanging.has(req.method) && req.headers['content-length'] !== '0' && req.body !== undefined && !req.is('application/json')) {
      throw new HttpError(415, 'Use application/json for request bodies.')
    }
    let visited = 0
    const inspect = (value, depth = 0) => {
      if (++visited > 10_000 || depth > 12) throw new HttpError(400, 'Request body is too complex.')
      if (typeof value === 'string' && /[\u0000\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value)) {
        throw new HttpError(400, 'Request contains invalid control characters.')
      }
      if (!value || typeof value !== 'object') return
      for (const key of Object.keys(value)) {
        if (unsafeKeys.has(key)) throw new HttpError(400, 'Request contains an unsafe field name.')
        inspect(value[key], depth + 1)
      }
    }
    inspect(req.body)
    next()
  } catch (error) { next(error) }
}

export function rateLimit({ windowMs = 15 * 60_000, limit = 300, key = req => req.ip } = {}) {
  const buckets = new Map()
  const cleanup = setInterval(() => {
    const now = Date.now()
    for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(bucketKey)
  }, Math.min(windowMs, 60_000))
  cleanup.unref()
  return (req, res, next) => {
    const now = Date.now(), bucketKey = String(key(req) || 'unknown')
    let bucket = buckets.get(bucketKey)
    if (!bucket || bucket.resetAt <= now) bucket = { count: 0, resetAt: now + windowMs }
    bucket.count += 1
    buckets.set(bucketKey, bucket)
    res.set({
      'RateLimit-Limit': String(limit),
      'RateLimit-Remaining': String(Math.max(0, limit - bucket.count)),
      'RateLimit-Reset': String(Math.ceil(bucket.resetAt / 1000)),
    })
    if (bucket.count > limit) {
      res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)))
      return next(new HttpError(429, 'Too many requests. Please try again later.'))
    }
    next()
  }
}

export function enforceCookieOrigin(env) {
  const origins = allowedOrigins(env)
  return (req, _res, next) => {
    if (!stateChanging.has(req.method) || req.authMethod !== 'cookie') return next()
    const origin = req.get('origin')
    const fetchSite = req.get('sec-fetch-site')
    if ((origin && origins.has(origin)) || fetchSite === 'same-origin') return next()
    next(new HttpError(403, 'Request origin could not be verified.'))
  }
}
