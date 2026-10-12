import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { users } from '../db/schema/index.js'
import { HttpError, asyncRoute } from './error.middleware.js'
export const roles = ['superadmin', 'admin', 'manager', 'teacher', 'student', 'accountant', 'guard', 'cleaner', 'cooking', 'driver', 'ict']
export function authenticate(db, env) {
  return asyncRoute(async (req, res, next) => {
    const header = req.headers.authorization || ''
    const cookieToken = String(req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith('abc_session='))?.slice('abc_session='.length)
    const token = header.startsWith('Bearer ') ? header.slice(7) : cookieToken ? decodeURIComponent(cookieToken) : ''
    if (!token) throw new HttpError(401, 'Sign in to continue.')
    let payload
    try { payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'abc-daycare', audience: 'abc-web' }) }
    catch { throw new HttpError(401, 'Your session expired. Sign in again.') }
    const [user] = await db.select().from(users).where(eq(users.id, payload.sub))
    if (!user || user.status !== 'Active') throw new HttpError(401, 'Your account is unavailable.')
    if (payload.sv !== undefined && payload.sv !== user.sessionVersion) throw new HttpError(401, 'Your session expired. Sign in again.')
    if (payload.sv === undefined && env.NODE_ENV !== 'test') throw new HttpError(401, 'Your session expired. Sign in again.')
    if (user.firstLogin && !['/api/auth/change-password', '/api/auth/me', '/api/auth/logout'].includes(req.originalUrl.split('?')[0])) {
      throw new HttpError(403, 'Change your temporary password before continuing.')
    }
    req.user = user
    req.authMethod = header.startsWith('Bearer ') ? 'bearer' : 'cookie'
    next()
  })
}
export const allow = (...accepted) => (req, res, next) => accepted.includes(req.user.role) ? next() : next(new HttpError(403, 'You do not have access to this resource.'))
export function canAccessRole(user, role) {
  return roles.includes(role) && (user.role === role || user.role === 'superadmin')
}
export function publicUser(user) {
  return {
    id: user.id,
    email: user.email || null,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    schoolId: user.schoolId || null,
    loginId: user.loginId ?? null,
    isVerified: user.isVerified,
    firstLogin: user.firstLogin,
    details: user.details || {},
    createdAt: user.createdAt,
  }
}
