import {mutate} from '../services/mutate.js'
import { Router } from 'express'
import { z } from 'zod'
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { eq, and, gt } from 'drizzle-orm'
import { users, schools, subscriptions } from '../db/schema/index.js'
import { asyncRoute, HttpError } from '../middleware/error.middleware.js'
import { publicUser } from '../middleware/auth.middleware.js'
import { createEmailService } from '../services/email.js'
import { enforceCookieOrigin, rateLimit } from '../middleware/security.middleware.js'

const credentials = z.object({ 
  identifier: z.string().trim().min(1).optional(), // Can be email or loginId
  email: z.string().trim().email().optional(), // Compatibility with the email-only login form
  password: z.string().min(1).max(128),
  schoolId: z.string().max(100).optional(), // Provided if using loginId
  remember: z.boolean().optional(),
}).refine(value => value.identifier || value.email, { message: 'Email or login ID is required' })

const registration = z.object({
  email: z.string().trim().email().transform(v => v.toLowerCase()),
  password: z.string().min(12).max(128),
  fullName: z.string().trim().min(2).max(120),
  role: z.never().optional(),
})

const verifySchema = z.object({
  email: z.string().trim().email().transform(v => v.toLowerCase()),
  code: z.string().length(6)
})
const resendSchema = z.object({ email: z.string().trim().email().transform(v => v.toLowerCase()) })

const onboardSchema = z.object({
  schoolName: z.string().trim().min(2).max(120),
  schoolLogo: z.string().url().refine(value => value.startsWith('https://'), 'School logo must use HTTPS').optional(),
  schoolLocation: z.string().trim().max(240).optional(),
  schoolPhone: z.string().trim().max(40).optional(),
  schoolEmail: z.string().trim().email().optional(),
  schoolInfo: z.string().trim().max(2000).optional()
})

const changePasswordSchema = z.object({
  newPassword: z.string().min(12).max(128)
})

