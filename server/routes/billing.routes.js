import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { paymentOrders, subscriptions, users } from '../db/schema/index.js'
import { allow } from '../middleware/auth.middleware.js'
import { asyncRoute, HttpError } from '../middleware/error.middleware.js'
import { createSifaloService, isSuccessfulSifaloVerification } from '../services/sifalo.js'

export const BILLING_PLANS = Object.freeze({
  standard: Object.freeze({ code: 'standard', name: 'Standard', amount: '1.00', currency: 'USD', interval: 'month', managers: 1, accountants: 1, schools: 1 }),
  enterprise: Object.freeze({ code: 'enterprise', name: 'Enterprise', amount: '10.00', currency: 'USD', interval: 'month', managers: 2, accountants: 2, schools: 1 }),
})

const checkoutInput = z.object({ planCode: z.enum(['standard', 'enterprise']) }).strict()
const orderIdInput = z.string().uuid()

function toCents(value) {
  const match = String(value ?? '').trim().match(/^(\d+)(?:\.(\d{1,2}))?$/)
  if (!match) return null
  return Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'))
}

function addMonth(value) {
  const date = new Date(value)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + 1)
  const finalDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, finalDay))
  return date
}

function providerState(result) {
  if (isSuccessfulSifaloVerification(result)) return 'paid'
  if (result?.status === 'pending' || Number(result?.code) === 603) return 'pending'
  return 'failed'
}

function assertVerificationMatches(order, sid, result) {
  if (!result || typeof result !== 'object') throw new HttpError(502, 'Sifalo returned an invalid verification response.')
  if (result.sid != null && String(result.sid) !== sid) throw new HttpError(409, 'The payment session does not match this order.')
  if (order.providerSid && order.providerSid !== sid) throw new HttpError(409, 'The payment session does not match this order.')
  if (result.order_id != null) {
    const allowed = new Set([order.id, order.providerOrderId].filter(Boolean))
    if (!allowed.has(String(result.order_id))) throw new HttpError(409, 'The verified transaction belongs to a different order.')
  }
  if (toCents(result.amount) !== toCents(order.amount) || String(result.currency || '').toUpperCase() !== order.currency) {
    throw new HttpError(409, 'The verified amount or currency does not match this order.')
  }
}

async function applyVerification(db, orderId, sid, result) {
  return db.transaction(async tx => {
    const [order] = await tx.select().from(paymentOrders).where(eq(paymentOrders.id, orderId)).for('update')
    if (!order) throw new HttpError(404, 'Payment order not found.')
    assertVerificationMatches(order, sid, result)

    if (order.status === 'paid') {
      const [subscription] = await tx.select().from(subscriptions).where(eq(subscriptions.ownerUserId, order.ownerUserId))
      return { order, subscription: subscription || null }
    }

    const state = providerState(result)
    const provider = {
      providerSid: sid,
      providerCode: Number.isFinite(Number(result.code)) ? Number(result.code) : null,
      providerStatus: result.status == null ? null : String(result.status),
      paymentType: result.payment_type == null ? null : String(result.payment_type),
      updatedAt: new Date(),
    }
    if (state !== 'paid') {
      const [updated] = await tx.update(paymentOrders).set({ ...provider, status: state }).where(eq(paymentOrders.id, order.id)).returning()
      return { order: updated, subscription: null }
    }

    // Lock the owner row so two different successful renewal orders cannot
    // race while creating or extending the single subscription row.
    const [owner] = await tx.select({ id: users.id, schoolId: users.schoolId }).from(users).where(eq(users.id, order.ownerUserId)).for('update')
    if (!owner) throw new HttpError(409, 'The payment owner no longer exists.')
    const [existing] = await tx.select().from(subscriptions).where(eq(subscriptions.ownerUserId, order.ownerUserId)).for('update')
    const now = new Date()
    const renewing = existing?.status === 'active' && new Date(existing.currentPeriodEnd) > now
    const startsAt = renewing ? new Date(existing.currentPeriodStart) : now
    const endsAt = addMonth(renewing ? new Date(existing.currentPeriodEnd) : now)
    let subscription
    if (existing) {
      ;[subscription] = await tx.update(subscriptions).set({
        schoolId: existing.schoolId || owner.schoolId || null,
        planCode: order.planCode,
        status: 'active',
        currentPeriodStart: startsAt,
        currentPeriodEnd: endsAt,
        paymentOrderId: order.id,
        updatedAt: now,
      }).where(eq(subscriptions.id, existing.id)).returning()
    } else {
      ;[subscription] = await tx.insert(subscriptions).values({
        id: randomUUID(),
        ownerUserId: order.ownerUserId,
        schoolId: owner.schoolId || null,
        planCode: order.planCode,
        status: 'active',
        currentPeriodStart: startsAt,
        currentPeriodEnd: endsAt,
        paymentOrderId: order.id,
      }).returning()
    }
    const [updated] = await tx.update(paymentOrders).set({ ...provider, status: 'paid', paidAt: now }).where(eq(paymentOrders.id, order.id)).returning()
    return { order: updated, subscription }
  })
}

