import {useWorkspace} from '../../../app/context/WorkspaceContext'
import TeachersMyClassSection1 from './TeachersMyClassSection1'
import TeachersStudentsSection2 from './TeachersStudentsSection2'
import TeachersAttendanceSection3 from './TeachersAttendanceSection3'
import TeachersLessonPlansSection4 from './TeachersLessonPlansSection4'
import TeachersAssessmentsSection5 from './TeachersAssessmentsSection5'
import TeachersMessagesSection6 from './TeachersMessagesSection6'
import TeachersReportsSection7 from './TeachersReportsSection7'
import TeachersSettingsSection8 from './TeachersSettingsSection8'
import TeachersExamsSection from './TeachersExamsSection'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import Icon from '../../../components/ui/Icon'
import useLocalState from '../../../hooks/useLocalState'
import { Avatar, Badge, Panel, Metrics, PerformanceChart, Empty, Modal, exportCsv } from '../../../components/ui/TeacherUI'
import { teacherBase as base, teacherMenu, subjects, dateKey, dateAfter, friendlyDate } from '../../../data/teacherData';
import '../../../styles/admin.css'
import '../../../styles/teacher.css'
import type { Activity, Assignment, AssessmentTab, Attendance, AttendanceStatus, Lesson, MessageThread, Scores, Student, TeacherModal, TeacherSettings, WorkspaceSetter } from '../types'

const descriptions: Record<string, string> = {
  'my-class':'A little community with a world of possibilities.',
  students:'Know every learner. Celebrate every little milestone.',
  attendance:'A warm welcome starts with knowing who is here.',
  'lesson-plans':'Thoughtful plans for curious little minds.',
  assessments:'Notice progress, celebrate growth, and guide the next step.',
  exams:'Enter, review and submit official examination marks.',
  messages:'Keep the conversation going with your classroom community.',
  reports:'Turn everyday learning into a clear picture of progress.',
  settings:'Your teaching workspace, just the way you like it.',
}
const aliases: Record<string, string> = { 'my-classes':'my-class', assignments:'assessments', grades:'assessments', resources:'lesson-plans', 'lesson-plan':'lesson-plans', assessment:'assessments', report:'reports', setting:'settings' }

