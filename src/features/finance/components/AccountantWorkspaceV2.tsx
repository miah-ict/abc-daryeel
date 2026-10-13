import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Icon from '../../../components/ui/Icon'
import useLocalState from '../../../hooks/useLocalState'
import { useWorkspace } from '../../../app/context/WorkspaceContext'
import {useAuth} from '../../../app/context/AuthContext'
import { accountantBase as base, today, money } from '../../../data/accountantData'
import { financeGet, financePost, financePut, getFinanceClasses } from '../api/financeApi'
import { Card, Stat, Table, Badge, ReceiptView } from './FinancePrimitives'
import FinanceIncomeScreens from './FinanceIncomeScreens'
import FinanceExpenseScreens from './FinanceExpenseScreens'
import FinanceControlScreens from './FinanceControlScreens'
import AccountantOnboarding from './AccountantOnboarding'
import '../../../styles/admin.css'
import '../../../styles/finance-modern.css'

const groups=[
 {label:'Overview',items:[['Dashboard','House','']]},
 {label:'Income',items:[['Student Fees','GraduationCap','student-fees'],['Fee Collection','HandCoins','fee-collection'],['Outstanding Fees','Clock3','outstanding-fees'],['Other Income','CirclePlus','other-income']]},
 {label:'Expenses',items:[['Staff Payments','UsersRound','staff-payments'],['School Expenses','ReceiptText','school-expenses']]},
 {label:'Documents',items:[['Receipts','Receipt','receipts'],['Invoices / Bills','FileText','invoices-bills']]},
 {label:'Insights',items:[['Financial Reports','ChartNoAxesCombined','reports'],['Ledger','BookOpen','ledger'],['Audit','ShieldCheck','audit']]},
 {label:'Controls',items:[['Daily Closing','CalendarCheck','daily-closing'],['Monthly Closing','CalendarRange','monthly-closing'],['Budget','ChartPie','budget'],['Refunds','RotateCcw','refunds']]},
 {label:'Account',items:[['Settings','Settings','settings']]},
]
const allPages=[...groups.flatMap(group=>group.items),['Finance Setup','Sparkles','onboarding']]
const aliases={'income-expenses':'ledger','fees-management':'student-fees',students:'student-fees',invoices:'invoices-bills',payments:'fee-collection',classes:'student-fees',invoice:'invoices-bills',payment:'fee-collection',report:'reports',setting:'settings'}
const subtitles={
 'student-fees':'Diiwaangelinta iyo la socodka lacagta ardayda',
 'fee-collection':'Qaadista lacagta iyo rasiidhka ardayga',
 'outstanding-fees':'Ogow lacagaha ardayda ku harsan',
 'other-income':'Dakhli kale oo dugsiga soo galay',
 'staff-payments':'Mushaharka shaqaalaha iyo macallimiinta',
 'school-expenses':'Kirada, korontada, biyaha, internet-ka iyo agabka',
 receipts:'Rasiidhada lacagaha la diiwaangeliyay',
 'invoices-bills':'Qaansheegyada ardayda iyo biilasha dugsiga',
 reports:'Warbixinnada maaliyadda',ledger:'Diiwaanka dhammaan dhaqdhaqaaqyada lacagta',
 audit:'Taariikhda ficillada maaliyadeed',
 'daily-closing':'Xiritaanka xisaabta maalinlaha ah',
 'monthly-closing':'Xiritaanka xisaabta billaha ah',
 budget:'Miisaaniyadda iyo kharashka dhabta ah',refunds:'Lacagaha la celiyay',
 settings:'Faahfaahinta rasiidhka iyo hababka lacag bixinta',
 onboarding:'Qorshee lacagaha fasal kasta iyo jadwalka 12 bilood',
}
const endpoints={summary:'/summary',transactions:'/transactions',invoices:'/invoices',outstanding:'/outstanding?includePaid=true',
 receipts:'/receipts',feePlans:'/fee-plans',bills:'/bills',staff:'/staff',staffPayments:'/staff-payments',
 schoolExpenses:'/school-expenses',budgets:'/budgets',closings:'/closings',refunds:'/refunds',audit:'/audit',
 settings:'/settings',reports:'/reports'}
const initialFinance=workspace=>({
 summary:{income:0,expenses:0,pending:0,net:0},
 transactions:workspace.data['abc-finance-transactions']||[],invoices:workspace.data['abc-finance-invoices']||[],
 outstanding:[],receipts:[],feePlans:workspace.data['abc-finance-fees']||[],bills:[],staff:[],
 staffPayments:[],schoolExpenses:[],budgets:[],closings:[],refunds:[],audit:[],
 settings:workspace.data['abc-finance-settings']||{},reports:null,
})
const number=amount=>Number(amount||0)
const transactionColumns=[{label:'Date',render:r=>r.date},{label:'Description',render:r=><strong>{r.description}</strong>},
 {label:'Category',key:'category'},{label:'Type',render:r=><Badge tone={r.type==='Income'?'good':r.type==='Refund'?'bad':'warn'}>{r.type}</Badge>},
 {label:'Amount',render:r=><strong>{money(number(r.amount))}</strong>},{label:'Method',key:'method'}]

