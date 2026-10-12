const ENVIRONMENTS = {
  staging: {
    gatewayUrl: 'https://spay-api.sifalo.net/gateway/',
    checkoutUrl: 'https://pay.sifalo.net/checkout/',
  },
  live: {
    gatewayUrl: 'https://api.sifalopay.com/gateway/',
    checkoutUrl: 'https://pay.sifalo.com/checkout/',
  },
}

export const SIFALO_TIMEOUT_MS = 120_000

export class SifaloError extends Error {
  constructor(message, { cause, status = 502 } = {}) {
    super(message, { cause })
    this.name = 'SifaloError'
    this.status = status
  }
}

async function readJson(response) {
  try { return await response.json() }
  catch (cause) { throw new SifaloError('Sifalo returned an invalid response.', { cause }) }
}

export function createSifaloService(env, fetchImpl = globalThis.fetch) {
  const hosts = ENVIRONMENTS[env.SIFALO_ENV || 'staging']
  if (!hosts) throw new SifaloError('Sifalo environment is not configured.', { status: 503 })
  if (typeof fetchImpl !== 'function') throw new SifaloError('The server cannot connect to Sifalo.', { status: 503 })

  const post = async (url, body, { basicAuth = false } = {}) => {
    const headers = { 'content-type': 'application/json', accept: 'application/json' }
    if (basicAuth) {
      if (!env.SIFALO_API_USER || !env.SIFALO_API_KEY) throw new SifaloError('Sifalo credentials are not configured.', { status: 503 })
      headers.authorization = `Basic ${Buffer.from(`${env.SIFALO_API_USER}:${env.SIFALO_API_KEY}`).toString('base64')}`
    }
    let response
    try {
      response = await fetchImpl(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(SIFALO_TIMEOUT_MS),
      })
    } catch (cause) {
      throw new SifaloError('Sifalo is temporarily unavailable. Please try again.', { cause })
    }
    const data = await readJson(response)
    if (!response.ok) throw new SifaloError('Sifalo rejected the payment request.')
    return data
  }

  return {
    async createCheckout({ amount, currency = 'USD', returnUrl, webhookUrl }) {
      const data = await post(hosts.gatewayUrl, {
        amount: String(amount),
        gateway: 'checkout',
        currency,
        return_url: returnUrl,
        webhook_url: webhookUrl,
      }, { basicAuth: true })
      if (Number(data?.code) === 0) {
        throw new SifaloError('Sifalo rejected the API credentials. Confirm that SIFALO_ENV matches the portal where the key was created.')
      }
      if (typeof data?.key !== 'string' || !data.key || typeof data?.token !== 'string' || !data.token) {
        const providerMessage = typeof data?.response === 'string' && data.response.trim() ? ` ${data.response.trim()}` : ''
        throw new SifaloError(`Sifalo did not create a checkout session.${providerMessage}`)
      }
      const checkout = new URL(hosts.checkoutUrl)
      checkout.searchParams.set('key', data.key)
      checkout.searchParams.set('token', data.token)
      return { checkoutUrl: checkout.toString(), providerOrderId: data.order_id == null ? null : String(data.order_id) }
    },

    verify(sid) {
      if (typeof sid !== 'string' || !sid.trim()) throw new SifaloError('A Sifalo session ID is required.', { status: 400 })
      return post(new URL('verify.php', hosts.gatewayUrl).toString(), { sid: sid.trim() })
    },
  }
}

export function isSuccessfulSifaloVerification(result) {
  return result?.status === 'success' && Number(result?.code) === 601
}
