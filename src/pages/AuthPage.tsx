import LoginForm from '../features/auth/components/LoginForm'
import RegisterForm from '../features/auth/components/RegisterForm'
export default function AuthPage({mode='login'}: { mode?: 'login' | 'register' }){return mode==='register'?<RegisterForm/>:<LoginForm/>}
