import { lazy, Suspense, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import MetricCard from '../components/ui/MetricCard'
import { Donut, LineChart, Progress } from '../components/ui/Chart'
import Icon from '../components/ui/Icon'
import {useWorkspace} from '../app/context/WorkspaceContext'
import {useTheme} from '../app/context/ThemeContext'
import { ROLE_CONFIG } from '../data/roles'
const AdminPage=lazy(()=>import('./AdminPage'))
const ManagerPage=lazy(()=>import('./ManagerPage'))
const TeacherPage=lazy(()=>import('./TeacherPage'))
const StudentPage=lazy(()=>import('./StudentPage'))
const AccountantPage=lazy(()=>import('./AccountantPage'))
const SuperAdminPage=lazy(()=>import('./SuperAdminPage'))

const activity = ['New user account created','Student enrollment updated','Attendance record submitted','Report generated','System backup completed','New message received']
const names = ['Amina Ali','Mohamed Ali','Fatima Noor','Yusuf Omar','Layla Ahmed']

export default function DashboardPage(){
 const {role='admin'}=useParams(); const {overview:data}=useWorkspace(); const [open,setOpen]=useState(false); const {dark,setDark}=useTheme()
 const config=ROLE_CONFIG[role]||ROLE_CONFIG.admin
 const rows=useMemo(()=>Array.from({length:5},(_,i)=>({name:names[i],value:[482,356,298,276,230][i],status:'Active'})),[])
 if(role==='admin') return <Suspense fallback={<div className="api-state">Loading workspace…</div>}><AdminPage/></Suspense>
 if(role==='manager') return <Suspense fallback={<div className="api-state">Loading manager workspace…</div>}><ManagerPage/></Suspense>
 if(role==='teacher') return <Suspense fallback={<div className="api-state">Loading workspace…</div>}><TeacherPage/></Suspense>
 if(role==='student') return <Suspense fallback={<div className="api-state">Loading workspace…</div>}><StudentPage/></Suspense>
 if(role==='accountant') return <Suspense fallback={<div className="api-state">Loading workspace…</div>}><AccountantPage/></Suspense>
 if(role==='superadmin') return <Suspense fallback={<div className="api-state">Loading workspace…</div>}><SuperAdminPage/></Suspense>
 return <div className={dark?'app dark':'app'}><Sidebar role={role} open={open} onClose={()=>setOpen(false)}/><main className="main"><Topbar role={role} onMenu={()=>setOpen(true)} dark={dark} setDark={setDark}/><section className="content">
  <div className="hero"><div className="hero-copy"><span className="eyebrow">✦ {data.title}</span><h1>{data.greet}</h1><p>{data.desc}</p><div className="hero-date"><Icon name="CalendarDays" size={16}/> October 4, 2026 <small>• Today</small></div></div><div className="hero-art">{data.hero?<img src={data.hero} alt="dashboard reference"/>:<div className="art-placeholder">ABC</div>}</div><div className="hero-card"><Icon name="ShieldCheck"/><strong>System Overview</strong><span>All systems operational</span></div></div>
  <div className="metrics">{data.metrics.map((m,i)=><MetricCard key={i} title={m[0]} value={m[1]} change={m[2]} caption={m[3]} tone={m[4]} icon={['Users','GraduationCap','BriefcaseBusiness','WalletCards','School','ShieldCheck'][i%6]}/>)}</div>
  <div className="grid-3"><section className="panel span-2"><div className="panel-head"><div><h2>{data.chartTitle}</h2><small>Live overview · Last 8 months</small></div><button className="select">This Year⌄</button></div><LineChart points={[28,42,37,58,51,67,61,82]}/></section><section className="panel"><div className="panel-head"><h2>Performance</h2><span className="live-dot">● Live</span></div><div className="donut-area"><Donut percent={data.donut} label="Overall"/><div className="legend"><div><i/>Completed <b>{data.donut}%</b></div><div><i/>In Progress <b>{100-data.donut > 0 ? 100-data.donut : 0}%</b></div><div><i/>Target <b>100%</b></div></div></div></section></div>
  <div className="grid-3"><section className="panel span-2"><div className="panel-head"><h2>{data.tableTitle}</h2><button className="text-btn">View All →</button></div><div className="table-wrap"><table><thead><tr><th>Name / Task</th><th>Category</th><th>Value</th><th>Status</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.name}><td><div className="table-person"><span>{r.name.slice(0,1)}</span>{r.name}</div></td><td>{['Classroom','Operations','Learning','Finance','System'][i]}</td><td>{role==='accountant'?`$${[450,1200,650,300,220][i].toLocaleString()}:` : r.value}</td><td><b className="status success">● {r.status}</b></td></tr>)}</tbody></table></div></section><section className="panel"><div className="panel-head"><h2>Quick Actions</h2><Icon name="Zap"/></div><div className="quick-grid">{['Add User','Create Report','View Calendar','Send Message','Manage Data','Settings'].map((x,i)=><button key={x}><Icon name={['UserPlus','FilePlus2','CalendarDays','MessageSquare','Database','Settings'][i]}/><span>{x}</span></button>)}</div></section></div>
  <div className="grid-3"><section className="panel"><div className="panel-head"><h2>Recent Activity</h2><button className="text-btn">View All →</button></div><div className="activity-list">{activity.slice(0,5).map((x,i)=><div key={x}><div className="activity-icon"><Icon name={['UserPlus','UserRoundPlus','CalendarCheck','FileBarChart','CloudBackup'][i]}/></div><div><strong>{x}</strong><small>{2+i}h ago · {config.name}</small></div><b className="status success">Success</b></div>)}</div></section><section className="panel"><div className="panel-head"><h2>Progress</h2><span>Today</span></div><Progress label="Operations" value={82}/><Progress label="Attendance" value={94}/><Progress label="Data quality" value={88}/><Progress label="Goals" value={76}/></section><section className="panel quote-panel"><div className="quote-art">✦</div><h2>Better Education.<br/>Brighter Future.</h2><p>Every clean classroom, lesson, meal and safe journey helps children learn, grow and shine.</p><div className="quote-tags"><span>Learn</span><span>Grow</span><span>Shine</span></div></section></div>
 </section><footer>ABC Daycare & Kindergarten <span>•</span> {data.title}<span className="footer-right">Happy Children · Healthy Future · Better Tomorrow ♥</span></footer></main></div>
}
