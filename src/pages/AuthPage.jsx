import LoginForm from '../features/auth/components/LoginForm'
import RegisterForm from '../features/auth/components/RegisterForm'
export default function AuthPage({mode='login'}){return mode==='register'?<RegisterForm/>:<LoginForm/>}
