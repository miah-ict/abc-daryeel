import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSifaloService, isSuccessfulSifaloVerification } from '../services/sifalo.js'

const env = { SIFALO_ENV: 'staging', SIFALO_API_USER: 'merchant-user', SIFALO_API_KEY: 'secret-key' }

test('Sifalo hosted checkout uses staging, server-only Basic auth, and provider checkout tokens', async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    return new Response(JSON.stringify({ key: 'checkout-key', token: 'checkout-token' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }
  const service = createSifaloService(env, fetchImpl)
  const result = await service.createCheckout({
    amount: '1',
    currency: 'USD',
    returnUrl: 'https://school.test/api/billing/return?order_id=order-1',
    webhookUrl: 'https://school.test/api/billing/webhooks/sifalo?order_id=order-1',
  })

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://spay-api.sifalo.net/gateway/')
  assert.equal(calls[0].options.headers.authorization, `Basic ${Buffer.from('merchant-user:secret-key').toString('base64')}`)
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    amount: '1', gateway: 'checkout', currency: 'USD',
    return_url: 'https://school.test/api/billing/return?order_id=order-1',
    webhook_url: 'https://school.test/api/billing/webhooks/sifalo?order_id=order-1',
  })
  const checkout = new URL(result.checkoutUrl)
  assert.equal(`${checkout.origin}${checkout.pathname}`, 'https://pay.sifalo.net/checkout/')
  assert.equal(checkout.searchParams.get('key'), 'checkout-key')
  assert.equal(checkout.searchParams.get('token'), 'checkout-token')
})

test('Sifalo verification sends no merchant credentials and only 601 success activates payment', async () => {
  let captured
  const service = createSifaloService(env, async (url, options) => {
    captured = { url, options }
    return new Response(JSON.stringify({ sid: 'SID-601', status: 'success', code: 601, amount: '1', currency: 'USD' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })
  const result = await service.verify('SID-601')
  assert.equal(captured.url, 'https://spay-api.sifalo.net/gateway/verify.php')
  assert.equal(captured.options.headers.authorization, undefined)
  assert.deepEqual(JSON.parse(captured.options.body), { sid: 'SID-601' })
  assert.equal(isSuccessfulSifaloVerification(result), true)
  assert.equal(isSuccessfulSifaloVerification({ status: 'success', code: 603 }), false)
  assert.equal(isSuccessfulSifaloVerification({ status: 'failed', code: 601 }), false)
})

test('Sifalo checkout refuses to run without server credentials', async () => {
  const service = createSifaloService({ SIFALO_ENV: 'staging' }, async () => { throw new Error('must not call fetch') })
  await assert.rejects(
    service.createCheckout({ amount: '1', returnUrl: 'https://school.test/return', webhookUrl: 'https://school.test/webhook' }),
    error => error.name === 'SifaloError' && error.status === 503,
  )
})

test('Sifalo code zero reports an environment or credential mismatch', async () => {
  const service = createSifaloService(env, async () => new Response(JSON.stringify({ code: 0, response: null }), { status: 200 }))
  await assert.rejects(
    service.createCheckout({ amount: '1', returnUrl: 'https://school.test/return' }),
    error => error.name === 'SifaloError' && /SIFALO_ENV/.test(error.message),
  )
})
