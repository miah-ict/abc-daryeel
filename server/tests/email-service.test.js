import test from 'node:test'
import assert from 'node:assert/strict'
import { createEmailService } from '../services/email.js'

test('Brevo HTTP transport sends verification mail without SMTP', async () => {
  const originalFetch = globalThis.fetch
  let request
  globalThis.fetch = async (url, options) => {
    request = { url, options }
    return new Response(JSON.stringify({ messageId: 'test-message' }), { status: 201 })
  }
  try {
    const service = createEmailService({
      NODE_ENV: 'production',
      BREVO_API_KEY: 'test-api-key',
      BREVO_SENDER_EMAIL: 'sender@example.com',
      BREVO_SENDER_NAME: 'ABC Daycare',
    })
    assert.equal(service.provider, 'brevo-api')
    await service.sendVerificationCode({ email: 'parent@example.com', code: '123456' })
    assert.equal(request.url, 'https://api.brevo.com/v3/smtp/email')
    assert.equal(request.options.headers['api-key'], 'test-api-key')
    const payload = JSON.parse(request.options.body)
    assert.deepEqual(payload.sender, { email: 'sender@example.com', name: 'ABC Daycare' })
    assert.deepEqual(payload.to, [{ email: 'parent@example.com' }])
    assert.match(payload.textContent, /123456/)
  } finally {
    globalThis.fetch = originalFetch
  }
})