export default function TeacherWorkspace() {
 const workspace=useWorkspace()
 const teacherSchedule=(Array.isArray(workspace?.content?.teacherSchedule)?workspace.content.teacherSchedule:[]) as [string,string,string,string,string][]

  const location = useLocation()
  const rawPage = location.pathname.slice(base.length).split('/').filter(Boolean)[0] || ''
  const page = aliases[rawPage] || rawPage
  const today = dateKey()
  const [rawStudents,setStudents] = useLocalState('abc-teacher-students') as [unknown, WorkspaceSetter<Student[]>]
  const [rawLessons,setLessons] = useLocalState('abc-teacher-lessons') as [unknown, WorkspaceSetter<Lesson[]>]
  const [rawAssignments,setAssignments] = useLocalState('abc-teacher-assignments') as [unknown, WorkspaceSetter<Assignment[]>]
  const [rawScores,setScores] = useLocalState('abc-teacher-scores') as [unknown, WorkspaceSetter<Scores>]
  const [rawAttendance,setAttendance] = useLocalState('abc-teacher-attendance') as [unknown, WorkspaceSetter<Attendance>]
  const [rawThreads,setThreads] = useLocalState('abc-teacher-messages') as [unknown, WorkspaceSetter<MessageThread[]>]
  const [rawActivity,setActivity] = useLocalState('abc-teacher-activity') as [unknown, WorkspaceSetter<Activity[]>]
  const [rawSettings,setSettings] = useLocalState('abc-teacher-settings') as [unknown, WorkspaceSetter<TeacherSettings>]
  const [rawDark,setDark] = useLocalState('abc-teacher-dark') as [unknown, WorkspaceSetter<boolean>]
  const students: Student[]=Array.isArray(rawStudents)?rawStudents as Student[]:[]
  const lessons: Lesson[]=Array.isArray(rawLessons)?rawLessons as Lesson[]:[]
  const assignments: Assignment[]=Array.isArray(rawAssignments)?rawAssignments as Assignment[]:[]
  const scores: Scores=rawScores&&typeof rawScores==='object'&&!Array.isArray(rawScores)?rawScores as Scores:{}
  const attendance: Attendance=rawAttendance&&typeof rawAttendance==='object'&&!Array.isArray(rawAttendance)?rawAttendance as Attendance:{}
  const threads: MessageThread[]=Array.isArray(rawThreads)?rawThreads as MessageThread[]:[]
  const activity: Activity[]=Array.isArray(rawActivity)?rawActivity as Activity[]:[]
  const settings: TeacherSettings=rawSettings&&typeof rawSettings==='object'&&!Array.isArray(rawSettings)?rawSettings as TeacherSettings:{name:'Teacher',email:'',className:'Unassigned class',room:'',bio:'',reminders:false,summary:false}
  const dark=Boolean(rawDark)
  const [open,setOpen] = useState(false)
  const [search,setSearch] = useState('')
  const [filter,setFilter] = useState('All')
  const [date,setDate] = useState(today)
  const [modal,setModal] = useState<TeacherModal | null>(null)
  const [toast,setToast] = useState('')
  const [notice,setNotice] = useState(false)
  const [assessmentTab,setAssessmentTab] = useState<AssessmentTab>(rawPage === 'assignments' || new URLSearchParams(location.search).get('view') === 'assignments' ? 'assignments' : 'progress')
  const [threadId,setThreadId] = useState<string | undefined>(threads[0]?.id)
  const [reply,setReply] = useState('')
  const [messageMobile,setMessageMobile] = useState(false)
  useEffect(() => {setSearch('');setFilter('All');setOpen(false);setModal(null);setDate(today);setNotice(false);setReply('')},[page])
  useEffect(() => {if (!toast) return; const timeout=setTimeout(()=>setToast(''),4000);return()=>clearTimeout(timeout)},[toast])
  useEffect(() => {if(page==='assessments')setAssessmentTab(rawPage==='assignments'||new URLSearchParams(location.search).get('view')==='assignments'?'assignments':'progress')},[rawPage,location.search])
  useEffect(() => {document.title=`${teacherMenu.find(x=>x[2]===page)?.[0] || 'Teacher'} · ABC Teacher Workspace`},[page])
  const title = teacherMenu.find(x=>x[2]===page)?.[0]
  if (!title) return <Navigate to={base} replace />
  const statusFor = (student: Student, day=today): AttendanceStatus => attendance[day]?.[student.id] || 'Unmarked'
  const present = students.filter(s=>statusFor(s)==='Present').length
  const absent = students.filter(s=>statusFor(s)==='Absent').length
  const unread = threads.filter(t=>t.unread).length
  const visibleStudents = students.filter(s => `${s.name} ${s.id} ${s.guardian}`.toLowerCase().includes(search.toLowerCase()))
  const visibleAttendance = visibleStudents.filter(s=>filter==='All'||statusFor(s,date)===filter)
  const visibleLessons = lessons.filter(l=>(filter==='All'||l.subject===filter)&&`${l.title} ${l.subject} ${l.objective}`.toLowerCase().includes(search.toLowerCase()))
  const visibleAssignments = assignments.filter(a=>(filter==='All'||a.subject===filter)&&`${a.title} ${a.subject}`.toLowerCase().includes(search.toLowerCase()))
  const currentThread = threads.find(t=>t.id===threadId)
  const studentAverage = (id: string) => {const values=Object.values(scores[id]||{});return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):0}
  const classAverage = students.length ? Math.round(students.reduce((n,s)=>n+studentAverage(s.id),0)/students.length) : 0
  const upcoming = [...assignments].filter(a=>a.status==='Open').sort((a,b)=>a.due.localeCompare(b.due))
  const addActivity = (title: string,description: string,icon='CircleCheck',tone='blue') => setActivity(old=>[{id:crypto.randomUUID(),title,description,icon,tone},...old].slice(0,12))
  const mark = (id: string,status: AttendanceStatus) => setAttendance(old=>({...old,[date]:{...old[date],[id]:status}}))
  const download = (kind: string) => {
    const rows = kind==='attendance' ? [['Date','Student ID','Student','Status'],...students.map(s=>[date,s.id,s.name,statusFor(s,date)])]
      : kind==='progress' ? [['Student ID','Student',...subjects,'Average'],...students.map(s=>[s.id,s.name,...subjects.map(subject=>scores[s.id]?.[subject]??''),studentAverage(s.id)])]
      : [['Title','Subject','Date','Duration (minutes)','Status'],...lessons.map(l=>[l.title,l.subject,l.date,l.duration,l.status])]
    exportCsv(`kg1-${kind}-${date}.csv`,rows)
    setToast('Report prepared for download')
  }
  const saveLesson = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data=Object.fromEntries(new FormData(event.currentTarget))
    const lesson={...data,duration:Number(data.duration),id:modal?.type==='lesson'&&modal.item?.id||crypto.randomUUID()} as unknown as Lesson
    setLessons(old=>modal?.type==='lesson'&&modal.item?old.map(l=>l.id===lesson.id?lesson:l):[...old,lesson])
    addActivity(modal?.type==='lesson'&&modal.item?'Lesson plan updated':'New lesson plan created',lesson.title,'BookOpen','blue')
    setModal(null);setToast('Lesson plan saved')
  }
  const saveAssignment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const item={...Object.fromEntries(new FormData(event.currentTarget)),id:modal?.type==='assignment'&&modal.item?.id||crypto.randomUUID()} as unknown as Assignment
    setAssignments(old=>modal?.type==='assignment'&&modal.item?old.map(a=>a.id===item.id?item:a):[...old,item])
    addActivity('Assignment saved',item.title,'ClipboardList','orange');setModal(null);setToast('Assignment saved')
  }
  const dashboardMetrics = [['Total Students',students.length,'in your class','UsersRound','blue'],['Present Today',present,`${Math.round(present/students.length*100)||0}% attendance`,'UserCheck','green'],['Absent Today',absent,`${Math.round(absent/students.length*100)||0}% absence`,'UserX','pink'],['Lesson Plans',lessons.length,'prepared with care','BookOpen','purple'],['Assignments',upcoming.length,'open activities','ClipboardList','orange']]
  const selectThread = (id: string) => {setThreadId(id);setReply('');setMessageMobile(true);setThreads(old=>old.map(t=>t.id===id?{...t,unread:false}:t))}
  const searchField = (placeholder: string) => <label><Icon name="Search" size={17}/><input aria-label={placeholder} placeholder={placeholder} value={search} onChange={e=>setSearch(e.target.value)}/></label>
  const subjectFilter = <select aria-label="Filter by subject" value={filter} onChange={e=>setFilter(e.target.value)}><option value="All">All subjects</option>{subjects.map(s=><option key={s}>{s}</option>)}</select>
  const scheduleContent = <div className="ad-schedule tc-schedule">{teacherSchedule.map(([time,label,description,icon,tone])=><div key={label}><span className={`ad-icon ${tone}`}><Icon name={icon} size={16}/></span><small>{time}</small><div><strong>{label}</strong><span>{description}</span></div></div>)}</div>
  return <div className={`admin-app teacher-app ${dark?'ad-dark':''}`}>
    {open&&<button className="ad-scrim" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
    <aside className={`ad-sidebar ${open?'is-open':''}`}>
      <Link className="ad-brand" to={base}><Icon name="Baby" size={36}/><div><strong><b>A</b><b>B</b><b>C</b></strong><span>Daycare & Kindergarten</span></div></Link>
      <button className="ad-mobile-close" aria-label="Close menu" onClick={()=>setOpen(false)}><Icon name="X"/></button>
      <nav aria-label="Teacher navigation">{teacherMenu.map(([label,icon,slug])=><Link key={slug} to={`${base}/${slug}`} className={page===slug?'active':''} aria-current={page===slug?'page':undefined}><span><Icon name={icon} size={20}/></span>{label}{slug==='messages'&&unread>0&&<b className="tc-unread">{unread}</b>}</Link>)}</nav>
      <div className="ad-sidebar-art tc-sidebar-art"><span>Happy Children<br/>Bright Future</span><div className="tc-play-art" aria-hidden="true"><span className="tc-sun">☀</span><span className="tc-flower">✿</span><span className="tc-kids">🧒🏽 👧🏽</span><span className="tc-grass"/></div><small>A little kindness goes a long way.</small></div>
      <Link className="ad-signout" to="/"><Icon name="LogOut" size={16}/>Back to website</Link>
    </aside>
    <main className="ad-main">
      <header className="ad-topbar"><button className="ad-menu-btn" aria-label="Open menu" onClick={()=>setOpen(true)}><Icon name="Menu"/></button><label className="ad-global-search"><Icon name="Search" size={19}/><input aria-label="Search this page" placeholder="Search students, lessons, or anything…" value={search} onChange={e=>setSearch(e.target.value)} disabled={page==='settings'}/></label><div className="ad-top-actions"><div className="ad-notification-wrap"><button className="ad-notification" aria-label="Notifications" aria-expanded={notice} onClick={()=>setNotice(!notice)}><Icon name="Bell" size={22}/>{unread>0&&<b>{unread}</b>}</button>{notice&&<div className="ad-notifications"><strong>Your classroom updates</strong><p>{unread} unread conversations</p><p>{upcoming.length} assignments are open.</p><Link to={`${base}/messages`} onClick={()=>setNotice(false)}>Open messages →</Link></div>}</div><button className="ad-theme" aria-label={dark?'Switch to light theme':'Switch to dark theme'} onClick={()=>setDark(!dark)}><Icon name="Sun" size={20}/><Icon name="Moon" size={18}/></button><Link className="ad-profile" aria-label="Teacher profile and settings" to={`${base}/settings`}><Avatar name={settings.name||'Teacher'}/><span><strong>{settings.name||'Teacher'}</strong><small>Teacher</small></span><Icon name="ChevronDown" size={15}/></Link></div></header>
      <div className="ad-content">
        {page&&<div className="ad-page-heading"><div><div className="ad-breadcrumb">Teacher workspace <span>/</span> {title}</div><h1>{title}<span className="ad-heading-dot"/></h1><p>{descriptions[page]}</p></div><span className="ad-demo"><i/>KG 1 · Demo</span></div>}
        {!page&&<>
          <section className="ad-hero tc-hero"><div className="ad-hero-copy"><h1>Good Morning, {(settings.name||'Teacher').split(/\s+/)[0]}! 👋</h1><p>You’re making a difference in your students’ lives.</p><small>“Small steps every day lead to big dreams.”</small><span className="tc-hero-sparkles" aria-hidden="true">✧ <b>♥</b></span></div><div className="ad-hero-photo"><img src="/gallery/story.png" alt="A teacher reading with young children"/></div><div className="ad-hero-summary"><div><span className="ad-icon blue"><Icon name="CalendarDays"/></span><p><strong>{friendlyDate(today)}</strong><small>{friendlyDate(today,{weekday:'long',year:undefined,month:undefined,day:undefined})}</small></p></div><div><span className="ad-icon purple"><Icon name="School"/></span><p><strong>{settings.className||'Unassigned class'}</strong><small>Schedule not assigned</small></p></div><Link to={`${base}/my-class`}>View Class Details <Icon name="ArrowRight" size={14}/></Link></div></section>
          <Metrics items={dashboardMetrics}/>
          <div className="ad-overview-grid tc-overview-grid">
            <Panel title="My Class" icon="UsersRound" link="students" label="View all students"><div className="ad-student-strip">{visibleStudents.slice(0,6).map((s,i)=><button key={s.id} onClick={()=>setModal({type:'student',item:s})}><Avatar name={s.name} index={i} large/><strong>{s.name}</strong><Badge>{statusFor(s)}</Badge></button>)}{!visibleStudents.length&&<Empty title="No matching students"/>}</div></Panel>
            <Panel title="Today's Schedule" icon="CalendarDays" link="my-class" label="View full schedule">{scheduleContent}</Panel>
            <Panel title="Quick Actions" icon="Zap"><div className="ad-quick">{([['Take Attendance','UserCheck','attendance','blue'],['Add Assignment','ClipboardPlus',null,'purple'],['View Students','UsersRound','students','green'],['Lesson Plans','BookOpen','lesson-plans','orange'],['Send Message','MessageCircle','messages','pink'],['View Reports','ChartNoAxesCombined','reports','purple']] as [string,string,string|null,string][]).map(([label,icon,path,tone])=>path?<Link key={label} to={`${base}/${path}`} className={tone}><Icon name={icon} size={22}/>{label}</Link>:<button className={tone} key={label} onClick={()=>setModal({type:'assignment'})}><Icon name={icon} size={22}/>{label}</button>)}</div></Panel>
          </div>
          <div className="ad-bottom-grid tc-bottom-grid">
            <Panel title="Recent Activities" icon="Zap"><div className="ad-activities">{activity.slice(0,4).map(a=><div key={a.id}><span className={`ad-icon ${a.tone}`}><Icon name={a.icon}/></span><div><strong>{a.title}</strong><small>{a.description}</small></div></div>)}</div></Panel>
            <Panel title="Class Performance" icon="School" link="assessments" label="View details"><PerformanceChart scores={scores} students={students}/></Panel>
            <Panel title="Upcoming Assignments" icon="CalendarDays" link="assessments?view=assignments" label="View all"><div className="ad-reminders tc-assignments">{upcoming.slice(0,4).map(a=><button key={a.id} onClick={()=>setModal({type:'assignment',item:a})}><span><small>{friendlyDate(a.due,{month:'short',year:undefined,day:undefined}).toUpperCase()}</small>{a.due.slice(-2)}</span><div><strong>{a.title}</strong><small>KG 1 · Due {friendlyDate(a.due,{year:undefined})}</small></div><b>{a.subject}</b></button>)}{!upcoming.length&&<Empty title="All caught up">No open assignments.</Empty>}</div></Panel>
          </div>
        </>}
        {page==='my-class'&&<TeachersMyClassSection1 settings={settings} students={students} present={present} classAverage={classAverage} lessons={lessons} scheduleContent={scheduleContent} visibleLessons={visibleLessons}/>}
        {page==='students'&&<TeachersStudentsSection2 students={students} present={present} absent={absent} classAverage={classAverage} visibleStudents={visibleStudents} settings={settings} setToast={setToast} searchField={searchField} setModal={setModal} statusFor={statusFor} studentAverage={studentAverage}/>}
        {page==='attendance'&&<TeachersAttendanceSection3 students={students} statusFor={statusFor} date={date} settings={settings} today={today} setDate={setDate} download={download} searchField={searchField} filter={filter} setFilter={setFilter} visibleAttendance={visibleAttendance} setAttendance={setAttendance} addActivity={addActivity} setToast={setToast} mark={mark}/>}
        {page==='lesson-plans'&&<TeachersLessonPlansSection4 lessons={lessons} setModal={setModal} searchField={searchField} subjectFilter={subjectFilter} visibleLessons={visibleLessons} settings={settings}/>}
        {page==='assessments'&&<TeachersAssessmentsSection5 classAverage={classAverage} students={students} scores={scores} upcoming={upcoming} assessmentTab={assessmentTab} setAssessmentTab={setAssessmentTab} setSearch={setSearch} setFilter={setFilter} assignments={assignments} download={download} searchField={searchField} visibleStudents={visibleStudents} studentAverage={studentAverage} setModal={setModal} subjectFilter={subjectFilter} visibleAssignments={visibleAssignments}/>} 
        {page==='exams'&&<TeachersExamsSection setToast={setToast}/>} 
        {page==='messages'&&<TeachersMessagesSection6 messageMobile={messageMobile} threads={threads} setModal={setModal} searchField={searchField} search={search} selectThread={selectThread} threadId={threadId} setMessageMobile={setMessageMobile} currentThread={currentThread} reply={reply} setThreads={setThreads} setReply={setReply} setToast={setToast} addActivity={addActivity}/>}
        {page==='reports'&&<TeachersReportsSection7 classAverage={classAverage} present={present} students={students} lessons={lessons} scores={scores} absent={absent} search={search} today={today} download={download}/>}
        {page==='settings'&&<TeachersSettingsSection8 setSettings={setSettings} setToast={setToast} settings={settings} setDark={setDark} dark={dark}/>}
        <footer className="ad-footer"><span>© {new Date().getFullYear()} ABC Daycare & Kindergarten · Teacher workspace</span><span>Happy children. Bright futures. <Icon name="Heart" size={12}/></span></footer>
      </div>
    </main>
    {toast&&<div className="ad-toast" role="status"><Icon name="CircleCheck" size={20}/>{toast}<button aria-label="Dismiss notification" onClick={()=>setToast('')}><Icon name="X" size={16}/></button></div>}
    {modal&&<Modal title={modal.type==='student'?modal.item.name:modal.type==='assessment'?`Assess ${modal.item.name}`:modal.type==='message'?'New Demo Conversation':`${modal.item?'Edit':'Create'} ${modal.type==='lesson'?'Lesson Plan':'Assignment'}`} onClose={()=>setModal(null)}>
      {modal.type==='lesson'&&<form onSubmit={saveLesson}>
        <label>Lesson title<input name="title" required defaultValue={modal.item?.title} placeholder="What will we discover?"/></label><div className="ad-form-grid"><label>Subject<select name="subject" defaultValue={modal.item?.subject||subjects[0]}>{subjects.map(s=><option key={s}>{s}</option>)}</select></label><label>Lesson date<input type="date" name="date" required defaultValue={modal.item?.date||today}/></label><label>Duration (minutes)<input type="number" min="5" max="240" name="duration" required defaultValue={modal.item?.duration||40}/></label><label>Status<select name="status" defaultValue={modal.item?.status||'Draft'}><option>Draft</option><option>Ready</option><option>Completed</option></select></label></div><label>Learning objective<textarea name="objective" required rows={2} defaultValue={modal.item?.objective} placeholder="By the end of the lesson, learners will…"/></label><label>Materials<input name="materials" defaultValue={modal.item?.materials} placeholder="Books, crayons, counting blocks…"/></label><label>Lesson activities<textarea name="activity" required rows={4} defaultValue={modal.item?.activity} placeholder="Describe your welcome, learning activity, and reflection."/></label><button className="ad-button">Save Lesson Plan</button>
      </form>}
      {modal.type==='assignment'&&<form onSubmit={saveAssignment}><label>Assignment title<input name="title" required defaultValue={modal.item?.title}/></label><div className="ad-form-grid"><label>Subject<select name="subject" defaultValue={modal.item?.subject||subjects[0]}>{subjects.map(s=><option key={s}>{s}</option>)}</select></label><label>Due date<input type="date" name="due" required defaultValue={modal.item?.due||dateAfter(1)}/></label></div><label>Instructions<textarea name="description" required rows={4} defaultValue={modal.item?.description} placeholder="A simple, encouraging activity for your learners…"/></label><label>Status<select name="status" defaultValue={modal.item?.status||'Open'}><option>Open</option><option>Completed</option></select></label><button className="ad-button">Save Assignment</button></form>}
      {modal.type==='student'&&<form onSubmit={e=>{e.preventDefault();const notes=String(new FormData(e.currentTarget).get('notes')??'');setStudents(old=>old.map(s=>s.id===modal.item.id?{...s,notes}:s));setModal(null);setToast('Student note saved')}}><div className="tc-student-detail"><Avatar name={modal.item.name} large/><div><strong>{modal.item.id} · KG 1</strong><small>{modal.item.age} years old</small><Badge>{statusFor(modal.item)}</Badge></div></div><dl className="tc-details"><dt>Parent / guardian</dt><dd>{modal.item.guardian}</dd><dt>Contact email</dt><dd>{modal.item.email}</dd><dt>Learning average</dt><dd>{studentAverage(modal.item.id)}%</dd></dl><label>Teacher notes<textarea name="notes" rows={4} defaultValue={modal.item.notes} placeholder="Learning interests, recent milestones, or a helpful reminder…"/></label><button className="ad-button">Save Student Note</button></form>}
      {modal.type==='assessment'&&<form onSubmit={e=>{e.preventDefault();const data=Object.fromEntries([...new FormData(e.currentTarget)].map(([key,value])=>[key,Number(value)]));setScores(old=>({...old,[modal.item.id]:data}));addActivity('Learning progress updated',modal.item.name,'ClipboardCheck','green');setModal(null);setToast('Assessment saved')}}><p className="tc-note">Record a score from 0 to 100 for each learning area.</p><div className="ad-form-grid">{subjects.map(subject=><label key={subject}>{subject}<input type="number" name={subject} min="0" max="100" required defaultValue={scores[modal.item.id]?.[subject]??0}/></label>)}</div><button className="ad-button">Save Assessment</button></form>}
      {modal.type==='message'&&<form onSubmit={e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget));const student=students.find(s=>s.id===String(values.student));const text=String(values.message??'').trim();if(!student||!text)return;const thread: MessageThread={id:crypto.randomUUID(),name:student.guardian,student:student.name,unread:false,messages:[{id:crypto.randomUUID(),sender:'teacher',text,time:'Just now'}]};setThreads(old=>[thread,...old]);setThreadId(thread.id);setMessageMobile(true);setModal(null);setToast('Demo conversation saved locally')}}><label>Student’s family<select name="student">{students.map(s=><option key={s.id} value={s.id}>{s.name} · {s.guardian}</option>)}</select></label><label>Message<textarea name="message" rows={5} required placeholder="Share a classroom update…"/></label><p className="ad-local-note">This demo saves messages in your browser. It does not contact families.</p><button className="ad-button">Save Demo Conversation</button></form>}
    </Modal>}
  </div>
}