export function authRoutes(db, env, auth) {
  const router = Router()
  const emailService = createEmailService(env)
  const hashVerification = value => createHmac('sha256', env.JWT_SECRET).update(`verify:${value}`).digest('hex')
  const verificationMatches = (stored, supplied) => {
    const expected = Buffer.from(hashVerification(supplied))
    const actual = Buffer.from(String(stored || ''))
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  }
  const newVerification = () => {
    const code = String(randomInt(100000, 1_000_000))
    return { code, digest: hashVerification(code), expiresAt: new Date(Date.now() + 10 * 60 * 1000) }
  }
  const sendVerification = async (email, verification) => {
    if (!emailService.configured) throw new HttpError(503, 'Verification email is not configured. Contact the school administrator.')
    try { await emailService.sendVerificationCode({ email, code: verification.code }) }
    catch (error) {
      console.error('Verification email delivery failed:', error.message)
      throw new HttpError(503, 'We could not send the verification email. Please try again in a moment.')
    }
  }

  router.use(rateLimit({limit: env.NODE_ENV === 'test' ? 10_000 : 30, key: req => `${req.ip}:${req.path}`}))
  const session = (res, user, remember = false) => {
    const maxAge = remember ? 30 * 24 * 60 * 60 : 8 * 60 * 60
    const token = jwt.sign({ sv: user.sessionVersion }, env.JWT_SECRET, { subject: user.id, expiresIn: maxAge, issuer: 'abc-daycare', audience: 'abc-web', algorithm: 'HS256' })
    res.append('Set-Cookie', `abc_session=${encodeURIComponent(token)}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${env.NODE_ENV === 'production' ? '; Secure' : ''}`)
    return { user: publicUser(user), ...(env.NODE_ENV === 'test' ? { token } : {}) }
  }

  router.get('/schools', asyncRoute(async (_req, res) => {
    const registeredSchools = await db.select({ id: schools.id, name: schools.name }).from(schools)
    res.json(registeredSchools.sort((a, b) => a.name.localeCompare(b.name)))
  }))
  
  router.post('/register', asyncRoute(async (req, res) => {
    const data = registration.parse(req.body)
    const existing = await db.select().from(users).where(eq(users.email, data.email))
    if (existing.length > 0) throw new HttpError(400, 'Email already registered')
    
    const passwordHash = await bcrypt.hash(data.password, 12)
    const verification = newVerification()
    
    const [user] = await mutate(db,null,'auth.register',tx=>tx.insert(users).values({
      id: randomUUID(),
      email: data.email,
      fullName: data.fullName,
      passwordHash,
      role: 'admin',
      isVerified: false,
      verificationCode: verification.digest,
      verificationCodeExpiresAt: verification.expiresAt,
      firstLogin: false // Admins set their own password initially
    }).returning())
    
    await sendVerification(data.email, verification)
    
    res.status(201).json({ message: 'Registration successful. Check email for verification code.' })
  }))

  router.post('/verify', asyncRoute(async (req, res) => {
    const data = verifySchema.parse(req.body)
    const [user] = await db.select().from(users).where(eq(users.email, data.email))
    if (!user) throw new HttpError(404, 'User not found')
    if (user.isVerified) throw new HttpError(400, 'User already verified')
    if (!user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < new Date()) throw new HttpError(400, 'This verification code has expired. Request a new code.')
    if (!verificationMatches(user.verificationCode, data.code)) throw new HttpError(400, 'Invalid verification code')

    await mutate(db, null, 'auth.verify', tx => tx.update(users).set({ isVerified: true, verificationCode: null, verificationCodeExpiresAt: null, status: 'Active' }).where(eq(users.id, user.id)))
    res.json({ message: 'Email verified successfully. You can now login.' })
  }))

  router.post('/resend-verification', asyncRoute(async (req, res) => {
    const data = resendSchema.parse(req.body)
    const [user] = await db.select().from(users).where(eq(users.email, data.email))
    if (!user || user.isVerified) return res.json({ message: 'If an unverified account exists, a new code has been sent.' })
    const verification = newVerification()
    await mutate(db, null, 'auth.resend_verification', tx => tx.update(users).set({ verificationCode: verification.digest, verificationCodeExpiresAt: verification.expiresAt }).where(eq(users.id, user.id)))
    await sendVerification(data.email, verification)
    res.json({ message: 'A new verification code has been sent.' })
  }))

  router.post('/login', asyncRoute(async (req, res) => {
    const data = credentials.parse(req.body)
    const identifier = (data.identifier || data.email).toLowerCase()
    let user
    
    if (identifier.includes('@')) {
      const [found] = await db.select().from(users).where(eq(users.email, identifier))
      user = found
    } else {
      if (!data.schoolId) throw new HttpError(400, 'School ID is required when logging in with ID')
      if(!/^\d+$/.test(identifier))throw new HttpError(400,'Invalid login ID format')
      const loginId = Number(identifier)
      if (!Number.isSafeInteger(loginId)) throw new HttpError(400, 'Invalid login ID format')
      const [found] = await db.select().from(users).where(and(eq(users.loginId, loginId), eq(users.schoolId, data.schoolId)))
      user = found
    }
    
    if (!user || !user.passwordHash || user.status !== 'Active' || !await bcrypt.compare(data.password, user.passwordHash)) {
      throw new HttpError(401, 'Invalid credentials')
    }
    
    if (user.role === 'admin' && !user.isVerified) {
      throw new HttpError(403, 'Please verify your email first')
    }
    
    res.json(session(res, user, data.remember))
  }))

  router.post('/onboard', auth, enforceCookieOrigin(env), asyncRoute(async (req, res) => {
    const user = req.user
    if (user.role !== 'admin') throw new HttpError(403, 'Only admins can onboard a school')
    if (user.schoolId) throw new HttpError(400, 'School already onboarded')

    const data = onboardSchema.parse(req.body)
    const schoolId = randomUUID()

    await mutate(db, null, 'auth.onboard', async tx => {
      const [subscription] = await tx.select().from(subscriptions).where(and(
        eq(subscriptions.ownerUserId, user.id),
        eq(subscriptions.status, 'active'),
        gt(subscriptions.currentPeriodEnd, new Date()),
      )).for('update')
      if (!subscription) throw new HttpError(402, 'An active monthly subscription is required before school setup.')
      await tx.insert(schools).values({
        id: schoolId,
        name: data.schoolName,
        logo: data.schoolLogo,
        info: JSON.stringify({ description: data.schoolInfo || '', location: data.schoolLocation || '', phone: data.schoolPhone || '', email: data.schoolEmail || '' })
      })
      await tx.update(users).set({ schoolId }).where(eq(users.id, user.id))
      await tx.update(subscriptions).set({ schoolId, updatedAt: new Date() }).where(eq(subscriptions.id, subscription.id))
    })

    const [updatedUser] = await db.select().from(users).where(eq(users.id, user.id))
    res.json({ message: 'School onboarded successfully', ...session(res, updatedUser) })
  }))

  router.post('/change-password', auth, enforceCookieOrigin(env), asyncRoute(async (req, res) => {
    const data = changePasswordSchema.parse(req.body)
    const user = req.user
    
    if (!user.firstLogin) throw new HttpError(400, 'Password change only required on first login')
    
    const passwordHash = await bcrypt.hash(data.newPassword, 12)
    const [updatedUser] = await mutate(db, user, 'auth.change_password', tx => tx.update(users).set({ passwordHash, firstLogin: false, sessionVersion: user.sessionVersion + 1 }).where(eq(users.id, user.id)).returning())
    res.json({ message: 'Password updated successfully', ...session(res, updatedUser) })
  }))

  router.get('/me', auth, (req,res) => res.json(publicUser(req.user)))
  router.post('/logout', (_req, res) => {
    res.append('Set-Cookie', `abc_session=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0${env.NODE_ENV === 'production' ? '; Secure' : ''}`)
    res.status(204).end()
  })
  return router
}
