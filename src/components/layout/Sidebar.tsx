import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, LogOut } from 'lucide-react'
import Icon from '../ui/Icon'
import Logo from '../ui/Logo'

const roleMenus = {
  superadmin: [['Dashboard','LayoutDashboard'],['Users Management','Users'],['Schools & Centers','Building2'],['Programs','BookOpen'],['Reports','FileBarChart'],['Analytics','ChartNoAxesCombined'],['System Settings','Settings'],['Logs & Activity','ClipboardList'],['Backup & Restore','CloudBackup']],
  admin: [['Dashboard','LayoutDashboard'],['Students','GraduationCap'],['Teachers','UsersRound'],['Staff','BriefcaseBusiness'],['Classes','School'],['Attendance','CalendarCheck'],['Reports','FileBarChart'],['Settings','Settings']],
  teacher: [['Dashboard','LayoutDashboard'],['My Classes','UsersRound'],['Attendance','CalendarCheck'],['Assignments','ClipboardCheck'],['Grades','BadgeCheck'],['Messages','MessageSquare'],['Resources','BookOpen'],['Settings','Settings']],
  student: [['Dashboard','LayoutDashboard'],['My Classes','UsersRound'],['My Assignments','ClipboardList'],['Attendance','Clock3'],['Grades','BadgeCheck'],['Messages','MessageSquare'],['Gallery','Images'],['Profile','UserRound'],['Settings','Settings']],
  accountant: [['Dashboard','LayoutDashboard'],['Income & Expenses','ArrowLeftRight'],['Fees Management','WalletCards'],['Reports','FileBarChart'],['Students','UsersRound'],['Invoices','ReceiptText'],['Payments','CreditCard'],['Classes','School'],['Settings','Settings']],
  guard: [['Dashboard','LayoutDashboard'],['Visitor Log','ClipboardList'],['Safety Checks','ShieldCheck'],['Messages','MessageSquare'],['Reports','FileBarChart']],
  cleaner: [['Dashboard','LayoutDashboard'],['My Tasks','ClipboardCheck'],['Cleaning Areas','Sparkles'],['Supplies','Package'],['Reports','FileBarChart'],['Settings','Settings']],
  cooking: [['Dashboard','LayoutDashboard'],['Meal Plan','Utensils'],['Kitchen Inventory','Package'],['Recipes','ChefHat'],['Food Orders','ShoppingCart'],['Attendance','UsersRound'],['Reports','FileBarChart'],['Settings','Settings']],
  driver: [['Dashboard','LayoutDashboard'],['My Routes','MapPin'],['Students','UsersRound'],['Attendance','CalendarCheck'],['Messages','MessageSquare'],['Reports','FileBarChart'],['Settings','Settings']],
  ict: [['Dashboard','LayoutDashboard'],['System Monitoring','MonitorCog'],['User Management','UsersRound'],['Network & Devices','Wifi'],['Applications','Boxes'],['Support Tickets','Headphones'],['Backups','CloudBackup'],['Security','ShieldCheck'],['Reports','FileBarChart'],['Settings','Settings']],
}

export default function Sidebar({ role, open, onClose }) {
  const location = useLocation()
  const menu = roleMenus[role] || roleMenus.admin
  return <aside className={`sidebar ${open?'open':''}`}>
    <div className="sidebar-top"><Logo/><button className="mobile-close" onClick={onClose}>×</button></div>
    <div className="role-pill"><span className="status-dot"/> {role.replace('superadmin','Super Admin').replace('ict','ICT').replace('cooking','Cooking').replace('cleaner','Cleaner').replace('driver','Driver').replace('guard','Security Guard').replace('teacher','Teacher').replace('student','Student').replace('accountant','Accountant').replace('admin','Admin')}</div>
    <nav>{menu.map(([label,icon],i)=>{const slug=label.toLowerCase().replace(/[^a-z0-9]+/g,'-'); const active= i===0 && (location.pathname.endsWith('/dashboard') || location.pathname.endsWith('/dashboard/')); return <Link key={label} to={`/dashboard/${role}/${i===0?'':slug}`} className={active?'active':''} onClick={onClose}><Icon name={icon}/><span>{label}</span>{['Users Management','Reports','System Settings'].includes(label)&&<ChevronDown size={14} className="nav-caret"/>}{label==='Support Tickets'&&<b className="badge">3</b>}</Link>})}</nav>
    <div className="sidebar-bottom"><div className="side-note"><SparkleIcon/><strong>Better Education<br/>Brighter Future</strong><small>Safe, happy and inspiring spaces for every child.</small></div><Link className="logout" to="/"><LogOut size={16}/> Sign out</Link></div>
  </aside>
}
function SparkleIcon(){return <div className="sparkle-box">✦</div>}
