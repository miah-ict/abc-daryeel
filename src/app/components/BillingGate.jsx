import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSubscription, hasActiveSubscription } from '../../features/billing/api/billingApi'

export default function BillingGate({ view, children }) {
  const { user } = useAuth()
  const [state, setState] = useState({ loading: true, subscription: null, error: '' })

  const load = useCallback(async () => {
    setState(current => ({ ...current, loading: true, error: '' }))
    try {
      const subscription = await getSubscription()
      setState({ loading: false, subscription, error: '' })
    } catch (error) {
      if (error.status === 404) setState({ loading: false, subscription: null, error: '' })
      else setState({ loading: false, subscription: null, error: error.message })
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (user?.role !== 'admin') return children
  if (state.loading) return <div className="api-state billing-api-state" role="status"><span className="billing-spinner"/>Checking your subscription…</div>
  if (state.error) return <div className="api-state billing-api-state" role="alert"><div><strong>We could not check your subscription.</strong><p>{state.error}</p><button type="button" onClick={load}>Try again</button></div></div>

  const active = hasActiveSubscription(state.subscription)
  if (view === 'dashboard' && !active) return <Navigate to="/plans" replace />
  if (view === 'dashboard' && !user.schoolId) return <Navigate to="/onboard" replace />
  if (view === 'onboard' && !active) return <Navigate to="/plans" replace />
  if (view === 'onboard' && user.schoolId) return <Navigate to="/dashboard/admin" replace />
  return children
}