function callbackUrl(base, pathname, orderId) {
  const url = new URL(pathname, base)
  url.searchParams.set('order_id', orderId)
  return url.toString()
}

function publicWebhookUrl(base, orderId) {
  const url = new URL(base)
  if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1'].includes(url.hostname)) return undefined
  return callbackUrl(base, '/api/billing/webhooks/sifalo', orderId)
}

function publicOrder(order) {
  return {
    id: order.id,
    planCode: order.planCode,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    providerCode: order.providerCode,
    providerStatus: order.providerStatus,
    paymentType: order.paymentType,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
  }
}

export function billingPublicRoutes(db, env) {
  const router = Router()
  const sifalo = createSifaloService(env)

  router.get('/return', asyncRoute(async (req, res) => {
    const parsed = z.object({ order_id: orderIdInput, sid: z.string().trim().min(1).max(500) }).safeParse(req.query)
    const resultUrl = new URL('/payment/result', env.CLIENT_ORIGIN)
    if (!parsed.success) {
      resultUrl.searchParams.set('status', 'failed')
      return res.redirect(303, resultUrl.toString())
    }
    const { order_id: orderId, sid } = parsed.data
    resultUrl.searchParams.set('orderId', orderId)
    resultUrl.searchParams.set('sid', sid)
    try {
      const verification = await sifalo.verify(sid)
      const result = await applyVerification(db, orderId, sid, verification)
      resultUrl.searchParams.set('status', result.order.status)
    } catch (error) {
      console.error('Sifalo return verification failed:', error.message)
      resultUrl.searchParams.set('status', 'pending')
    }
    res.redirect(303, resultUrl.toString())
  }))

  router.post('/webhooks/sifalo', asyncRoute(async (req, res) => {
    const input = z.object({ sid: z.string().trim().min(1).max(500), order_id: orderIdInput.optional() }).passthrough().parse(req.body || {})
    const orderId = orderIdInput.parse(req.query.order_id || input.order_id)
    const verification = await sifalo.verify(input.sid)
    const result = await applyVerification(db, orderId, input.sid, verification)
    res.json({ received: true, status: result.order.status })
  }))

  return router
}

export function billingRoutes(db, env) {
  const router = Router()
  const sifalo = createSifaloService(env)
  router.use(allow('admin'))

  router.get('/plans', (_req, res) => res.json(Object.values(BILLING_PLANS)))

  router.post('/checkout', asyncRoute(async (req, res) => {
    const { planCode } = checkoutInput.parse(req.body)
    const plan = BILLING_PLANS[planCode]
    const orderId = randomUUID()
    await db.insert(paymentOrders).values({
      id: orderId,
      ownerUserId: req.user.id,
      planCode,
      amount: plan.amount,
      currency: plan.currency,
      status: 'pending',
    })
    try {
      const session = await sifalo.createCheckout({
        amount: plan.amount.replace(/\.00$/, ''),
        currency: plan.currency,
        returnUrl: callbackUrl(env.PUBLIC_APP_URL, '/api/billing/return', orderId),
        webhookUrl: publicWebhookUrl(env.PUBLIC_APP_URL, orderId),
      })
      if (session.providerOrderId) await db.update(paymentOrders).set({ providerOrderId: session.providerOrderId, updatedAt: new Date() }).where(eq(paymentOrders.id, orderId))
      res.status(201).json({ orderId, checkoutUrl: session.checkoutUrl, plan })
    } catch (error) {
      await db.update(paymentOrders).set({ status: 'failed', providerStatus: 'checkout_error', updatedAt: new Date() }).where(eq(paymentOrders.id, orderId))
      throw error
    }
  }))

  router.get('/subscription', asyncRoute(async (req, res) => {
    let [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.ownerUserId, req.user.id))
    if (subscription?.status === 'active' && new Date(subscription.currentPeriodEnd) <= new Date()) {
      ;[subscription] = await db.update(subscriptions).set({ status: 'expired', updatedAt: new Date() }).where(and(eq(subscriptions.id, subscription.id), eq(subscriptions.status, 'active'))).returning()
    }
    res.json({ subscription: subscription || null })
  }))

  router.get('/payment/:orderId', asyncRoute(async (req, res) => {
    const orderId = orderIdInput.parse(req.params.orderId)
    const suppliedSid = z.string().trim().min(1).max(500).optional().parse(req.query.sid)
    let [order] = await db.select().from(paymentOrders).where(and(eq(paymentOrders.id, orderId), eq(paymentOrders.ownerUserId, req.user.id)))
    if (!order) throw new HttpError(404, 'Payment order not found.')
    const sid = order.providerSid || suppliedSid
    if (order.status === 'pending' && sid) {
      const verification = await sifalo.verify(sid)
      ;({ order } = await applyVerification(db, order.id, sid, verification))
    }
    res.json(publicOrder(order))
  }))

  return router
}
