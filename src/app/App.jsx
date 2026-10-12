import {BrowserRouter,Navigate,Route,Routes,useParams} from 'react-router-dom'
import {AuthProvider,useAuth} from './context/AuthContext'
import {ThemeProvider} from './context/ThemeContext'
import {WorkspaceProvider} from './context/WorkspaceContext'
import LandingPage from '../pages/LandingPage'
import AuthPage from '../pages/AuthPage'
import DashboardPage from '../pages/DashboardPage'
import VerifyPage from '../pages/VerifyPage'
import OnboardingPage from '../pages/OnboardingPage'
import ChangePasswordPage from '../pages/ChangePasswordPage'
import PlansPage from '../pages/PlansPage'
import PaymentResultPage from '../pages/PaymentResultPage'
import BillingGate from './components/BillingGate'
import {ROLES} from '../data/roles'
function ProtectedDashboard() {
 const {user,loading,logout}=useAuth(),{role}=useParams()
 if(loading)return <div className="api-state">Checking your session…</div>
 if(!user)return <Navigate to="/login" replace />
 if(user.firstLogin)return <Navigate to="/change-password" replace />
 if(!ROLES.includes(role)||(user.role!=='superadmin'&&user.role!==role))return <Navigate to={`/dashboard/${user.role}`} replace />
 return <BillingGate view="dashboard"><WorkspaceProvider key={`${user.id}:${role}`} role={role}><button className={`session-signout ${role}-session-signout`} onClick={logout}>Sign out</button><DashboardPage/></WorkspaceProvider></BillingGate>
}
function PublicOnly({children}) {
 const {user,loading}=useAuth()
 if(loading)return <div className="api-state" role="status">Checking your session…</div>
 if(user?.firstLogin)return <Navigate to="/change-password" replace />
 if(user?.role==='admin'&&!user.schoolId)return <Navigate to="/plans" replace />
 if(user)return <Navigate to={`/dashboard/${user.role}`} replace />
 return children
}
function AuthRoute({children}) {
 const {user,loading}=useAuth()
 if(loading)return <div className="api-state">Checking your session…</div>
 if(!user)return <Navigate to="/login" replace />
 return children
}
export default function App() {
 return <AuthProvider><ThemeProvider><BrowserRouter><Routes>
  <Route path="/" element={<LandingPage/>}/>
  <Route path="/login" element={<PublicOnly><AuthPage mode="login"/></PublicOnly>}/>
  <Route path="/register" element={<PublicOnly><AuthPage mode="register"/></PublicOnly>}/>
  <Route path="/verify" element={<PublicOnly><VerifyPage/></PublicOnly>}/>
  <Route path="/plans" element={<AuthRoute><PlansPage/></AuthRoute>}/>
  <Route path="/payment/result" element={<AuthRoute><PaymentResultPage/></AuthRoute>}/>
  <Route path="/onboard" element={<AuthRoute><BillingGate view="onboard"><OnboardingPage/></BillingGate></AuthRoute>}/>
  <Route path="/change-password" element={<AuthRoute><ChangePasswordPage/></AuthRoute>}/>
  <Route path="/dashboard/:role/*" element={<ProtectedDashboard/>}/>
  <Route path="*" element={<Navigate to="/" replace/>}/>
 </Routes></BrowserRouter></ThemeProvider></AuthProvider>
}
