import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, CreditCard, LoaderCircle, RefreshCw, WalletCards, XCircle } from 'lucide-react'
import Logo from '../components/ui/Logo'
import { useAuth } from '../app/context/AuthContext'
import { createCheckout, getPayment, getRememberedPlanChoice, paymentFrom } from '../features/billing/api/billingApi'
import '../styles/billing.css'

type PaymentStatus = 'verifying' | 'pending' | 'paid' | 'failed' | 'insufficient' | 'expired'
type Payment = Record<string, any>

const COPY: Record<PaymentStatus, { icon: typeof LoaderCircle; title: string; body: string; tone: string }> = {
  verifying: { icon: LoaderCircle, title: 'Verifying your payment', body: 'We are securely confirming the payment with Sifalo.', tone: 'info' },
  pending: { icon: Clock3, title: 'Payment is still pending', body: 'Sifalo has not completed the payment yet. You can check again in a moment.', tone: 'warning' },
  paid: { icon: CheckCircle2, title: 'Payment confirmed', body: 'Your monthly subscription is active. You can now set up your school.', tone: 'success' },
  failed: { icon: XCircle, title: 'Payment was not completed', body: 'No active subscription was created. You can safely try the checkout again.', tone: 'danger' },
  insufficient: { icon: WalletCards, title: 'Insufficient balance', body: 'Add funds to your wallet or use another payment method, then try again.', tone: 'warning' },
  expired: { icon: AlertCircle, title: 'Checkout expired', body: 'This checkout session is no longer available. Start a new secure checkout.', tone: 'danger' },
}

function resultStatus(payment: Payment): PaymentStatus {
  const code = Number(payment?.providerCode ?? payment?.code)
  const status = String(payment?.status || payment?.providerStatus || '').toLowerCase()
  if (code === 601 || ['paid', 'success', 'successful', 'active'].includes(status)) return 'paid'
  if (code === 604 || status === 'insufficient_balance' || status === 'insufficient') return 'insufficient'
  if (['expired', 'cancelled', 'canceled'].includes(status)) return status.startsWith('cancel') ? 'failed' : 'expired'
  if (code === 600 || ['failed', 'failure', 'declined'].includes(status)) return 'failed'
  return 'pending'
}

export default function PaymentResultPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order_id') || searchParams.get('orderId')
  const sid = searchParams.get('sid') || ''
  const [status, setStatus] = useState<PaymentStatus>('verifying')
  const [payment, setPayment] = useState<Payment | null>(null)
  const [error, setError] = useState('')
  const [retrying, setRetrying] = useState(false)
  const copy = COPY[status]
  const StatusIcon = copy.icon

  const check = useCallback(async () => {
    if (!orderId) {
      setStatus('failed')
      setError('The payment reference is missing. Return to plans to start a new checkout.')
      return
    }
    setError('')
    setStatus(current => current === 'pending' ? 'pending' : 'verifying')
    try {
      const result = paymentFrom(await getPayment(orderId, sid))
      setPayment(result)
      setStatus(resultStatus(result))
    } catch (reason) {
      setStatus('pending')
      setError(reason instanceof Error ? reason.message : 'Payment status could not be checked.')
    }
  }, [orderId, sid])

  useEffect(() => { check() }, [check])
  useEffect(() => {
    if (status !== 'pending') return undefined
    const timer = window.setTimeout(check, 8000)
    return () => window.clearTimeout(timer)
  }, [check, status, payment])

  const planCode = useMemo(() => payment?.planCode || payment?.plan_code || getRememberedPlanChoice(), [payment])
  const retry = async () => {
    if (!planCode) { navigate('/plans'); return }
    setRetrying(true); setError('')
    try {
      const result = await createCheckout(planCode)
      const checkoutUrl = result?.checkoutUrl || result?.checkout_url || result?.url || result?.data?.checkoutUrl
      if (!checkoutUrl) throw new Error('Sifalo checkout URL was not returned.')
      window.location.assign(checkoutUrl)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Checkout could not be opened.'); setRetrying(false) }
  }

  if (user?.role !== 'admin') return null

  return <main className="billing-page result-page">
    <header className="billing-header"><Logo/><Link to="/plans">Plans</Link></header>
    <section className={`payment-result ${copy.tone}`} aria-live="polite">
      <div className="payment-status-icon"><StatusIcon className={status === 'verifying' ? 'spin' : ''}/></div>
      <span className="billing-kicker"><CreditCard size={14}/> Sifalo payment</span>
      <h1>{copy.title}</h1>
      <p>{copy.body}</p>
      {payment && <dl className="payment-summary">
        <div><dt>Plan</dt><dd>{payment.planName || payment.planCode || 'Monthly subscription'}</dd></div>
        <div><dt>Amount</dt><dd>{payment.currency || 'USD'} {payment.amount || '—'}</dd></div>
        <div><dt>Reference</dt><dd>{orderId}</dd></div>
        <div><dt>Status</dt><dd className={`result-${status}`}>{status}</dd></div>
      </dl>}
      {error && <div className="billing-error compact" role="alert">{error}</div>}
      <div className="payment-actions">
        {status === 'paid' ? <Link className="billing-primary" to={user.schoolId ? '/dashboard/admin' : '/onboard'}>Continue to {user.schoolId ? 'dashboard' : 'school setup'}<ArrowRight size={17}/></Link> : <>
          <button type="button" className="billing-primary" disabled={status === 'verifying'} onClick={check}><RefreshCw size={16}/>{status === 'verifying' ? 'Verifying…' : 'Check payment status'}</button>
          {['failed', 'insufficient', 'expired'].includes(status) && <button type="button" className="billing-secondary" disabled={retrying} onClick={retry}>{retrying ? 'Opening Sifalo…' : 'Try payment again'}</button>}
        </>}
      </div>
      {status === 'pending' && <small className="payment-poll-note">We will automatically check again in a few seconds.</small>}
    </section>
  </main>
}
