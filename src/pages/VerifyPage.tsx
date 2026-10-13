import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react'
import Logo from '../components/ui/Logo'
import type { FormEvent } from 'react'

export default function VerifyPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)
  const [resending, setResending] = useState(false)
  const [notice, setNotice] = useState('')
  
  const { state } = useLocation()
  const navigate = useNavigate()
  const email = state?.email || new URLSearchParams(window.location.search).get('email') || ''

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      const res = await fetch(`/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      })
      if (!res.ok) {
        let err = 'Failed to verify code'
        try { err = (await res.json()).error } catch(e) {}
        throw new Error(err)
      }
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email verification failed.')
    } finally {
      setPending(false)
    }
  }

  const resend = async () => {
    setError(''); setNotice(''); setResending(true)
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'We could not resend the code.')
      setNotice(body.message)
    } catch (err) { setError(err instanceof Error ? err.message : 'Verification code could not be resent.') }
    finally { setResending(false) }
  }

  return (
    <div className="auth-page">
      <main className="auth-card-wrap" style={{ margin: 'auto' }}>
        <section className="auth-card">
          <Logo />
          <h2 id="auth-title">Verify your email</h2>
          <p>We sent a 6-digit verification code to <strong>{email}</strong>.</p>
          
          {success ? (
            <div style={{ textAlign: 'center', color: 'var(--success)', padding: '2rem' }}>
              <CheckCircle2 size={48} style={{ margin: 'auto' }}/>
              <p>Verified successfully! Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <label>
                <span>Verification Code</span>
                <div className="input">
                  <ShieldCheck aria-hidden="true"/>
                  <input type="text" value={code} onChange={e => setCode(e.target.value)} required placeholder="123456" maxLength={6} minLength={6} />
                </div>
              </label>
              {error && <p role="alert" className="auth-error">{error}</p>}
              {notice && <p role="status" className="auth-note">{notice}</p>}
              <button type="submit" disabled={pending || code.length !== 6} className="primary-btn auth-submit" aria-busy={pending}>
                {pending ? 'Verifying...' : 'Verify'} <ArrowLeft className="rotate-180" size={17}/>
              </button>
              <button type="button" className="auth-link-button" disabled={!email || resending} onClick={resend}>{resending ? 'Sending a new code…' : 'Resend verification code'}</button>
            </form>
          )}
          <div className="auth-switch">
            Wrong email? <Link to="/register">Register again</Link>
          </div>
        </section>
      </main>
    </div>
  )
}
