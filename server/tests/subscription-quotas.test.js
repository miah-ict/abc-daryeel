import { IncomingMessage, ServerResponse } from 'node:http'
import { Duplex } from 'node:stream'
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { eq } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { createApp } from '../app.js'
import { paymentOrders, schools, subscriptions, users, workspaces } from '../db/schema/index.js'

let client, db, app
const originalFetch = globalThis.fetch
const env = {
  JWT_SECRET: 'quota-test-secret-with-at-least-32-characters', CLIENT_ORIGIN: 'http://localhost:5173',
  PUBLIC_APP_URL: 'https://api.school.test', NODE_ENV: 'test', SIFALO_ENV: 'staging',
  SIFALO_API_USER: 'staging-user', SIFALO_API_KEY: 'staging-key',
}
const tokenFor = id => jwt.sign({}, env.JWT_SECRET, {
  subject: id,
  expiresIn: '8h',
  issuer: 'abc-daycare',
  audience: 'abc-web',
  algorithm: 'HS256',
})

const request = (path, { token, body, method = 'GET' } = {}) => new Promise((resolve, reject) => {
  const chunks = [], socket = new Duplex({ read() {}, write(chunk, encoding, done) { chunks.push(Buffer.from(chunk)); done() } })
  Object.defineProperty(socket, 'remoteAddress', { value: '127.0.0.1' })
  const req = new IncomingMessage(socket), res = new ServerResponse(req)
  req.complete = true
  req.method = method
  req.url = `/api${path}`
  req.headers = { host: 'localhost', ...(token ? { authorization: `Bearer ${token}` } : {}) }
  const input = body ? Buffer.from(JSON.stringify(body)) : null
  if (input) {
    req.headers['content-type'] = 'application/json'
    req.headers['content-length'] = String(input.length)
  }
  res.assignSocket(socket)
  const timeout = setTimeout(() => reject(new Error('In-process HTTP request timed out')), 15_000)
  res.on('finish', () => {
    clearTimeout(timeout)
    const raw = Buffer.concat(chunks).toString(), payload = raw.slice(raw.indexOf('\r\n\r\n') + 4)
    let body = payload
    try { body = payload ? JSON.parse(payload) : null } catch {}
    resolve({ status: res.statusCode, body, location: res.getHeader('location') })
  })
  res.on('error', reject)
  app(req, res)
  if (input) req.push(input)
  req.push(null)
})

before(async () => {
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith('/verify.php')) {
      const { sid } = JSON.parse(options.body)
      return new Response(JSON.stringify({ sid, status: 'success', code: 601, amount: '1', currency: 'USD', payment_type: 'EDAHAB' }), { status: 200 })
    }
    return new Response(JSON.stringify({ key: 'hosted-key', token: 'hosted-token' }), { status: 200 })
  }
  client = new PGlite()
  db = drizzle(client)
  const files = (await fs.readdir(new URL('../db/migrations/', import.meta.url))).filter(file => file.endsWith('.sql')).sort()
  for (const file of files) await client.exec(await fs.readFile(new URL(`../db/migrations/${file}`, import.meta.url), 'utf8'))
  await db.insert(schools).values([
    { id: 'school-a', name: 'Subscribed School' },
    { id: 'school-b', name: 'Unsubscribed School' },
  ])
  await db.insert(users).values([
    { id: 'super', email: 'super@quota.test', fullName: 'Super Admin', role: 'superadmin', isVerified: true, firstLogin: false },
    { id: 'owner-a', email: 'owner-a@quota.test', fullName: 'Owner A', role: 'admin', schoolId: 'school-a', isVerified: true, firstLogin: false },
    { id: 'owner-b', email: 'owner-b@quota.test', fullName: 'Owner B', role: 'admin', schoolId: 'school-b', isVerified: true, firstLogin: false },
  ])
  await db.insert(workspaces).values({ id: 'school', revision: 1, data: {} })
  await db.insert(paymentOrders).values({
    id: 'order-a', ownerUserId: 'owner-a', planCode: 'standard', amount: '1.00', status: 'paid', paidAt: new Date('2020-02-01T00:00:00Z'),
  })
  // Deliberately expired: status alone must never grant paid seats.
  await db.insert(subscriptions).values({
    id: 'subscription-a', ownerUserId: 'owner-a', schoolId: 'school-a', planCode: 'standard', status: 'active',
    currentPeriodStart: new Date('2020-01-01T00:00:00Z'), currentPeriodEnd: new Date('2020-02-01T00:00:00Z'), paymentOrderId: 'order-a',
  })
  app = createApp(db, env)
})

