import {useWorkspace} from '../../../app/context/WorkspaceContext'
import AdminClassesSection1 from './AdminClassesSection1'
import AdminAttendanceSection2 from './AdminAttendanceSection2'
import AdminReportsSection3 from './AdminReportsSection3'
import AdminSettingsSection4 from './AdminSettingsSection4'
import AdminTeachersSubjectsSection from './AdminTeachersSubjectsSection'
import AdminStudentWizard from './AdminStudentWizard'
import AdminExamsSection from './AdminExamsSection'
import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import Icon from '../../../components/ui/Icon'
import '../../../styles/admin.css'
import '../../../styles/admin-teachers.css'
import useLocalState from '../../../hooks/useLocalState'
import {createStudent,updateStudent,createUser,updateUser,createClass,updateClass} from '../api/adminApi'
import {api} from '../../../services/api'
import {buildClassPayload} from './adminClassForm'

const base = '/dashboard/admin'
const menus = [['Dashboard','LayoutDashboard',''],['Students','UsersRound','students'],['Teachers & Subjects','GraduationCap','teachers'],['Staff','BriefcaseBusiness','staff'],['Classes','School','classes'],['Attendance','CalendarCheck','attendance'],['Exams','ClipboardCheck','exams'],['Reports','ChartNoAxesCombined','reports'],['Settings','Settings','settings']]

const schedule = [['08:00','09:00','Circle Time','All classes','School','blue'],['09:00','10:00','Language & Literacy','KG 1 & KG 2','BookOpen','green'],['10:15','11:15','Arts & Crafts','KG 1','Palette','orange'],['11:15','12:00','Outdoor Play','All classes','Trees','purple']]
const activity = [['ClipboardCheck','Attendance updated for KG 1','Daily classroom register','blue'],['UserPlus','A new student joined Little Explorers','Enrollment completed','green'],['FileText','Monthly report is ready','October school overview','orange'],['School','Class schedules updated','Morning sessions confirmed','purple']]
const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Mogadishu',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const displayDate = new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Mogadishu',month:'short',day:'numeric',year:'numeric'}).format(new Date())
function Avatar({name,index=0,large=false}) {return <span className={`ad-avatar av-${index%6} ${large?'large':''}`}>{(typeof name==='string'&&name.trim()?name.trim():'Unassigned').split(/\s+/).map(x=>x[0]).slice(0,2).join('')}</span>}
function Badge({children}) {const tone=children==='Absent'?'pink':children==='Leave'||children==='On leave'?'orange':children==='Unmarked'?'purple':'green';return <span className={`ad-badge ${tone}`}><i/>{children}</span>}
function Panel({title,icon,children,link,label='View all'}) {return <section className="ad-panel"><div className="ad-panel-head"><h2><span className="ad-icon blue"><Icon name={icon}/></span>{title}</h2>{link&&<Link to={`${base}/${link}`}>{label} <Icon name="ArrowRight" size={13}/></Link>}</div>{children}</section>}
function Metrics({items}) {return <div className={`ad-metrics ad-metrics-${items.length}`}>{items.map(([title,value,note,icon,tone])=><div className="ad-metric" key={title}><span className={`ad-icon ${tone}`}><Icon name={icon} size={23}/></span><div><span>{title}</span><strong>{value}</strong><small>{note}</small></div></div>)}</div>}
function downloadCSV(filename,rows) {const content=rows.map(row=>row.map(cell=>'"'+String(cell??'').replaceAll('"','""')+'"').join(',')).join('\r\n'); const url=URL.createObjectURL(new Blob(['\uFEFF'+content],{type:'text/csv;charset=utf-8;'})); const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url)}
function nextId(prefix,items) {const highest=items.reduce((max,item)=>{const match=String(item?.id||'').match(/(\d+)$/);return Math.max(max,match?Number(match[1]):0)},0);return `${prefix}-${String(highest+1).padStart(3,'0')}`}
const staffRoles = [
  ['manager','Maamule'],['accountant','Xisaabiye'],['guard','Waardiye'],
  ['driver','Darawal'],['cooking','Cooker'],['cleaner','Cleaning']
]
const staffRoleLabel = role => Object.fromEntries(staffRoles)[role] || role || 'Staff'
const staffIdRange = role => role === 'manager' ? '010–049' : role === 'accountant' ? '050–099' : '0100–0999'
const formatStaffId = (role,id) => id == null ? '' : String(id).padStart(['manager','accountant'].includes(role) ? 3 : 4,'0')
const nameParts = value => {const parts=String(value||'').trim().split(/\s+/).filter(Boolean);return {firstName:parts[0]||'',lastName:parts.slice(1).join(' ')||''}}

