import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Image, Mail, MapPin, Phone } from 'lucide-react'
import { useAuth } from '../app/context/AuthContext'
import Logo from '../components/ui/Logo'
import { api } from '../services/api'
import type { FormEvent } from 'react'

export default function OnboardingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPending(true)
    setError('')
    const values = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    
    try {
      await api('/auth/onboard',{method:'POST',body:{
          schoolName: values.schoolName,
          schoolLogo: values.schoolLogo || undefined,
          schoolLocation: values.schoolLocation || undefined,
          schoolPhone: values.schoolPhone || undefined,
          schoolEmail: values.schoolEmail || undefined,
          schoolInfo: values.schoolInfo || undefined
        }})
      window.location.assign('/dashboard/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'School setup could not be saved.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="auth-page">
      <main className="auth-card-wrap" style={{ margin: 'auto' }}>
        <section className="auth-card">
          <Logo />
          <h2 id="auth-title">School Onboarding</h2>
          <p>Welcome, {user?.fullName}! Let's set up your school profile.</p>

          <form onSubmit={submit} noValidate>
            <label>
              <span>School Name</span>
              <div className="input">
                <Building2 aria-hidden="true"/>
                <input name="schoolName" required placeholder="ABC Kindergarten" />
              </div>
            </label>
            <label>
              <span>Location</span>
              <div className="input">
                <MapPin aria-hidden="true"/>
                <input name="schoolLocation" placeholder="Street, city, country" autoComplete="street-address" />
              </div>
            </label>
            <div className="onboarding-pair">
              <label>
                <span>School Email</span>
                <div className="input">
                  <Mail aria-hidden="true"/>
                  <input name="schoolEmail" type="email" placeholder="hello@yourschool.edu" autoComplete="email" />
                </div>
              </label>
              <label>
                <span>Phone Number</span>
                <div className="input">
                  <Phone aria-hidden="true"/>
                  <input name="schoolPhone" type="tel" placeholder="+252 …" autoComplete="tel" />
                </div>
              </label>
            </div>
            <label>
              <span>School Logo URL (Optional)</span>
              <div className="input">
                <Image aria-hidden="true"/>
                <input name="schoolLogo" type="url" placeholder="https://example.com/logo.png" />
              </div>
            </label>
            <label>
              <span>School Information (Optional)</span>
              <div className="input">
                <textarea name="schoolInfo" placeholder="A brief description of your school..." style={{ width: '100%', minHeight: '80px', padding: '0.5rem', border: 'none', background: 'transparent', outline: 'none', resize: 'vertical' }} />
              </div>
            </label>
            {error && <p role="alert" className="auth-error">{error}</p>}
            <button type="submit" disabled={pending} className="primary-btn auth-submit" aria-busy={pending}>
              {pending ? 'Saving...' : 'Complete Setup'} <ArrowLeft className="rotate-180" size={17}/>
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
