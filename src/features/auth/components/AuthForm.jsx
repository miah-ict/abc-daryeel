import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import Icon from '../../../components/ui/Icon'
import '../../../styles/login-reference.css'
import '../../../styles/login-schools.css'
import { useAuth } from '../../../app/context/AuthContext'
import { listSchools } from '../api/authApi'
import { rememberPlanChoice } from '../../billing/api/billingApi'

export default function AuthForm({ mode='login' }) {
  const navigate=useNavigate()
  const [searchParams]=useSearchParams()
  const register=mode==='register'
  const { signIn }=useAuth()
  const [showPassword,setShowPassword]=useState(false)
  const [error,setError]=useState('')
  const [pending,setPending]=useState(false)
  const [identifierType, setIdentifierType] = useState('email')
  const [schools,setSchools]=useState([])
  const [schoolSearch,setSchoolSearch]=useState('')
  const [selectedSchool,setSelectedSchool]=useState(null)
  const [schoolOpen,setSchoolOpen]=useState(false)
  const [schoolsLoading,setSchoolsLoading]=useState(false)
  const [schoolsError,setSchoolsError]=useState('')
  const [dark,setDark]=useState(false)
  const [role,setRole]=useState('Parent / Guardian')
  const [help,setHelp]=useState('')

  useEffect(()=>{
    const plan=searchParams.get('plan')
    if(register&&plan)rememberPlanChoice(plan)
  },[register,searchParams])

  useEffect(()=>{
    if(register||identifierType!=='id'||schools.length)return
    let active=true
    setSchoolsLoading(true);setSchoolsError('')
    listSchools().then(data=>{if(active)setSchools(Array.isArray(data)?data:[])}).catch(reason=>{if(active)setSchoolsError(reason.message)}).finally(()=>{if(active)setSchoolsLoading(false)})
    return()=>{active=false}
  },[register,identifierType])

  const matchingSchools=schools.filter(s=>s.name.toLowerCase().includes(schoolSearch.toLowerCase()))

  const submit=async event=>{
    event.preventDefault()
    setError('')
    setPending(true)
    const values=Object.fromEntries(new FormData(event.currentTarget))
    try {
      if (register) {
        // Assume API call returns success for registration
        const res = await fetch(`/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: values.email, password: values.password, fullName: values.fullName })
        })
        let errorMsg = 'Failed to register'
        if (!res.ok) {
          try { errorMsg = (await res.json()).error } catch(e) {}
          throw new Error(errorMsg)
        }
        navigate(`/verify?email=${encodeURIComponent(values.email)}`, { state: { email: values.email } })
      } else {
        const identifier = values.identifier.trim()
        if(!identifier.includes('@')&&!selectedSchool)throw new Error('Please select your school from the list.')
        const user=await signIn(mode,{
          identifier,
          schoolId: identifier.includes('@') ? undefined : selectedSchool.id,
          password:values.password
        },{remember:values.remember==='on'})
        
        if (user.firstLogin) {
          navigate('/change-password', { replace: true })
        } else if (user.role === 'admin' && !user.schoolId) {
          navigate('/plans', { replace: true })
        } else {
          navigate(`/dashboard/${user.role}`,{replace:true})
        }
      }
    } catch (reason) {
      setError(reason.message)
    } finally {
      setPending(false)
    }
  }

  return <div className={`login-reference ${dark?'lr-dark':''}`}>
    <div className="lr-controls"><button type="button" aria-label={dark?'Switch to light theme':'Switch to dark theme'} onClick={()=>setDark(!dark)}><Icon name="Sun" size={17}/><span className="lr-switch"><i/></span><Icon name="Moon" size={14}/></button><span className="lr-language"><Icon name="Globe" size={15}/>English<Icon name="ChevronDown" size={11}/></span></div>
    <section className="lr-welcome" aria-label="Welcome to ABC Daycare">
      <Link to="/" className="lr-brand" aria-label="ABC Daycare & Kindergarten home"/>
      <span className="lr-sun" aria-hidden="true">☀</span><span className="lr-heart" aria-hidden="true">♥</span>
      <div className="lr-copy"><h1>Welcome Back!<br/><span>Better Learning<br/>for a Brighter Future.</span></h1><p>Join our safe, nurturing and inspiring environment<br/>where every child discovers their potential.</p></div>
      <div className="lr-benefits">{[['Quality','Education'],['Safe','Environment'],['Caring','Teachers'],['Holistic','Development']].map(([a,b],i)=><div key={a}><span className={`lr-benefit-icon lr-benefit-${i}`}/><span>{a}<br/>{b}</span></div>)}</div>
      <div className="lr-classroom" role="img" aria-label="Four smiling children drawing together in a bright ABC classroom"/>
      <div className="lr-trust"><Icon name="GraduationCap" size={28}/><div><strong>Trusted by 1000+ Families</strong><small>Building bright futures since 2010</small></div></div>
    </section>
    <main className="lr-card"><header className="lr-card-brand"><Link to="/" className="lr-inner-logo" aria-label="ABC Daycare home"/><p>Smart Learning <b>•</b> Happy Children <b>•</b> Bright Future</p></header>
      <div className="lr-form-shell"><nav className="lr-tabs" aria-label="Account access"><Link to="/login" className={!register?'active':''} aria-current={!register?'page':undefined}><Icon name="UserRound" size={20}/>Login</Link><Link to="/register" className={register?'active':''} aria-current={register?'page':undefined}><Icon name="SquarePen" size={20}/>Register</Link></nav>
      <div className="lr-columns"><section className="lr-login"><h2>{register?'Create Admin Account':'Login to Your Account'}</h2><p>{register?'Register your school administrator account.':'Enter your credentials to access your dashboard.'}</p>
      <form onSubmit={submit}>
        {register&&<label className="lr-input"><UserRound size={16}/><input aria-label="Full name" name="fullName" autoComplete="name" required placeholder="Full name"/></label>}
        <label className="lr-input"><Mail size={16}/><input aria-label={register?'Email address':'Email or Login ID'} name={register?'email':'identifier'} type={register?'email':'text'} autoComplete="username" required placeholder={register?'Email address':'Email or Login ID'} onChange={e=>{if(!register){const type=e.target.value&&!e.target.value.includes('@')?'id':'email';setIdentifierType(type);if(type==='email'){setSelectedSchool(null);setSchoolSearch('');setSchoolOpen(false)}}}}/></label>
        {!register&&identifierType==='id'&&<div className="lr-school-picker"><label className="lr-input"><ShieldCheck size={16}/><input aria-label="Search and select school" value={schoolSearch} autoComplete="off" required placeholder="Search school…" onFocus={()=>setSchoolOpen(true)} onChange={e=>{setSchoolSearch(e.target.value);setSelectedSchool(null);setSchoolOpen(true)}}/>{selectedSchool&&<Icon name="CircleCheck" size={15}/>}</label>{schoolOpen&&<div className="lr-school-options" role="listbox" aria-label="Registered schools">{schoolsLoading?<p>Loading schools…</p>:schoolsError?<p className="error">{schoolsError}</p>:matchingSchools.length?matchingSchools.map(school=><button key={school.id} type="button" role="option" aria-selected={selectedSchool?.id===school.id} onClick={()=>{setSelectedSchool(school);setSchoolSearch(school.name);setSchoolOpen(false)}}><Icon name="School" size={15}/><span><strong>{school.name}</strong><small>Registered school</small></span>{selectedSchool?.id===school.id&&<Icon name="Check" size={14}/>}</button>):<p>No registered school matches your search.</p>}</div>}</div>}
        <label className="lr-input"><LockKeyhole size={16}/><input aria-label="Password" name="password" type={showPassword?'text':'password'} autoComplete={register?'new-password':'current-password'} minLength={register?12:1} required placeholder={register?'Password (12+ characters)':'Password'}/><button type="button" aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={14}/>:<Eye size={14}/>}</button></label>
        {!register&&<div className="lr-form-options"><label><input type="checkbox" name="remember" defaultChecked/>Remember me</label><button type="button" onClick={()=>setHelp('Please contact your school administrator to reset your password.')}>Forgot password?</button></div>}
        {error&&<p role="alert" className="lr-error">{error}</p>}
        <button className="lr-submit" type="submit" disabled={pending} aria-busy={pending}><Icon name="ArrowRight" size={19}/>{pending?'Processing…':register?'Create Account & Verify':'Login'}</button>
      </form>
      {!register&&<><div className="lr-divider"><span>or</span></div><button type="button" className="lr-google" onClick={()=>setHelp('Google sign-in is not connected yet. Please use your school email or login ID.')}><span>G</span>Login with Google</button></>}
      {help&&<p className="lr-help" role="status">{help}<button type="button" aria-label="Dismiss help" onClick={()=>setHelp('')}>×</button></p>}
      </section><aside className="lr-register"><h2>New to ABC Daycare?</h2><p>Create your account and start your<br/>child’s learning journey today.</p><span className="lr-role-label">Select Your Role</span><div className="lr-roles">{['Parent / Guardian','Teacher','Student','Staff','Admin / Manager'].map((name,i)=><button key={name} type="button" aria-pressed={role===name} className={role===name?'selected':''} onClick={()=>setRole(name)}><span className={`lr-role-icon lr-role-${i}`}/>{name}</button>)}</div><button type="button" className="lr-create" onClick={()=>role==='Admin / Manager'?navigate('/register'):setHelp(`${role} accounts are provided by your school. Please contact your administrator to get started.`)}><Icon name="UserRoundPlus" size={17}/>Create Account</button></aside></div></div>
      <footer className="lr-assurances">{[['ShieldCheck','Secure & Reliable','Your data is protected'],['Headset','24/7 Support','We are here to help'],['Heart','Growing Together','For a better tomorrow']].map(([icon,title,desc],i)=><div key={title}><span className={`lr-assurance-icon lr-assurance-${i}`}><Icon name={icon} size={18}/></span><span><strong>{title}</strong><small>{desc}</small></span></div>)}</footer>
    </main><div className="lr-leaf left" aria-hidden="true">❧</div><div className="lr-leaf right" aria-hidden="true">❧</div>
  </div>
}