export default function AdminWorkspace() {
  const workspace = useWorkspace()
  const workspaceContent = workspace?.content || {}
  const linkAccounts = Array.isArray(workspaceContent.linkAccounts) ? workspaceContent.linkAccounts : []
  const location = useLocation()
  const page = location.pathname.slice(base.length).split('/').filter(Boolean)[0] || ''
  const requestedClassId = new URLSearchParams(location.search).get('class') || ''

  const [rawStudents] = useLocalState('abc-admin-students')
  const [rawTeachers] = useLocalState('abc-admin-teachers')
  const [rawStaff] = useLocalState('abc-admin-staff')
  const [rawClasses] = useLocalState('abc-admin-classes')
  const [rawSubjects, setSubjects] = useLocalState('abc-admin-subjects')
  const [rawRegister, setRegister] = useLocalState('abc-admin-attendance')
  const [rawStaffRegister, setStaffRegister] = useLocalState('abc-admin-staff-attendance')
  const [rawSettings, setSettings] = useLocalState('abc-admin-settings')
  const [rawDark, setDark] = useLocalState('abc-admin-dark')

  const students = Array.isArray(rawStudents) ? rawStudents : []
  const teachers = Array.isArray(rawTeachers) ? rawTeachers : []
  const staff = Array.isArray(rawStaff) ? rawStaff : []
  const classes = Array.isArray(rawClasses) ? rawClasses : []
  const subjects = Array.isArray(rawSubjects) ? rawSubjects : []
  const register = (rawRegister && typeof rawRegister === 'object') ? rawRegister : {}
  const staffRegister = (rawStaffRegister && typeof rawStaffRegister === 'object') ? rawStaffRegister : {}
  const settings = (rawSettings && typeof rawSettings === 'object') ? rawSettings : {}
  const dark = Boolean(rawDark)

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(page==='students'&&requestedClassId?requestedClassId:'All')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')
  const [notice, setNotice] = useState(false)
  const [financeNotices,setFinanceNotices]=useState([])
  const [date, setDate] = useState(today)

  useEffect(() => { setSearch(''); setFilter(page==='students'&&requestedClassId?requestedClassId:'All'); setOpen(false); setModal(null); setDate(today) }, [page,requestedClassId])
  useEffect(()=>{api('/admin/notifications').then(setFinanceNotices).catch(()=>setFinanceNotices([]))},[])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4000); return () => clearTimeout(timer) }, [toast])
  useEffect(() => {
    if (!modal) return
    const previousFocus = document.activeElement as HTMLElement | null
    const dialog = document.querySelector<HTMLElement>('.ad-modal')
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKey = e => {
      if (e.key === 'Escape') { setModal(null); return }
      if (e.key !== 'Tab') return
      const controls = Array.from(dialog?.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea') || []).filter(el => !(el as HTMLButtonElement).disabled)
      const first = controls[0], last = controls[controls.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = previousOverflow; previousFocus?.focus() }
  }, [modal?.type])

  const title = menus.find(x => x[2] === page)?.[0]
  if (!title) return <Navigate to={base} replace />
  const pageIcon = menus.find(x => x[2] === page)?.[1] || 'LayoutDashboard'
  const pageDescriptions = { students: 'Every little learner, all in one place.', teachers: 'Manage teachers, contracts, subjects and assignments.', staff: 'A great school starts with a great team.', classes: 'Register each classroom and its learning space.', attendance: 'Track staff and student attendance with a clear daily view.', exams:'Set up exam rules, collect marks and publish trusted results.', reports: 'A clear picture of your school’s progress.', settings: 'Make the workspace feel like your school.' }
  const pageRecordCount = ({students:students.length,teachers:teachers.length,staff:staff.length,classes:classes.length,attendance:students.length+staff.length,exams:classes.length,reports:students.length,settings:1})[page] ?? students.length

  const statusFor = student => {
    if (!student || !student.id) return 'Unmarked';
    return register[date]?.[student.id] || (date === today ? (student.status || 'Unmarked') : 'Unmarked');
  }

  const present = students.filter(s => s && statusFor(s) === 'Present').length
  const absent = students.filter(s => s && statusFor(s) === 'Absent').length

  const filtered = list => {
    const safeList = Array.isArray(list) ? list : []
    return safeList.filter(s => {
      if (!s) return false
      const matchesGroup = filter === 'All' || (page === 'staff' ? s.role === filter : s.classId === filter || (!s.classId&&s.group === filter))
      const searchTarget = `${s.name || ''} ${s.loginId || ''} ${s.id || ''} ${s.email || ''} ${s.guardian || ''} ${s.role || ''} ${s.phone || ''} ${s.location || ''}`.toLowerCase()
      return matchesGroup && searchTarget.includes((search || '').toLowerCase())
    })
  }

  const directory = page === 'students' ? students : page === 'teachers' ? teachers : staff
  const classOptions = classes
    .map(classroom => ({
      key: classroom?.id || classroom?.name || classroom?.group,
      id: classroom?.id || null,
      value: classroom?.name || classroom?.group || '',
      level: classroom?.level || classroom?.group || '',
      section: classroom?.section || '',
      label: `${classroom?.name || classroom?.group || 'Unnamed class'}${classroom?.section ? ` · Section ${classroom.section}` : ''}${classroom?.level || classroom?.group ? ` — ${classroom.level || classroom.group}` : ''}`
    }))
    .filter(classroom => classroom.value)
  const classForStudent = student => classOptions.find(option=>option.id===student?.classId)

  const savePerson = async input => {
    input?.preventDefault?.()
    const form = input?.currentTarget ? Object.fromEntries(new FormData(input.currentTarget)) : input
    const editing=Boolean(modal?.item)
    setModal(old=>({...old,saving:true,error:''}))
    try {
      let item
      if(page==='students') {
        const saved=editing?await updateStudent(modal.item.id,{...form,status:modal.item.status||'Present'}):await createStudent({...form,status:'Present'})
        item={...modal.item,...form,id:saved.id,loginId:saved.loginId??modal.item?.loginId,temporaryPassword:saved.temporaryPassword,status:saved.status||modal.item?.status||'Present'}
      } else {
        const role=form.role||modal.item?.role||'manager'
        const employmentType=form.employmentType||'salary'
        const details={phone:form.phone,location:form.location,employmentType,monthlySalary:employmentType==='salary'?Number(form.monthlySalary):0,internshipMonths:employmentType==='internship'?Number(form.internshipMonths):0}
        const payload={fullName:form.name,email:form.email||null,role,status:form.status||'Active',details}
        const account=editing&&modal.item.loginId?await updateUser(modal.item.id,payload):await createUser(payload)
        item={...modal.item,...form,...details,id:account.id,loginId:account.loginId??modal.item?.loginId,temporaryPassword:account.temporaryPassword,role:account.role,status:form.status||'Active'}
      }
      await workspace.refresh()
      setModal(null)
      setToast(editing?`${page==='students'?'Student':'Staff member'} saved`:`Account created · Login ID: ${page==='staff'?formatStaffId(item.role,item.loginId):item.loginId} · Temporary password: ${item.temporaryPassword}`)
    } catch(reason) {setModal(old=>({...old,saving:false,error:reason.message}))}
  }

  const saveTeacher = async e => {
    e.preventDefault()
    const formData=new FormData(e.currentTarget),form=Object.fromEntries(formData),editing=Boolean(modal?.item),oldId=modal?.item?.id
    setModal(old=>({...old,saving:true,error:''}))
    try {
      const fullName=`${form.firstName||''} ${form.lastName||''}`.trim(),subjectIds=formData.getAll('subjectIds'),classIds=formData.getAll('classIds')
      const details={firstName:form.firstName,lastName:form.lastName,photoName:form.photoName||'',phone:form.phone,location:form.location,gender:form.gender,dateOfBirth:form.dateOfBirth,joiningDate:form.joiningDate,qualification:form.qualification,subjectIds,classIds,employmentType:form.employmentType,monthlySalary:form.employmentType==='salary'?Number(form.monthlySalary):0,internshipMonths:form.employmentType==='internship'?Number(form.internshipMonths):0}
      const payload={fullName,email:form.email,role:'teacher',status:form.status||'Active',details}
      const account=editing&&modal.item.loginId?await updateUser(modal.item.id,payload):await createUser(payload)
      const item={...modal.item,...form,...details,name:fullName,id:account.id,loginId:account.loginId??modal.item?.loginId,temporaryPassword:account.temporaryPassword,status:form.status||'Active'}
      await workspace.refresh()
      await setSubjects(old=>(Array.isArray(old)?old:[]).map(subject=>{const ids=(subject.teacherIds||[]).filter(id=>id!==oldId&&id!==item.id);return {...subject,teacherIds:subjectIds.includes(subject.id)?[...ids,item.id]:ids}}))
      setModal(null)
      setToast(editing&&modal.item.loginId?'Teacher saved':`Teacher account created · Login ID: ${item.loginId} · Temporary password: ${item.temporaryPassword}`)
    } catch(reason) {setModal(old=>({...old,saving:false,error:reason.message}))}
  }

  const saveSubject = async e => {
    e.preventDefault()
    const data=new FormData(e.currentTarget),name=String(data.get('name')||'').trim(),editing=Boolean(modal?.item)
    if(!name){setModal(old=>({...old,error:'Enter a subject name.'}));return}
    if(subjects.some(subject=>subject.id!==modal.item?.id&&String(subject.name||'').trim().toLowerCase()===name.toLowerCase())){
      setModal(old=>({...old,error:'A subject with this name already exists.'}));return
    }
    const item={...modal.item,id:modal.item?.id||nextId('SUB',subjects),name,teacherIds:data.getAll('teacherIds')}
    setModal(old=>({...old,saving:true,error:''}))
    try {
      await setSubjects(old=>{const list=Array.isArray(old)?old:[];return editing?list.map(subject=>subject.id===item.id?item:subject):[...list,item]})
      setModal(null)
      setToast(editing?'Subject updated':'Subject created')
    } catch(reason) {
      setModal(old=>({...old,saving:false,error:reason.message||'Subject could not be saved.'}))
    }
  }

  const saveClass = async e => {
    e.preventDefault()
    const form=Object.fromEntries(new FormData(e.currentTarget)),editing=Boolean(modal?.item)
    setModal(old=>({...old,saving:true,error:''}))
    try {
      // The class editor intentionally owns only classroom identity. Legacy
      // progression/course values are preserved during the compatibility
      // window and are edited from Exam Settings instead of this form.
      const payload=buildClassPayload(form,editing?modal.item:null)
      const canUpdate=editing&&modal.item.schoolId&&modal.item.id
      const saved=canUpdate?await updateClass(modal.item.id,payload):await createClass(payload)
      const item={...modal.item,...saved.details,...saved,id:saved.id,loginId:saved.loginId||modal.item?.loginId,name:saved.name||form.name,...payload,group:payload.level}
      await workspace.refresh()
      setModal(null)
      setToast(editing?'Class saved':'Class created')
    } catch(reason) {setModal(old=>({...old,saving:false,error:reason.message}))}
  }

  const exportPeople = () => {
    const list = filtered(directory)
    downloadCSV(`${page}.csv`, page==='staff' ? [
      ['ID','Name','Role','Phone','Location','Contract','Status'],
      ...list.map(x=>[formatStaffId(x.role,x.loginId)||x.id,x.name,staffRoleLabel(x.role),x.phone,x.location,x.employmentType==='internship'?`Internship · ${x.internshipMonths} months`:`Salary · ${x.monthlySalary||0}`,x.status])
    ] : [
      ['ID', 'Name', 'Class', 'Parent / Guardian', 'Email', 'Status'],
      ...list.map(x => [x.loginId||x.id, x.name, x.group, x.guardian, x.email, statusFor(x)])
    ])
    setToast('Directory exported')
  }

  const mark = (id, status) => setRegister(old => ({
    ...(old || {}),
    [date]: { ...((old && old[date]) || {}), [id]: status }
  }))

  const overviewMetrics = [
    ['Total Students', students.length, 'Enrolled at ABC', 'UsersRound', 'blue'],
    ['Present Today', present, `${students.length ? Math.round(present / students.length * 100) : 0}% attendance`, 'UserCheck', 'green'],
    ['Absent Today', absent, 'Daily attendance', 'UserX', 'pink'],
    ['Teachers', teachers.length, 'A caring team', 'GraduationCap', 'purple'],
    ['Active Classes', classes.length, 'Learning together', 'School', 'orange']
  ]

  const attendanceRate = students.length ? Math.round(present / students.length * 100) : 0
  const attendanceTrend = Array.from({length: 7}, (_, index) => {
    const day = new Date()
    day.setDate(day.getDate() - (6 - index))
    const key = new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Mogadishu',year:'numeric',month:'2-digit',day:'2-digit'}).format(day)
    const statuses = students.map(student => register[key]?.[student.id] || (key === today ? student.status : 'Unmarked'))
    const marked = statuses.filter(status => status === 'Present' || status === 'Absent')
    const attended = marked.filter(status => status === 'Present').length
    return {
      key,
      label: new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Mogadishu',weekday:'short'}).format(day).slice(0,2),
      rate: marked.length ? Math.round(attended / marked.length * 100) : 0
    }
  })

  const adminName = (typeof settings.name === 'string' && settings.name.trim() ? settings.name.trim() : 'Administrator')

  return (
    <div className={`admin-app ${dark ? 'ad-dark' : ''}`}>
      {open && <button className="ad-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <aside className={`ad-sidebar ${open ? 'is-open' : ''}`}>
        <Link className="ad-brand" to={base}>
          <Icon name="Baby" size={36} />
          <div><strong><b>A</b><b>B</b><b>C</b></strong><span>Daycare & Kindergarten</span></div>
        </Link>
        <button className="ad-mobile-close" aria-label="Close menu" onClick={() => setOpen(false)}><Icon name="X" /></button>
        <nav aria-label="Admin navigation">
          {menus.map(([label, icon, slug]) => (
            <Link key={label} to={`${base}/${slug}`} className={page === slug ? 'active' : ''} aria-current={page === slug ? 'page' : undefined}>
              <span><Icon name={icon} size={20} /></span>{label}
            </Link>
          ))}
        </nav>
        <div className="ad-sidebar-art">
          <span>Happy Children<br />Bright Future</span>
          <img src="/gallery/playground.png" alt="A colorful children's playground" />
          <small>Little moments. Big possibilities.</small>
        </div>
        <Link className="ad-signout" to="/"><Icon name="LogOut" size={16} />Back to website</Link>
      </aside>
      <main className="ad-main">
        <header className="ad-topbar">
          <button className="ad-menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}><Icon name="Menu" /></button>
          <label className="ad-global-search">
            <Icon name="Search" size={19} />
            <input aria-label="Search this page" placeholder={`Search ${page || 'students, teachers, or anything'}…`} value={search} onChange={e => setSearch(e.target.value)} />
          </label>
          <div className="ad-top-actions">
            <div className="ad-notification-wrap">
              <button className="ad-notification" aria-label="Notifications" aria-expanded={notice} onClick={() => setNotice(!notice)}>
                <Icon name="Bell" size={22} />{financeNotices.length>0&&<b>{Math.min(financeNotices.length,99)}</b>}
              </button>
              {notice && (
                <div className="ad-notifications">
                  <strong>School updates</strong>
                  {financeNotices.length?financeNotices.slice(0,6).map(item=><p key={item.id}><b>{item.actorName||'Accountant'}</b> {item.action.includes('onboarding')?'completed or updated finance onboarding':item.action.includes('fee-plan')?'changed a student fee plan':'updated finance settings'}.</p>):<p>No new finance setup changes.</p>}
                  <Link to={`${base}/reports`} onClick={() => setNotice(false)}>View school reports →</Link>
                </div>
              )}
            </div>
            <button className="ad-theme" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setDark(!dark)}>
              <Icon name="Sun" size={20} /><Icon name="Moon" size={18} />
            </button>
            <Link className="ad-profile" to={`${base}/settings`}>
              <Avatar name={adminName} />
              <span><strong>{adminName}</strong><small>Administrator</small></span>
              <Icon name="ChevronDown" size={15} />
            </Link>
          </div>
        </header>
        <div className="ad-content">
          <div className={`ad-page-heading ${page?'ad-page-heading-premium':'ad-dashboard-heading'}`}>
            <div className="ad-page-heading-main">
              <span className="ad-page-heading-icon"><Icon name={pageIcon} size={24}/></span>
              <div>
                <div className="ad-breadcrumb">ABC workspace <span>/</span> {title}</div>
                <h1>{page ? title : 'School Overview'} <span className="ad-heading-dot" /></h1>
                <p>{page ? pageDescriptions[page] : 'A little care, a lot of possibility. Here’s how your school is doing.'}</p>
              </div>
            </div>
            <div className="ad-page-heading-meta"><span><Icon name="Database" size={14}/><b>{pageRecordCount}</b> records</span><span><Icon name="CalendarDays" size={14}/>{displayDate}</span></div>
          </div>
          {!page && (
            <div className="ad-dashboard-overview">
              <section className="ad-hero">
                <div className="ad-hero-copy">
                  <span className="ad-overline">A BRIGHTER DAY STARTS HERE</span>
                  <h2>Good Morning, {adminName.split(/\s+/)[0]}! <span>👋</span></h2>
                  <p>Creating a happy place to learn, grow and shine.</p>
                  <small>“Small steps every day lead to big dreams.”</small>
                  <Link to={`${base}/classes`}>Explore your classes <Icon name="ArrowRight" size={15} /></Link>
                </div>
                <div className="ad-hero-photo"><img src="/gallery/story.png" alt="Children's story time learning space" /></div>
                <div className="ad-hero-summary">
                  <div>
                    <span className="ad-icon blue"><Icon name="CalendarDays" /></span>
                    <p><strong>{displayDate}</strong><small>{new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Mogadishu', weekday: 'long' }).format(new Date())}</small></p>
                  </div>
                  <div>
                    <span className="ad-icon purple"><Icon name="School" /></span>
                    <p><strong>{classes.length} Learning Spaces</strong><small>A new day of discovery</small></p>
                  </div>
                  <Link to={`${base}/attendance`}>View attendance <Icon name="ArrowRight" size={14} /></Link>
                </div>
              </section>
              <Metrics items={overviewMetrics} />

              <div className="ad-dashboard-insights">
                <section className="ad-panel ad-dashboard-attendance">
                  <div className="ad-panel-head">
                    <h2><span className="ad-icon green"><Icon name="ChartNoAxesCombined" /></span>Attendance Overview</h2>
                    <Link to={`${base}/attendance`}>Open register <Icon name="ArrowRight" size={13}/></Link>
                  </div>
                  <div className="ad-dashboard-attendance-body">
                    <div className="ad-dashboard-ring" style={{'--attendance-rate':`${attendanceRate * 3.6}deg`} as React.CSSProperties}>
                      <div><strong>{attendanceRate}%</strong><small>today</small></div>
                    </div>
                    <div className="ad-dashboard-attendance-copy">
                      <span>Today's attendance</span>
                      <strong>{present} <small>of {students.length} students</small></strong>
                      <div><i className="present"/>Present <b>{present}</b><i className="absent"/>Absent <b>{absent}</b></div>
                    </div>
                    <div className="ad-dashboard-trend" aria-label="Seven day attendance chart">
                      {attendanceTrend.map(item=><div key={item.key}><span><i style={{height:`${Math.max(item.rate,7)}%`}}/></span><small>{item.label}</small></div>)}
                    </div>
                  </div>
                </section>

                <section className="ad-panel ad-dashboard-actions">
                  <div className="ad-panel-head"><h2><span className="ad-icon purple"><Icon name="Zap" /></span>Quick Actions</h2></div>
                  <div className="ad-quick">
                    {[
                      ['Take Attendance', 'Daily student register', 'CalendarCheck', 'attendance', 'blue'],
                      ['Add Student', 'Create a learner record', 'UserPlus', 'students', 'purple'],
                      ['View Teachers', 'Teaching team & subjects', 'GraduationCap', 'teachers', 'green'],
                      ['Manage Classes', 'Rooms and class groups', 'School', 'classes', 'orange'],
                      ['School Settings', 'Update your workspace', 'Settings', 'settings', 'pink'],
                      ['View Reports', 'School performance data', 'ChartNoAxesCombined', 'reports', 'purple']
                    ].map(([label, description, icon, path, tone]) => (
                      <Link key={path} to={`${base}/${path}`} className={tone}>
                        <span><Icon name={icon} size={19}/></span><div><strong>{label}</strong><small>{description}</small></div><Icon name="ChevronRight" size={15}/>
                      </Link>
                    ))}
                  </div>
                </section>
              </div>

              <div className="ad-overview-grid ad-dashboard-middle">
                <Panel title="Our Little Learners" icon="UsersRound" link="students" label="View all students">
                  <div className="ad-student-strip">
                    {filtered(students).slice(0, 6).map((s, i) => (
                      <button key={s.id || i} onClick={() => setModal({ type: 'profile', item: s })}>
                        <Avatar name={s.name} index={i} large />
                        <strong>{s.name}</strong>
                        <Badge>{statusFor(s)}</Badge>
                      </button>
                    ))}
                    {!filtered(students).length && <p className="ad-empty">No students match your search.</p>}
                  </div>
                </Panel>
                <Panel title="Today's Schedule" icon="CalendarDays" link="classes" label="View classes">
                  <div className="ad-schedule">
                    {schedule.map(([start, end, label, group, icon, tone]) => (
                      <Link key={label} to={`${base}/classes`}>
                        <span className={`ad-icon ${tone}`}><Icon name={icon} size={16} /></span>
                        <small>{start} – {end}</small>
                        <div><strong>{label}</strong><span>{group}</span></div>
                        <Icon name="ChevronRight" size={15} />
                      </Link>
                    ))}
                  </div>
                </Panel>
              </div>
              <div className="ad-bottom-grid">
                <Panel title="Recent Activities" icon="Zap" link="reports">
                  <div className="ad-activities">
                    {activity.map(([icon, label, desc, tone], i) => (
                      <div key={label}>
                        <span className={`ad-icon ${tone}`}><Icon name={icon} /></span>
                        <div><strong>{label}</strong><small>{desc}</small></div>
                        <time>{i + 2}h ago</time>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel title="Class Enrollment" icon="School" link="reports" label="View details">
                  <div className="ad-bar-chart">
                    {classes.map((c, i) => {
                      if (!c) return null;
                      const count = students.filter(s => s && s.group === c.group).length;
                      const cap = Number(c.capacity) || 20;
                      const heightPercent = cap > 0 ? Math.max(15, Math.min(100, Math.round((count / cap) * 100))) : 15;
                      return (
                        <div key={c.id || i}>
                          <strong>{count} / {cap}</strong>
                          <div className={`ad-bar av-${i % 6}`} style={{ height: `${heightPercent}%` }} />
                          <small>{c.group || c.name || 'Class'}</small>
                        </div>
                      );
                    })}
                  </div>
                  <p className="ad-chart-note">Enrolled students / class capacity</p>
                </Panel>
                <Panel title="School Reminders" icon="CalendarDays" link="classes">
                  <div className="ad-reminders">
                    {[
                      ['06', 'Classroom planning', 'Prepare the week ahead', 'Planning'],
                      ['12', 'Parent check-ins', 'Connect with every family', 'Community'],
                      ['18', 'Family Fun Day', 'A day to play and celebrate', 'Event']
                    ].map(([day, label, desc, tag]) => (
                      <div key={day}>
                        <span><small>OCT</small>{day}</span>
                        <div><strong>{label}</strong><small>{desc}</small></div>
                        <b>{tag}</b>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}
          {['students', 'staff'].includes(page) && (
            <>
              <Metrics items={page === 'students' ? [
                ['Total Students', students.length, 'Growing together', 'UsersRound', 'blue'],
                ['Present Today', present, 'Checked in today', 'UserCheck', 'green'],
                ['Class Groups', classes.length, 'Spaces to explore', 'School', 'purple'],
                ['Absent Today', absent, 'Follow up with families', 'UserX', 'pink']
              ] : [
                ['Team Members', directory.length, 'Part of the ABC family', 'UsersRound', 'blue'],
                ['Active', directory.filter(x => x?.status === 'Active').length, 'Ready to make a difference', 'CheckCheck', 'green'],
                ['On Leave', directory.filter(x => x?.status === 'On leave').length, 'Taking a well-earned break', 'CalendarDays', 'orange'],
                ['Roles', new Set(directory.map(x => x?.role).filter(Boolean)).size, 'Working together', 'School', 'purple']
              ]} />
              <section className="ad-panel ad-directory">
                <div className="ad-toolbar">
                  <div>
                    <h2>{title} Directory</h2>
                    <small>{filtered(directory).length} {page} · School records</small>
                  </div>
                  <div className="ad-toolbar-actions">
                    <button className="ad-button secondary" onClick={exportPeople}><Icon name="Download" size={16} /> Export</button>
                    <button className="ad-button" onClick={() => setModal(page==='staff'?{type:'staff',staffRole:'manager',employmentType:'salary'}:{type:'person'})}><Icon name="Plus" size={17} /> Add {page === 'students' ? 'Student' : page === 'teachers' ? 'Teacher' : 'Staff'}</button>
                  </div>
                </div>
                <div className="ad-filters">
                  <label>
                    <Icon name="Search" size={17} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${page}…`} aria-label={`Search ${page}`} />
                  </label>
                  <select aria-label={page==='staff'?'Filter by role':'Filter by class'} value={filter} onChange={e => setFilter(e.target.value)}>
                    <option value="All">All {page === 'staff' ? 'roles' : 'classes'}</option>
                    {page==='staff' ? staffRoles.map(([value,label])=><option key={value} value={value}>{label}</option>) : classOptions.map(classroom => <option key={classroom.id} value={classroom.id}>{classroom.label}</option>)}
                  </select>
                </div>
                <div className="ad-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{page === 'students' ? 'Student' : 'Team member'}</th>
                        <th>{page === 'staff' ? 'Role' : 'Class'}</th>
                        <th>{page === 'staff' ? 'Phone & location' : 'Parent / Guardian'}</th>
                        <th>{page === 'staff' ? 'Contract' : 'Email'}</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered(directory).map((p, i) => (
                        <tr key={p.id || i}>
                          <td>
                            <div className="ad-person">
                              <Avatar name={p.name} index={i} />
                              <div><strong>{p.name || 'Unnamed'}</strong><small>{page==='staff'?formatStaffId(p.role,p.loginId):p.loginId || p.id || ''}</small></div>
                            </div>
                          </td>
                          <td><span className="ad-class-tag">{page==='staff'?staffRoleLabel(p.role):(classForStudent(p)?.label || p.group || 'Unassigned')}</span></td>
                          <td>{page==='staff'?<><strong>{p.phone||'N/A'}</strong><br/><small>{p.location||'N/A'}</small></>:p.guardian || 'N/A'}</td>
                          <td>{page==='staff'?(p.employmentType==='internship'?`Internship · ${p.internshipMonths||0} months`:`Monthly · ${p.monthlySalary||0}`):p.email || 'N/A'}</td>
                          <td><Badge>{page === 'students' ? statusFor(p) : (p.status || 'Active')}</Badge></td>
                          <td>
                            {page==='students'&&!p.classId&&<button className="ad-edit" aria-label={`Assign class to ${p.name}`} onClick={() => setModal({type:'person',item:p,assignClass:true})}>
                              <Icon name="School" size={15}/> Assign class
                            </button>}
                            <button className="ad-edit" aria-label={`Edit ${p.name}`} onClick={() => setModal({ type: page==='staff'?'staff':'person', item: p, staffRole:p.role, employmentType:p.employmentType||'salary' })}>
                              <Icon name="Pencil" size={15} /> Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filtered(directory).length && (
                    <div className="ad-empty">
                      <Icon name="Search" size={28} />
                      <strong>No matching {page}</strong>
                      <span>Try another name or choose a different {page==='staff'?'role':'group'}.</span>
                    </div>
                  )}
                </div>
                <div className="ad-table-footer">
                  Showing {filtered(directory).length} of {directory.length} {page}
                  <span>All records shown</span>
                </div>
              </section>
            </>
          )}
          {page === 'teachers' && <AdminTeachersSubjectsSection Metrics={Metrics} teachers={teachers} subjects={subjects} search={search} setModal={setModal} Avatar={Avatar}/>} 
          {page === 'classes' && <AdminClassesSection1 Metrics={Metrics} classes={classes} students={students} setModal={setModal} search={search} base={base} />}
          {page === 'attendance' && <AdminAttendanceSection2 Metrics={Metrics} students={students} staff={staff} statusFor={statusFor} date={date} setDate={setDate} downloadCSV={downloadCSV} setToast={setToast} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} setRegister={setRegister} staffRegister={staffRegister} setStaffRegister={setStaffRegister} Avatar={Avatar} Badge={Badge} mark={mark} />}
          {page === 'exams' && <AdminExamsSection Metrics={Metrics} classes={classes} subjects={subjects} teachers={teachers} students={students} setToast={setToast}/>} 
          {page === 'reports' && <AdminReportsSection3 Metrics={Metrics} overviewMetrics={overviewMetrics} search={search} displayDate={displayDate} classes={classes} students={students} date={date} statusFor={statusFor} teachers={teachers} staff={staff} downloadCSV={downloadCSV} setToast={setToast} Panel={Panel} present={present} Badge={Badge} absent={absent} />}
          {page === 'settings' && <AdminSettingsSection4 setSettings={setSettings} setToast={setToast} settings={settings} setDark={setDark} dark={dark} />}
          <footer className="ad-footer">
            <span>© {new Date().getFullYear()} ABC Daycare & Kindergarten</span>
            <span>Happy children. Bright futures. <Icon name="Heart" size={12} /></span>
          </footer>
        </div>
      </main>
      {toast && (
        <div className="ad-toast" role="status">
          <Icon name="CircleCheck" size={20} />{toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}><Icon name="X" size={16} /></button>
        </div>
      )}
      {modal && (
        <div className="ad-modal-overlay" onClick={() => setModal(null)}>
          <section className={`ad-modal ${modal.type==='person'&&page==='students'?'ad-student-modal':modal.type==='teacher'?'ad-teacher-modal':modal.type==='class'?'ad-class-modal':modal.type==='staff'?'ad-staff-modal':modal.type==='subject'?'ad-subject-modal':''}`} role="dialog" aria-modal="true" aria-labelledby="ad-modal-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') setModal(null) }}>
            <div className="ad-modal-head">
              <div><h2 id="ad-modal-title">{modal.type === 'profile' ? 'Student Details' : modal.type === 'class' ? `${modal.item ? 'Edit' : 'Create'} Class` : modal.type === 'teacher' ? `${modal.item?'Edit':'Add'} Teacher` : modal.type === 'subject' ? `${modal.item?'Edit':'Add'} Subject` : modal.type==='person'&&page==='students' ? modal.assignClass?'Assign Class':`${modal.item?'Edit':'Register New'} Student` : `${modal.item ? 'Edit' : 'Add'} Staff Member`}</h2>{modal.type==='person'&&page==='students'?<p>{modal.assignClass?'Choose the student’s class and section, then review and save.':'Complete the enrollment steps and review the student record.'}</p>:modal.type==='teacher'?<p>Profile, academic assignment and contract information.</p>:modal.type==='class'?<p>Set the class identity, education level, section, academic year, room and capacity.</p>:modal.type==='staff'?<p>Create the staff account, role and employment contract.</p>:null}</div>
              <button autoFocus aria-label="Close dialog" onClick={() => setModal(null)}><Icon name="X" size={20} /></button>
            </div>
            {modal.type === 'profile' ? (
              <div className="ad-profile-details">
                <Avatar name={modal.item?.name} large />
                <h3>{modal.item?.name}</h3>
                <Badge>{statusFor(modal.item)}</Badge>
                <dl>
                  <dt>Class</dt><dd>{modal.item?.group || 'Unassigned'}</dd>
                  <dt>Parent / Guardian</dt><dd>{modal.item?.guardian || 'N/A'}</dd>
                  <dt>Contact</dt><dd>{modal.item?.email || 'N/A'}</dd>
                </dl>
                <Link className="ad-button" to={`${base}/students`} onClick={() => setModal(null)}>Open student directory</Link>
              </div>
            ) : modal.type === 'class' ? (
              <form className="ad-class-form" onSubmit={saveClass}>
                <div className="ad-crud-grid">
                  <label>Class name *<input name="name" required defaultValue={modal.item?.name} placeholder="e.g. Grade 7A" /></label>
                  <label>Education level *<select name="level" required defaultValue={modal.item?.level||modal.item?.group||'Lower'}><option value="Lower">Lower (Hoose)</option><option value="Middle">Middle (Dhexe)</option><option value="Upper">Upper (Sare)</option></select></label>
                  <label>Section<input name="section" defaultValue={modal.item?.section} placeholder="e.g. A"/></label>
                  <label>Academic year<input name="academicYear" required defaultValue={modal.item?.academicYear||`${new Date().getFullYear()}–${new Date().getFullYear()+1}`}/></label>
                  <label>Room<input name="room" defaultValue={modal.item?.room} placeholder="e.g. 201"/></label>
                  <label>Capacity<input name="capacity" type="number" min="1" max="1000" required defaultValue={modal.item?.capacity||32}/></label>
                </div>
                {modal.error&&<p className="ad-form-error" role="alert">{modal.error}</p>}
                <footer className="ad-crud-actions"><button type="button" className="ad-glass-button" onClick={()=>setModal(null)}>Cancel</button><button className="ad-button" disabled={modal.saving}><Icon name="School"/>{modal.saving?'Saving class…':modal.item?'Save Class':'Create Class'}</button></footer>
              </form>
            ) : modal.type === 'teacher' ? (
              <form className="ad-teacher-form" onSubmit={saveTeacher}>
                <label className="ad-teacher-photo"><span><Icon name="Image"/></span><input type="file" accept="image/png,image/jpeg" onChange={event=>setModal(old=>({...old,teacherPhoto:event.target.files?.[0]?.name||''}))}/><input type="hidden" name="photoName" value={modal.teacherPhoto||modal.item?.photoName||''}/><em><Icon name="Upload"/> Upload profile photo</em><small>{modal.teacherPhoto||modal.item?.photoName||'Optional · PNG or JPG'}</small></label>
                <div className="ad-crud-grid">
                  <label>First name *<input name="firstName" required defaultValue={modal.item?.firstName||nameParts(modal.item?.name).firstName}/></label>
                  <label>Last name *<input name="lastName" required defaultValue={modal.item?.lastName||nameParts(modal.item?.name).lastName}/></label>
                  <label>Employee ID<input readOnly value={modal.item?.loginId||'100–999 · Auto generated'}/></label>
                  <label>Email *<input name="email" type="email" required defaultValue={modal.item?.email}/></label>
                  <label>Phone *<input name="phone" type="tel" required defaultValue={modal.item?.phone}/></label>
                  <label>Gender<select name="gender" defaultValue={modal.item?.gender||''}><option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option></select></label>
                  <label>Date of birth<input name="dateOfBirth" type="date" defaultValue={modal.item?.dateOfBirth}/></label>
                  <label>Joining date<input name="joiningDate" type="date" defaultValue={modal.item?.joiningDate||today}/></label>
                  <label className="wide">Address *<input name="location" required defaultValue={modal.item?.location}/></label>
                  <label>Subjects<select name="subjectIds" multiple defaultValue={subjects.filter(subject=>(subject.teacherIds||[]).includes(modal.item?.id)).map(subject=>subject.id)}>{subjects.map(subject=><option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
                  <label>Classes<select name="classIds" multiple defaultValue={modal.item?.classIds||[]}>{classes.map(classroom=><option key={classroom.id} value={classroom.id}>{classroom.name}{classroom.section?` · ${classroom.section}`:''}</option>)}</select></label>
                  <label>Qualification<input name="qualification" defaultValue={modal.item?.qualification} placeholder="e.g. B.Ed Mathematics"/></label>
                  <label>Status<select name="status" defaultValue={modal.item?.status||'Active'}><option>Active</option><option>Inactive</option></select></label>
                  <label>Contract type<select name="employmentType" value={modal.employmentType||modal.item?.employmentType||'salary'} onChange={e=>setModal(old=>({...old,employmentType:e.target.value}))}><option value="salary">Monthly salary</option><option value="internship">Internship</option></select></label>
                  {(modal.employmentType||modal.item?.employmentType||'salary')==='salary'?<label>Monthly salary<input name="monthlySalary" type="number" min="0" required defaultValue={modal.item?.monthlySalary}/></label>:<label>Internship duration<input name="internshipMonths" type="number" min="1" max="60" required defaultValue={modal.item?.internshipMonths||3}/></label>}
                </div>
                {modal.error&&<p className="ad-form-error" role="alert">{modal.error}</p>}
                <footer className="ad-crud-actions"><button type="button" className="ad-glass-button" onClick={()=>setModal(null)}>Cancel</button><button className="ad-button" disabled={modal.saving}><Icon name="Save"/>{modal.saving?'Saving teacher…':'Save Teacher'}</button></footer>
              </form>
            ) : modal.type === 'subject' ? (
              <form className="ad-subject-form" onSubmit={saveSubject}>
                <p className="ad-auto-id"><Icon name="BadgeCheck" size={17}/> Subject ID: <strong>{modal.item?.id||'Created automatically'}</strong></p>
                <label>Subject name<input name="name" required autoFocus defaultValue={modal.item?.name} placeholder="e.g. Mathematics"/></label>
                <fieldset className="ad-check-list"><legend>Assign teachers</legend>{teachers.map(teacher=><label key={teacher.id}><input type="checkbox" name="teacherIds" value={teacher.id} defaultChecked={(modal.item?.teacherIds||[]).includes(teacher.id)}/><Avatar name={teacher.name}/><span><strong>{teacher.name}</strong><small>{teacher.email}</small></span></label>)}{!teachers.length&&<p>Add a teacher before assigning this subject.</p>}</fieldset>
                {modal.error&&<p className="ad-form-error" role="alert">{modal.error}</p>}
                <footer className="ad-crud-actions"><button type="button" className="ad-glass-button" onClick={()=>setModal(null)}>Cancel</button><button className="ad-button" disabled={modal.saving}><Icon name="Save"/>{modal.saving?'Saving subject…':modal.item?'Update Subject':'Create Subject'}</button></footer>
              </form>
            ) : modal.type==='person'&&page==='students' ? (
              <AdminStudentWizard item={modal.item} classOptions={classOptions} accounts={linkAccounts} saving={modal.saving} error={modal.error} initialStep={modal.assignClass?1:0} onCancel={()=>setModal(null)} onSave={savePerson}/>
            ) : (
              <form className={page==='staff'?'ad-staff-form':''} onSubmit={savePerson}>
                <p className="ad-auto-id"><Icon name="BadgeCheck" size={17}/> {page==='students'?'Student':'Staff'} Login ID: <strong>{page==='students'?(modal.item?.loginId||'1000+ · Created automatically'):(modal.item?.loginId?formatStaffId(modal.item.role,modal.item.loginId):`${staffIdRange(modal.staffRole||'manager')} · Created automatically`)}</strong></p>
                {page === 'staff' ? (
                  <>
                    <div className="ad-staff-identity"><span><Icon name="ContactRound"/></span><div><b>Staff profile</b><small>The login ID and default password are created automatically.</small></div></div>
                    <div className="ad-crud-grid">
                      <label className="wide">Full name *<input name="name" required autoFocus defaultValue={modal.item?.name} placeholder="Enter staff member name"/></label>
                      <label>Phone<input name="phone" type="tel" required defaultValue={modal.item?.phone}/></label>
                      <label>Location<input name="location" required defaultValue={modal.item?.location}/></label>
                      <label>Role *<select name="role" required disabled={Boolean(modal.item)} value={modal.item?.role||modal.staffRole||'manager'} onChange={e=>setModal(old=>({...old,staffRole:e.target.value}))}>
                        {staffRoles.map(([value,label])=><option key={value} value={value}>{label}</option>)}
                      </select></label>
                      <label>Email (optional)<input name="email" type="email" defaultValue={modal.item?.email}/></label>
                      <label>Status<select name="status" defaultValue={modal.item?.status||'Active'}><option>Active</option><option>Inactive</option></select></label>
                      <label>Contract type<select name="employmentType" value={modal.employmentType||modal.item?.employmentType||'salary'} onChange={e=>setModal(old=>({...old,employmentType:e.target.value}))}>
                        <option value="salary">Monthly salary</option><option value="internship">Internship</option>
                      </select></label>
                    {(modal.employmentType||modal.item?.employmentType||'salary')==='salary'
                      ? <label>Monthly salary<input name="monthlySalary" type="number" min="0" required defaultValue={modal.item?.monthlySalary}/></label>
                      : <label>Internship duration (months)<input name="internshipMonths" type="number" min="1" max="60" required defaultValue={modal.item?.internshipMonths||3}/></label>}
                    </div>
                  </>
                ) : null}
                <p className="ad-local-note">School record · changes save to the database</p>
                {modal.error&&<p className="ad-form-error" role="alert">{modal.error}</p>}
                {page==='staff'?<footer className="ad-crud-actions"><button type="button" className="ad-glass-button" onClick={()=>setModal(null)}>Cancel</button><button className="ad-button" disabled={modal.saving}><Icon name="Save"/>{modal.saving?'Saving staff…':'Save Staff Member'}</button></footer>:<button className="ad-button" disabled={modal.saving}>{modal.saving?'Creating account…':'Save Student'}</button>}
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
