import { api } from '../../../services/api'

export const PLAN_CHOICE_KEY = 'abc-selected-plan'
export const FALLBACK_PLANS = [
  { code: 'standard', name: 'Standard', amount: 1, currency: 'USD', interval: 'month', managers: 1, accountants: 1, schools: 1 },
  { code: 'enterprise', name: 'Enterprise', amount: 10, currency: 'USD', interval: 'month', managers: 2, accountants: 2, schools: 1 },
]

export const listPlans = () => api('/billing/plans')
export const getSubscription = () => api('/billing/subscription')
export const createCheckout = planCode => api('/billing/checkout', { method: 'POST', body: { planCode } })
export const getPayment = (orderId, sid = '') => api(`/billing/payment/${encodeURIComponent(orderId)}${sid ? `?sid=${encodeURIComponent(sid)}` : ''}`)

export function rememberPlanChoice(planCode) {
  if (FALLBACK_PLANS.some(plan => plan.code === planCode)) sessionStorage.setItem(PLAN_CHOICE_KEY, planCode)
}

export function getRememberedPlanChoice() {
  const planCode = sessionStorage.getItem(PLAN_CHOICE_KEY)
  return FALLBACK_PLANS.some(plan => plan.code === planCode) ? planCode : ''
}

export const clearRememberedPlanChoice = () => sessionStorage.removeItem(PLAN_CHOICE_KEY)

export function subscriptionFrom(payload) {
  return payload?.subscription ?? payload?.data?.subscription ?? payload?.data ?? payload ?? null
}

export function hasActiveSubscription(payload) {
  const subscription = subscriptionFrom(payload)
  return String(subscription?.status || '').toLowerCase() === 'active'
}

export function plansFrom(payload) {
  const plans = Array.isArray(payload) ? payload : payload?.plans
  if (!Array.isArray(plans) || !plans.length) return FALLBACK_PLANS
  return plans.map(plan => ({
    ...plan,
    code: String(plan.code || plan.planCode || plan.name || '').toLowerCase(),
    name: plan.name || plan.label || plan.code,
    amount: Number(plan.amount ?? plan.price),
    currency: plan.currency || 'USD',
    interval: plan.interval || 'month',
    managers: Number(plan.managers ?? plan.managerLimit ?? plan.limits?.managers ?? 1),
    accountants: Number(plan.accountants ?? plan.accountantLimit ?? plan.limits?.accountants ?? 1),
    schools: Number(plan.schools ?? plan.schoolLimit ?? plan.limits?.schools ?? 1),
  }))
}

export function paymentFrom(payload) {
  return payload?.payment ?? payload?.order ?? payload?.data ?? payload ?? null
}