export default function AccountantWorkspace(){
 const workspace=useWorkspace(),auth=useAuth(),location=useLocation(),navigate=useNavigate(),raw=location.pathname.slice(base.length).split('/').filter(Boolean)[0]||''
 const logout=auth?.logout||(()=>{})
 const page=aliases[raw]||raw,meta=allPages.find(item=>item[2]===page)
 const [dark,setDark]=useLocalState('abc-finance-dark')
 const [data,setData]=useState(()=>initialFinance(workspace))
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [drawer,setDrawer]=useState(false),[search,setSearch]=useState(''),[receipt,setReceipt]=useState(null)
 const [classes,setClasses]=useState([])
 const students=workspace.data['abc-finance-students']||[]
 const refresh=useCallback(async()=>{
  const entries=Object.entries(endpoints),results=await Promise.allSettled(entries.map(([,path])=>financeGet(path)))
  const values={};const failures=[]
  results.forEach((result,index)=>{if(result.status==='fulfilled')values[entries[index][0]]=result.value;else failures.push(entries[index][0])})
  setData(previous=>({...previous,...values}));setLoading(false)
  setError(failures.length?`Could not load ${failures.join(', ')}. Retry to refresh these records.`:'')
  return values
 },[])
 useEffect(()=>{refresh().catch(err=>{setError(err.message);setLoading(false)})},[refresh])
 useEffect(()=>{getFinanceClasses().then(setClasses).catch(()=>setClasses([]))},[])
 useEffect(()=>{setSearch('');setDrawer(false);setNotice('')},[page])
 useEffect(()=>{document.title=`${meta?.[0]||'Accountant'} · ABC Finance`},[meta])
 const mutate=async(path,body,method='POST',success='Record saved')=>{
  const result=method==='PUT'?await financePut(path,body):await financePost(path,body)
  setNotice(success);await refresh();return result
 }
 const openReceipt=result=>{
  const value=result?.receipt?{...result.receipt,transaction:result.transaction||result}:result
  setReceipt(value)
 }
 const filtered=items=>items.filter(item=>JSON.stringify(item).toLowerCase().includes(search.toLowerCase()))
 const title=meta?.[0]||'Dashboard'
 const schoolName=data.settings?.schoolName||data.settings?.receiptName||'Your School'
 const schoolInitials=schoolName.split(/\s+/).filter(Boolean).map(word=>word[0]).slice(0,2).join('').toUpperCase()
 const todayIncome=data.transactions.filter(t=>t.date===today&&t.type==='Income').reduce((n,t)=>n+number(t.amount),0)
 const todayExpenses=data.transactions.filter(t=>t.date===today&&t.type!=='Income').reduce((n,t)=>n+number(t.amount),0)
 const pending=number(data.summary.pending)
 const collections=data.outstanding.filter(item=>number(item.balance)>0).sort((a,b)=>a.due.localeCompare(b.due))
 if(!meta)return <Navigate to={base} replace/>
 if(!loading&&data.settings?.onboardingComplete===false&&page!=='onboarding')return <Navigate to={`${base}/onboarding`} replace/>
 return <div className={`fin-app ${dark?'fin-dark':''}`}>
  {drawer&&<button className="fin-scrim" aria-label="Close navigation" onClick={()=>setDrawer(false)}/>}
  <aside className={`fin-sidebar ${drawer?'is-open':''}`}><Link className="fin-brand" to={base}><span className={`fin-logo ${data.settings?.schoolLogo?'has-image':''}`}>{data.settings?.schoolLogo?<img src={data.settings.schoolLogo} alt=""/>:schoolInitials}</span><span><strong>{schoolName}</strong><small><Icon name="BadgeCheck" size={12}/> Finance workspace</small></span></Link><button className="fin-close" aria-label="Close navigation" onClick={()=>setDrawer(false)}><Icon name="X"/></button><nav aria-label="Accountant navigation">{groups.map(group=><div className={`fin-nav-group fin-nav-${group.label.toLowerCase()}`} key={group.label}><p>{group.label}</p>{group.items.map(([label,icon,slug])=><Link key={slug} to={`${base}/${slug}`} className={page===slug?'active':''} aria-current={page===slug?'page':undefined} onClick={()=>setDrawer(false)}><span className="fin-nav-icon"><Icon name={icon} size={18} strokeWidth={2.15}/></span><span>{label}</span></Link>)}</div>)}</nav><div className="fin-sidebar-bottom"><span className="fin-online-dot"/><span><b>{schoolName}</b><small>Database connected</small></span></div><button className="fin-signout" onClick={logout}><span><Icon name="LogOut" size={17}/></span>Sign out</button></aside>
  <div className="fin-main"><header className="fin-topbar"><button className="fin-menu" aria-label="Open navigation" onClick={()=>setDrawer(true)}><Icon name="Menu"/></button><div className="fin-context"><small>ACCOUNTANT WORKSPACE</small><strong>{title}</strong></div><label className="fin-global-search"><Icon name="Search" size={17}/><input aria-label="Search current page" placeholder="Search this page…" value={search} onChange={event=>setSearch(event.target.value)}/></label><button className="fin-theme" aria-label={dark?'Use light theme':'Use dark theme'} onClick={()=>setDark(!dark)}><Icon name={dark?'Sun':'Moon'} size={19}/></button><Link className="fin-avatar" to={`${base}/settings`} aria-label="Finance settings">AC</Link></header>
   <main className="fin-content"><div className="fin-page-heading"><div className="fin-heading-copy"><span className="fin-heading-icon"><Icon name={meta?.[1]||'LayoutDashboard'} size={23} strokeWidth={2.15}/></span><div><p>{page?'Finance / '+title:'Financial overview'}</p><h1>{title}</h1><span>{subtitles[page]||'Your school finances at a glance'}</span></div></div><span className="fin-date"><Icon name="CalendarDays" size={17}/>{today}</span></div>
    {error&&<div className="fin-alert" role="alert"><Icon name="CircleAlert" size={18}/>{error}<button onClick={refresh}>Retry</button></div>}
    {notice&&<div className="fin-notice" role="status"><Icon name="CircleCheck" size={18}/>{notice}<button aria-label="Dismiss" onClick={()=>setNotice('')}><Icon name="X" size={16}/></button></div>}
    {loading&&<div className="fin-loading" role="status">Loading finance records…</div>}
    {!page&&<><section className="fin-hero"><div><span>FINANCIAL OVERVIEW</span><h2>Welcome back, {String(data.settings?.name||'Accountant').split(' ')[0]}.</h2><p>See what has been collected, what has been spent, and which student fees need attention.</p></div><div className="fin-hero-symbol" aria-hidden="true"><Icon name="Landmark" size={78}/></div></section><div className="fin-stats"><Stat label="Received today" value={todayIncome} icon="ArrowDownLeft" tone="mint" detail={today}/><Stat label="Spent today" value={todayExpenses} icon="ArrowUpRight" tone="rose" detail={today}/><Stat label="Outstanding fees" value={pending} icon="Clock3" tone="amber" detail={`${collections.length} open invoices`}/><Stat label="Net position" value={number(data.summary.net)} icon="WalletCards" tone="blue" detail="All recorded dates"/></div><div className="fin-overview-grid"><Card title="Quick actions" description="Common tasks, one step away"><div className="fin-quick">{[['Collect a fee','fee-collection','HandCoins'],['Create invoice','invoices-bills','FilePlus2'],['Record expense','school-expenses','ReceiptText'],['Close the day','daily-closing','CalendarCheck']].map(([label,slug,icon])=><Link key={slug} to={`${base}/${slug}`}><Icon name={icon} size={20}/>{label}<Icon name="ArrowUpRight" size={15}/></Link>)}</div></Card><Card title="Fees needing attention" description="Oldest due dates first" action={<Link className="fin-text-link" to={`${base}/outstanding-fees`}>View all</Link>}><Table columns={[{label:'Student',render:r=>r.student?.name||r.studentId},{label:'Due',key:'due'},{label:'Balance',render:r=><strong>{money(number(r.balance))}</strong>}]} rows={collections.slice(0,5)} empty="No outstanding fees."/></Card></div><Card title="Recent ledger activity" description="Posted income and expenses" action={<Link className="fin-text-link" to={`${base}/ledger`}>Open ledger</Link>}><Table columns={transactionColumns} rows={[...data.transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6)} empty="No financial activity recorded yet."/></Card></>}
    {page==='onboarding'&&<AccountantOnboarding key={classes.map(row=>row.id).join('|')} required={!data.settings?.onboardingComplete} classes={classes} plans={data.feePlans} settings={data.settings} onCancel={()=>navigate(-1)} onSave={async body=>{await mutate('/onboarding',body,'PUT','Finance setup saved and student invoices created');navigate(base)}}/>}
    {['student-fees','fee-collection','outstanding-fees','other-income','receipts','invoices-bills'].includes(page)&&<FinanceIncomeScreens page={page} data={data} students={students} classes={classes} search={search} filtered={filtered} mutate={mutate} onReceipt={openReceipt}/>} 
    {['staff-payments','school-expenses'].includes(page)&&<FinanceExpenseScreens page={page} data={data} search={search} filtered={filtered} mutate={mutate}/>}
    {['reports','ledger','audit','daily-closing','monthly-closing','budget','refunds','settings'].includes(page)&&<FinanceControlScreens page={page} data={data} search={search} filtered={filtered} mutate={mutate} refresh={refresh}/>} 
    <footer className="fin-footer"><span><Icon name="ShieldCheck" size={14}/>{schoolName} · Accountant</span><span>Records are saved to the school database</span></footer>
   </main>
  </div>
  <ReceiptView receipt={receipt} settings={data.settings} onClose={()=>setReceipt(null)}/>
 </div>
}