after(async () => { globalThis.fetch = originalFetch; if (client) await client.close() })

test('active, unexpired plans enforce manager/accountant seats across every write path', async () => {
  const adminA = tokenFor('owner-a'), adminB = tokenFor('owner-b'), superToken = tokenFor('super')

  const noSubscription = await request('/users', { token: adminB, method: 'POST', body: { fullName: 'Blocked Manager', role: 'manager' } })
  assert.equal(noSubscription.status, 403)
  assert.match(noSubscription.body.error, /active subscription/i)

  const dormantB = await request('/users', { token: adminB, method: 'POST', body: { fullName: 'Dormant Manager', role: 'manager', status: 'Inactive' } })
  assert.equal(dormantB.status, 201)
  assert.equal((await request(`/users/${dormantB.body.id}`, { token: adminB, method: 'PUT', body: { status: 'Active' } })).status, 403)

  const dormantManager = await request('/users', { token: adminA, method: 'POST', body: { fullName: 'First Manager', role: 'manager', status: 'Inactive' } })
  assert.equal(dormantManager.status, 201)
  const expiredReactivation = await request(`/users/${dormantManager.body.id}`, { token: adminA, method: 'PUT', body: { status: 'Active' } })
  assert.equal(expiredReactivation.status, 403)

  await db.update(subscriptions).set({ currentPeriodEnd: new Date('2099-02-01T00:00:00Z') }).where(eq(subscriptions.id, 'subscription-a'))
  assert.equal((await request(`/users/${dormantManager.body.id}`, { token: adminA, method: 'PUT', body: { status: 'Active' } })).status, 200)

  const standardOverflow = await request('/users', { token: adminA, method: 'POST', body: { fullName: 'Second Active Manager', role: 'manager' } })
  assert.equal(standardOverflow.status, 409)
  assert.match(standardOverflow.body.error, /allows 1 active manager/i)
  const secondManager = await request('/users', { token: adminA, method: 'POST', body: { fullName: 'Second Manager', role: 'manager', status: 'Inactive' } })
  assert.equal(secondManager.status, 201)
  assert.equal((await request(`/users/${secondManager.body.id}`, { token: adminA, method: 'PUT', body: { status: 'Active' } })).status, 409)

  const firstAccountant = await request('/users', { token: adminA, method: 'POST', body: { fullName: 'First Accountant', role: 'accountant' } })
  assert.equal(firstAccountant.status, 201)
  const secondAccountant = await request('/users', { token: adminA, method: 'POST', body: { fullName: 'Second Accountant', role: 'accountant', status: 'Inactive' } })
  assert.equal(secondAccountant.status, 201)
  assert.equal((await request(`/users/${secondAccountant.body.id}`, { token: adminA, method: 'PUT', body: { status: 'Active' } })).status, 409)

  await db.update(subscriptions).set({ planCode: 'enterprise' }).where(eq(subscriptions.id, 'subscription-a'))
  assert.equal((await request(`/users/${secondManager.body.id}`, { token: adminA, method: 'PUT', body: { status: 'Active' } })).status, 200)
  assert.equal((await request(`/users/${secondAccountant.body.id}`, { token: adminA, method: 'PUT', body: { status: 'Active' } })).status, 200)

  const managerToken = tokenFor(dormantManager.body.id)
  await db.update(users).set({firstLogin:false}).where(eq(users.id,dormantManager.body.id))
  const managerCannotBypass = await request('/users', { token: managerToken, method: 'POST', body: { fullName: 'Third Accountant', role: 'accountant' } })
  assert.equal(managerCannotBypass.status, 409)

  const thirdManager = await request('/users', { token: adminA, method: 'POST', body: { fullName: 'Third Manager', role: 'manager', status: 'Inactive', email: 'third-manager@quota.test' } })
  assert.equal(thirdManager.status, 201)
  const workspace = await request('/workspace/superadmin', { token: superToken })
  assert.equal(workspace.status, 200)
  const legacyBypass = await request('/workspace/superadmin', { token: superToken, method: 'PUT', body: {
    revision: workspace.body.revision,
    changes: { 'abc-super-users': [{ id: thirdManager.body.id, name: 'Third Manager', email: 'third-manager@quota.test', role: 'Manager', status: 'Active', school: 'school-a' }] },
  } })
  assert.equal(legacyBypass.status, 409)
  assert.match(legacyBypass.body.error, /allows 2 active managers/i)

  await db.update(subscriptions).set({ currentPeriodEnd: new Date('2020-03-01T00:00:00Z') }).where(eq(subscriptions.id, 'subscription-a'))
  assert.equal((await request(`/users/${thirdManager.body.id}`, { token: adminA, method: 'PUT', body: { status: 'Active' } })).status, 403)
})

