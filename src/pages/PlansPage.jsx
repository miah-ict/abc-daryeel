import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Building2, Calculator, Check, CreditCard, LockKeyhole, ShieldCheck, UserCog } from 'lucide-react'
import Logo from '../components/ui/Logo'
import { useAuth } from '../app/context/AuthContext'
import {
  FALLBACK_PLANS, clearRememberedPlanChoice, createCheckout, getRememberedPlanChoice,
  getSubscription, hasActiveSubscription, listPlans, plansFrom, rememberPlanChoice,
} from '../features/billing/api/billingApi'
import '../styles/billing.css'

export default function PlansPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedPlan = searchParams.get('plan') || getRememberedPlanChoice()
  const [plans, setPlans] = useState(FALLBACK_PLANS)
  const [selected, setSelected] = useState(FALLBACK_PLANS.some(plan => plan.code === requestedPlan) ? requestedPlan : 'standard')
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate(`/dashboard/${user?.role || ''}`, { replace: true })
      return
    }
    let live = true
    Promise.allSettled([getSubscription(), listPlans()]).then(([subscriptionResult, plansResult]) => {
      if (!live) return
      if (subscriptionResult.status === 'fulfilled' && hasActiveSubscription(subscriptionResult.value)) {
        clearRememberedPlanChoice()
        navigate(user.schoolId ? '/dashboard/admin' : '/onboard', { replace: true })
        return
      }
      if (plansResult.status === 'fulfilled') setPlans(plansFrom(plansResult.value))
      setLoading(false)
    })
    return () => { live = false }
  }, [navigate, user])

  const choose = planCode => {
    setSelected(planCode)
    rememberPlanChoice(planCode)
    setSearchParams({ plan: planCode }, { replace: true })
  }

  const checkout = async planCode => {
    setError('')
    setPending(planCode)
    rememberPlanChoice(planCode)
    try {
      const result = await createCheckout(planCode)
      const checkoutUrl = result?.checkoutUrl || result?.checkout_url || result?.url || result?.data?.checkoutUrl
      if (!checkoutUrl) throw new Error('Sifalo checkout URL was not returned. Please try again.')
      window.location.assign(checkoutUrl)
    } catch (reason) {
      setError(reason.message)
      setPending('')
    }
  }

  if (loading) return <div className="api-state billing-api-state" role="status"><span className="billing-spinner"/>Loading your plans…</div>

  return <main className="billing-page">
    <header className="billing-header"><Logo/><div><span>Signed in as {user?.fullName || user?.email}</span><button type="button" onClick={logout}>Sign out</button></div></header>
    <section className="billing-intro">
      <span className="billing-kicker"><CreditCard size={14}/> Monthly subscription</span>
      <h1>Choose the right plan for your school</h1>
      <p>Pay securely on Sifalo, then continue directly to your school setup. You can renew manually each month.</p>
      <div className="billing-trust"><span><ShieldCheck/>Secure Sifalo checkout</span><span><LockKeyhole/>We never see your card or wallet details</span></div>
    </section>

    <section className="billing-plan-grid" aria-label="Monthly plans">
      {plans.map(plan => {
        const isSelected = selected === plan.code
        const featured = plan.code === 'enterprise'
        return <article className={`billing-plan ${featured ? 'featured' : ''} ${isSelected ? 'selected' : ''}`} key={plan.code} onClick={() => choose(plan.code)}>
          {featured && <span className="billing-popular">Best for growing teams</span>}
          <label className="billing-radio"><input type="radio" name="plan" checked={isSelected} onChange={() => choose(plan.code)}/><span>{isSelected && <Check size={13}/>}</span><b>{plan.name}</b></label>
          <p>{featured ? 'More staff access for a growing management team.' : 'Everything a small school needs to get started.'}</p>
          <div className="billing-price"><sup>{plan.currency === 'USD' ? '$' : plan.currency}</sup><strong>{plan.amount}</strong><span>/ month</span></div>
          <ul>
            <li><Building2/><span><b>{plan.schools}</b> school</span><Check/></li>
            <li><UserCog/><span><b>{plan.managers}</b> manager{plan.managers === 1 ? '' : 's'}</span><Check/></li>
            <li><Calculator/><span><b>{plan.accountants}</b> accountant{plan.accountants === 1 ? '' : 's'}</span><Check/></li>
          </ul>
          <button type="button" className={featured ? 'billing-primary' : 'billing-secondary'} disabled={Boolean(pending)} onClick={event => { event.stopPropagation(); checkout(plan.code) }}>
            {pending === plan.code ? <><span className="billing-spinner small"/>Opening Sifalo…</> : <>Continue with {plan.name}<ArrowRight size={17}/></>}
          </button>
        </article>
      })}
    </section>
    {error && <div className="billing-error" role="alert"><strong>Checkout could not be opened.</strong><span>{error}</span></div>}
    <p className="billing-footnote"><ShieldCheck size={14}/> Payments are processed on Sifalo’s secure hosted checkout. Automatic charging is not enabled.</p>
  </main>
}
