import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, LockKeyhole, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../app/context/AuthContext'
import Logo from '../components/ui/Logo'
import { api } from '../services/api'
import type { FormEvent } from 'react'

export default function ChangePasswordPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPending(true)
    setError('')
    const values = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    
    if (values.newPassword !== values.confirmPassword) {
      setError('Passwords do not match')
      setPending(false)
      return
    }

    try {
      await api('/auth/change-password',{method:'POST',body:{newPassword:values.newPassword}})
      
      // Update session by re-authenticating or redirecting
      window.location.href = `/dashboard/${user?.role || 'admin'}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password could not be updated.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="auth-page">
      <main className="auth-card-wrap" style={{ margin: 'auto' }}>
        <section className="auth-card">
          <Logo />
          <h2 id="auth-title">Update Your Password</h2>
          <p>Welcome, {user?.fullName}. You must change your default password before continuing.</p>

          <form onSubmit={submit} noValidate>
            <label>
              <span>New Password</span>
              <div className="input">
                <LockKeyhole aria-hidden="true"/>
                <input name="newPassword" type={showPassword ? 'text' : 'password'} minLength={12} required placeholder="At least 12 characters"/>
                <button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? <EyeOff/> : <Eye/>}
                </button>
              </div>
            </label>
            <label>
              <span>Confirm Password</span>
              <div className="input">
                <LockKeyhole aria-hidden="true"/>
                <input name="confirmPassword" type={showPassword ? 'text' : 'password'} minLength={12} required placeholder="Confirm new password"/>
              </div>
            </label>
            {error && <p role="alert" className="auth-error">{error}</p>}
            <button type="submit" disabled={pending} className="primary-btn auth-submit" aria-busy={pending}>
              {pending ? 'Updating...' : 'Update Password'} <ArrowLeft className="rotate-180" size={17}/>
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