test('school onboarding requires paid access and links the new school to the subscription', async () => {
  await db.insert(users).values([
    { id: 'unpaid-owner', email: 'unpaid@quota.test', fullName: 'Unpaid Owner', role: 'admin', isVerified: true, firstLogin: false },
    { id: 'paid-owner', email: 'paid@quota.test', fullName: 'Paid Owner', role: 'admin', isVerified: true, firstLogin: false },
  ])
  const denied = await request('/auth/onboard', {
    token: tokenFor('unpaid-owner'), method: 'POST', body: { schoolName: 'Unpaid School' },
  })
  assert.equal(denied.status, 402)
  assert.match(denied.body.error, /active monthly subscription/i)

  await db.insert(paymentOrders).values({
    id: 'paid-owner-order', ownerUserId: 'paid-owner', planCode: 'enterprise', amount: '10.00', status: 'paid', paidAt: new Date(),
  })
  await db.insert(subscriptions).values({
    id: 'paid-owner-subscription', ownerUserId: 'paid-owner', planCode: 'enterprise', status: 'active',
    currentPeriodStart: new Date('2026-10-01T00:00:00Z'), currentPeriodEnd: new Date('2099-11-01T00:00:00Z'), paymentOrderId: 'paid-owner-order',
  })
  const onboarded = await request('/auth/onboard', {
    token: tokenFor('paid-owner'), method: 'POST', body: { schoolName: 'Paid School', schoolLocation: 'Mogadishu' },
  })
  assert.equal(onboarded.status, 200)
  assert.ok(onboarded.body.user.schoolId)
  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.ownerUserId, 'paid-owner'))
  assert.equal(subscription.schoolId, onboarded.body.user.schoolId)
})

test('checkout prices plans on the server and the verified return activates exactly one month', async () => {
  await db.insert(users).values({ id: 'checkout-owner', email: 'checkout@quota.test', fullName: 'Checkout Owner', role: 'admin', isVerified: true, firstLogin: false })
  const checkout = await request('/billing/checkout', {
    token: tokenFor('checkout-owner'), method: 'POST', body: { planCode: 'standard' },
  })
  assert.equal(checkout.status, 201)
  assert.equal(checkout.body.plan.amount, '1.00')
  const hostedUrl = new URL(checkout.body.checkoutUrl)
  assert.equal(hostedUrl.origin, 'https://pay.sifalo.net')
  const [order] = await db.select().from(paymentOrders).where(eq(paymentOrders.id, checkout.body.orderId))
  assert.equal(order.amount, '1.00')
  assert.equal(order.status, 'pending')

  const returned = await request(`/billing/return?order_id=${checkout.body.orderId}&sid=SID-CHECKOUT`)
  assert.equal(returned.status, 303)
  const redirect = new URL(returned.location)
  assert.equal(redirect.pathname, '/payment/result')
  assert.equal(redirect.searchParams.get('status'), 'paid')
  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.ownerUserId, 'checkout-owner'))
  assert.equal(subscription.planCode, 'standard')
  assert.equal(subscription.status, 'active')
  const durationDays = (subscription.currentPeriodEnd - subscription.currentPeriodStart) / 86_400_000
  assert.ok(durationDays >= 28 && durationDays <= 31)

  // A duplicate browser return is idempotent and cannot extend the period twice.
  const firstEnd = subscription.currentPeriodEnd.getTime()
  assert.equal((await request(`/billing/return?order_id=${checkout.body.orderId}&sid=SID-CHECKOUT`)).status, 303)
  const [sameSubscription] = await db.select().from(subscriptions).where(eq(subscriptions.ownerUserId, 'checkout-owner'))
  assert.equal(sameSubscription.currentPeriodEnd.getTime(), firstEnd)
})
