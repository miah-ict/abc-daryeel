import StudentsMyClassesSection1 from './StudentsMyClassesSection1'
import StudentsMyAssignmentsSection2 from './StudentsMyAssignmentsSection2'
import StudentsAttendanceSection3 from './StudentsAttendanceSection3'
import StudentsGradesSection4 from './StudentsGradesSection4'
import StudentsGallerySection5 from './StudentsGallerySection5'
import StudentsProfileSection6 from './StudentsProfileSection6'
import StudentsSettingsSection7 from './StudentsSettingsSection7'
import StudentsMessagesSection8 from './StudentsMessagesSection8'
import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import Icon from '../../../components/ui/Icon'
import { Empty, Modal } from '../../../components/ui/TeacherUI';
import { studentBase as base, studentMenu, showDate } from '../../../data/studentData';
import {addGalleryFavorite,getStudentPortal,markStudentConversationRead,removeGalleryFavorite,saveAssignmentSubmission,sendStudentMessage,updateStudentPreferences,updateStudentProfile} from '../api/studentApi'
import '../../../styles/admin.css'
import '../../../styles/student.css'

// Reuse only the supplied reference's artwork; all cards, text, and controls are live UI.
function ReferenceArt({ x, y, w, h, width = w, className = '', label = '' }) {
  const scale = width / w
  return <span className={`st-art ${className}`} role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true} style={{width,height:h*scale,backgroundSize:`${1536*scale}px ${1024*scale}px`,backgroundPosition:`${-x*scale}px ${-y*scale}px`}}/>
}
function Portrait({ size=44, name='Student' }) {return <ReferenceArt x={31} y={110} w={51} h={51} width={size} className="st-portrait" label={`${name}'s profile photo`}/>}
function Pill({ children }) {return <span className={`st-pill ${['Absent'].includes(children)?'rose':['Pending','Late','In Progress'].includes(children)?'amber':['Tomorrow','Upcoming'].includes(children)?'sky':'mint'}`}>{children}</span>}
function Section({title,icon,children=null,to='',label='View All',extra=null,className=''}) {return <section className={`st-panel ${className}`}><header className="st-panel-heading"><div><span className="st-heading-icon"><Icon name={icon} size={21}/></span><h2>{title}</h2></div>{to&&<Link to={`${base}/${to}`}>{label}</Link>}{extra}</header>{children}</section>}
function StudentPortalState({error,retry,title}) {
 return <div className="admin-app student-app"><aside className="st-sidebar"><div className="st-logo"/><div className="st-sidebar-profile"><span className="st-heading-icon"><Icon name="UserRound"/></span><div><strong>Student portal</strong><small>Loading school profile</small></div></div><nav>{studentMenu.map(([label,icon,slug])=><span key={slug} className={slug===title?'active':''}><span><Icon name={icon} size={21}/></span>{label}</span>)}</nav></aside><main className="st-main"><header className="st-topbar"><span className="st-heading-icon"><Icon name="Search"/></span><strong>{error?'Student portal unavailable':'Connecting to school database…'}</strong></header><div className="st-content"><div className="st-page-title"><div><span>My learning space</span><h1>{title||'Dashboard'}</h1><p>{error||'Loading your classes, assignments, attendance, and school updates.'}</p></div></div>{error?<div className="api-state" role="alert">{error}<button onClick={retry}>Retry</button></div>:<><div className="st-metrics">{Array.from({length:4},(_,index)=><div className="st-metric" key={index}><span className="st-big-icon blue"><Icon name={['UsersRound','CalendarDays','ClipboardList','ClipboardCheck'][index]}/></span><div><span>Loading</span><strong>—</strong><small>School record</small></div></div>)}</div><div className="st-middle-grid">{Array.from({length:3},(_,index)=><section className="st-panel" key={index}><header className="st-panel-heading"><div><span className="st-heading-icon"><Icon name={['BookOpen','Clock3','Bell'][index]}/></span><h2>Loading school information</h2></div></header><div className="ad-empty"><strong>Please wait</strong><span>Your secure student records are being prepared.</span></div></section>)}</div><div className="st-bottom-grid">{Array.from({length:3},(_,index)=><section className="st-panel" key={index}><header className="st-panel-heading"><div><span className="st-heading-icon"><Icon name="Sparkles"/></span><h2>Student portal</h2></div></header><p className="st-note">Connected information will appear here.</p></section>)}</div></>}</div></main></div>
}
const descriptions={
  'my-classes':'A world of things to learn, with a little fun along the way.',
  'my-assignments':'Small steps today. Big discoveries tomorrow.',
  attendance:'Every day at school is a new adventure.',
  grades:'Look how much you’re learning and growing!',
  gallery:'Your happiest school moments, all in one place.',
  profile:'All about you and your learning journey.',
  settings:'Make your learning space feel just right.',
  messages:'A friendly place to connect with your teachers.',
}
const aliases={'my-class':'my-classes',classes:'my-classes',assignments:'my-assignments',setting:'settings'}

export default function StudentWorkspace() {
  const location=useLocation()
  const rawPage=location.pathname.slice(base.length).split('/').filter(Boolean)[0]||''
  const page=aliases[rawPage]||rawPage
  const [portal,setPortal]=useState(null)
  const [selectedStudentId,setSelectedStudentId]=useState('')
  const [loadError,setLoadError]=useState('')
  const [saving,setSaving]=useState(false)
  const [open,setOpen]=useState(false)
  const [search,setSearch]=useState('')
  const [filter,setFilter]=useState('All')
  const [period,setPeriod]=useState('25')
  const [modal,setModal]=useState(null)
  const [toast,setToast]=useState('')
  const [notifications,setNotifications]=useState(false)
  const [selectedThread,setSelectedThread]=useState(null)
  const [reply,setReply]=useState('')
  const [mobileChat,setMobileChat]=useState(false)
  const loadPortal=async (studentId='')=>{setLoadError('');try{const data=await getStudentPortal(studentId);setPortal(data);setSelectedStudentId(data.profile?.id||studentId||'')}catch(error){setLoadError(error.message)}}
  useEffect(()=>{loadPortal()},[])
  const profile=portal?.profile||{name:'Student',guardian:'',email:'',phone:'',interests:'',about:'',gradeLevel:'',studentId:''}
  const settings=portal?.settings||{dark:false,largeText:false,reminders:true,announcements:true}
  const subjects=portal?.subjects||[]
  const studentActivities=portal?.activities||[]
  const studentAnnouncements=portal?.announcements||[]
  const studentGallery=portal?.gallery||[]
  const assignments=portal?.assignments||[]
  const attendance=portal?.attendance||[]
  const threads=portal?.threads||[]
  const favorites=portal?.favorites||[]
  const classroom=portal?.classroom||profile.classroom||{}
  useEffect(()=>{setSearch('');setFilter('All');setOpen(false);setModal(null);setNotifications(false)},[page])
  useEffect(()=>{document.title=`${studentMenu.find(m=>m[2]===page)?.[0]||'Student'} · ABC Student Portal`},[page])
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4000);return()=>clearTimeout(timer)},[toast])
  useEffect(()=>{if(threads.length&&!threads.some(thread=>thread.id===selectedThread))setSelectedThread(threads[0].id)},[threads,selectedThread])
  useEffect(()=>{
    if(modal?.type!=='photo')return
    const handle=e=>{if(e.key==='ArrowRight')setModal(m=>({...m,index:(m.index+1)%studentGallery.length}));if(e.key==='ArrowLeft')setModal(m=>({...m,index:(m.index-1+studentGallery.length)%studentGallery.length}))}
    window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle)
  },[modal?.type,studentGallery.length])
  const title=studentMenu.find(m=>m[2]===page)?.[0]
  if(!title)return <Navigate to={base} replace/>
  const pending=assignments.filter(a=>a.status==='Pending').length
  const unread=threads.filter(t=>t.unread).length
  const periodRows=attendance.slice(0,Number(period))
  const count=status=>periodRows.filter(r=>r.status===status).length
  const present=count('Present'),absent=count('Absent'),late=count('Late')
  const attendanceRate=Math.round((present+late)/periodRows.length*100)||0
  const scoredSubjects=subjects.filter(subject=>subject.score!==null&&subject.score!==undefined&&Number.isFinite(Number(subject.score)))
  const average=scoredSubjects.length?Math.round(scoredSubjects.reduce((n,s)=>n+Number(s.score),0)/scoredSubjects.length):0
  const grade=!scoredSubjects.length?'—':average>=90?'A':average>=80?'B':average>=70?'C':'Developing'
  const firstName=profile.name.trim().split(' ')[0]||'Student'
  const match=text=>text.toLowerCase().includes(search.toLowerCase())
  const filteredSubjects=subjects.filter(s=>match(`${s.name} ${s.teacher}`))
  const filteredAssignments=assignments.filter(a=>(filter==='All'||a.status===filter)&&match(`${a.title} ${a.subject}`))
  const filteredGallery=studentGallery.filter(p=>(filter==='All'||p.category===filter||(filter==='Favorites'&&favorites.includes(p.id)))&&match(p.title))
  const currentThread=threads.find(t=>t.id===selectedThread)||threads[0]
  const notify=text=>setToast(text)
  const savePreferences=async next=>{setSaving(true);try{const saved=await updateStudentPreferences(next);setPortal(old=>({...old,settings:saved}));notify('Preferences saved')}catch(error){notify(error.message)}finally{setSaving(false)}}
  const setSettings=updater=>{const next=typeof updater==='function'?updater(settings):updater;return savePreferences(next)}
  const theme=()=>setSettings({...settings,dark:!settings.dark})
  const periodSelect=<select className="st-period" aria-label="Attendance reporting period" value={period} onChange={e=>setPeriod(e.target.value)}><option value="25">Last 25 days</option><option value="10">Last 10 days</option><option value="5">Last 5 days</option></select>
  const attendanceTotal=periodRows.length||1
  const attendanceDonut=<div className="st-attendance-chart"><div className="st-donut" style={{'--present':`${present/attendanceTotal*100}%`,'--attended':`${(present+late)/attendanceTotal*100}%`} as React.CSSProperties} role="img" aria-label={`${attendanceRate}% attendance, including late arrivals`}><div><strong>{attendanceRate}%</strong><small>Attended</small></div></div><div className="st-chart-legend">{[['Present',present,'#30cf91'],['Absent',absent,'#fa5b99'],['Late',late,'#ffc650']].map(([label,value,color])=><div key={label}><i style={{background:color}}/><span>{label}</span><b>{value} {value===1?'day':'days'}</b></div>)}</div></div>
  const classCards=<div className="st-subjects">{filteredSubjects.map(s=><button key={s.id} onClick={()=>setModal({type:'class',item:s})}><ReferenceArt x={s.art[0]} y={s.art[1]} w={s.art[2]} h={s.art[3]} width={62}/><strong>{s.name}</strong><Pill>{s.label}</Pill></button>)}{!filteredSubjects.length&&<Empty title="No classes found">No classes found.</Empty>}</div>
  const activityList=<div className="st-activity-list">{studentActivities.filter(a=>match(a.title)).map(a=><button key={a.id} onClick={()=>setModal({type:'activity',item:a})}><span className="st-small-icon"><Icon name={a.icon||'CalendarDays'} size={17}/></span><time>{a.time}</time><span className={`st-activity-icon ${a.tone}`}><Icon name={a.icon||'BookOpen'} size={18}/></span><div><strong>{a.title}</strong><small>{a.description}</small></div><span className={`st-pill ${a.status==='Completed'?'mint':'sky'}`}><Icon name={a.status==='Completed'?'CircleCheck':'Sparkles'} size={10}/>{a.status}</span></button>)}{!studentActivities.length&&<Empty title="No activities scheduled">No activities scheduled.</Empty>}</div>
  const visibleAnnouncements=studentAnnouncements.filter(n=>match(`${n.title} ${n.description}`))
  const announcementsList=<div className="st-announcements">{visibleAnnouncements.map((n,i)=><button key={n.id} onClick={()=>setModal({type:'announcement',item:n})}>{n.image?<img src={n.image} alt=""/>:<span className="st-small-icon"><Icon name="Megaphone"/></span>}<div><span className={`st-news-tag tag-${i}`}>{n.tag}</span><strong>{n.title}</strong><small>{n.description}</small></div><span className="st-news-side"><time>{showDate(n.date,{year:undefined})}</time><Icon name="ChevronRight" size={15}/></span></button>)}{!visibleAnnouncements.length&&<Empty title="No announcements yet">No announcements yet.</Empty>}</div>
  const progressContent=<div className="st-progress-content"><h3>My Progress</h3>{scoredSubjects.map(subject=><div className="st-progress-row" key={subject.id}><span>{subject.name}</span><div><i className={subject.tone||'blue'} style={{width:`${Math.max(0,Math.min(100,Number(subject.score)))}%`}}/></div><small>{Number(subject.score)}%</small></div>)}{!scoredSubjects.length&&<p className="st-note">Published subject scores will appear here.</p>}</div>
  const toggleFavorite=async id=>{const selected=favorites.includes(id);setPortal(old=>({...old,favorites:selected?old.favorites.filter(item=>item!==id):[...old.favorites,id]}));try{await (selected?removeGalleryFavorite(id,selectedStudentId):addGalleryFavorite(id,selectedStudentId))}catch(error){setPortal(old=>({...old,favorites:selected?[...old.favorites,id]:old.favorites.filter(item=>item!==id)}));notify(error.message)}}
  const saveProfile=async values=>{setSaving(true);try{const saved=await updateStudentProfile(values,selectedStudentId);setPortal(old=>({...old,profile:{...old.profile,...saved}}));notify('Profile saved')}catch(error){notify(error.message);throw error}finally{setSaving(false)}}
  const submitAssignment=async(id,response)=>{setSaving(true);try{const submission=await saveAssignmentSubmission(id,response,selectedStudentId);setPortal(old=>({...old,assignments:old.assignments.map(item=>item.id===id?{...item,status:'Submitted',response:submission.response||response,submission}:item)}));notify('Your work was submitted to your teacher');return true}catch(error){notify(error.message);return false}finally{setSaving(false)}}
  const readThread=async id=>{setSelectedThread(id);setReply('');setMobileChat(true);setPortal(old=>({...old,threads:old.threads.map(item=>item.id===id?{...item,unread:false}:item)}));try{await markStudentConversationRead(id,selectedStudentId)}catch(error){notify(error.message)}}
  const sendReply=async(id,body)=>{setSaving(true);try{const message=await sendStudentMessage(id,body,selectedStudentId);setPortal(old=>({...old,threads:old.threads.map(item=>item.id===id?{...item,unread:false,messages:[...(item.messages||[]),message]}:item)}));setReply('');notify('Message sent');return true}catch(error){notify(error.message);return false}finally{setSaving(false)}}
  if(!portal)return <StudentPortalState error={loadError} retry={loadPortal} title={title}/>
  return <div className={`admin-app student-app ${settings.dark?'ad-dark':''} ${settings.largeText?'st-large-text':''}`}>
    {open&&<button className="st-scrim" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
    <aside className={`st-sidebar ${open?'open':''}`}>
      <Link className="st-logo" to={base} aria-label={profile.school?.name||'School home'}><ReferenceArt x={43} y={20} w={176} h={60} width={177}/></Link><button className="st-close-menu" aria-label="Close menu" onClick={()=>setOpen(false)}><Icon name="X"/></button>
      <Link className="st-sidebar-profile" to={`${base}/profile`}><Portrait size={48} name={profile.name}/><div><strong>{profile.name}</strong><small>{profile.gradeLevel||'Class pending'}</small><span><i/>{profile.status||'Active'}</span></div></Link>
      <nav aria-label="Student navigation">{studentMenu.map(([label,icon,slug])=><Link key={slug} to={`${base}/${slug}`} className={page===slug?'active':''} aria-current={page===slug?'page':undefined}><span><Icon name={icon} size={21}/></span>{label}{slug==='messages'&&unread>0&&<b>{unread}</b>}</Link>)}</nav>
      <div className="st-sidebar-art"><ReferenceArt x={9} y={696} w={230} h={306} width={230}/></div>
    </aside>
    <main className="st-main">
      <header className="st-topbar"><button className="st-menu" aria-label="Open menu" onClick={()=>setOpen(true)}><Icon name="Menu"/></button>{profile.linkedStudents?.length>1&&<label className="st-student-switcher"><span>Student</span><select value={selectedStudentId} onChange={e=>{setPortal(null);loadPortal(e.target.value)}}>{profile.linkedStudents.map(student=><option key={student.id} value={student.id}>{student.name}</option>)}</select></label>}<label className="st-search"><Icon name="Search" size={20}/><input aria-label="Search this page" placeholder="Search anything…" value={search} onChange={e=>setSearch(e.target.value)} disabled={['settings','profile'].includes(page)}/></label><div className="st-top-actions"><div className="st-notification-wrap"><button className="st-bell" aria-label="Notifications" aria-expanded={notifications} onClick={()=>setNotifications(!notifications)}><Icon name="Bell" size={23}/>{unread>0&&<b>{unread}</b>}</button>{notifications&&<div className="st-notifications"><h3>Hello, {firstName}!</h3><p>{unread} unread messages from your school.</p><p>{pending} assignments waiting for you.</p><Link to={`${base}/messages`} onClick={()=>setNotifications(false)}>View messages →</Link></div>}</div><button className="st-theme" disabled={saving} aria-label={settings.dark?'Switch to light theme':'Switch to dark theme'} onClick={theme}><Icon name="Sun" size={19}/><span/><Icon name="Moon" size={17}/></button><Link className="st-top-profile" to={`${base}/profile`} aria-label="My profile"><Portrait size={42} name={profile.name}/><div><strong>{profile.name}</strong><small>{profile.gradeLevel||'Class pending'}</small></div><Icon name="ChevronDown" size={16}/></Link></div></header>
      <div className="st-content">
        {page&&<div className="st-page-title"><div><span>My learning space <b>/</b> {title}</span><h1>{title}</h1><p>{descriptions[page]}</p></div><span className="st-demo"><i/>School database</span></div>}
        {!page&&<>
          <section className="st-hero"><div className="st-hero-copy"><h1>Hello, {firstName}! 👋</h1><p>Welcome back to {profile.school?.name||'your school'}.</p><small>“Small steps every day lead to big dreams.”</small><span className="st-hero-heart" aria-hidden="true">♡</span><span className="st-hero-star" aria-hidden="true">☆</span></div><div className="st-hero-photo" role="img" aria-label="A smiling child ready for a day of school"/><div className="st-schedule-card"><span className="st-calendar-art"><Icon name="CalendarDays" size={32}/></span><div><strong>Today’s Schedule</strong><p>You have {studentActivities.filter(a=>['Upcoming','Scheduled'].includes(a.status)).length} activities</p><Link to={`${base}/my-classes#schedule`}>View Schedule <Icon name="ArrowRight" size={17}/></Link></div></div></section>
          <div className="st-metrics">{[['My Class',profile.gradeLevel||'Not assigned','','my-classes',[294,300,65,65]],['Attendance',`${attendanceRate}%`,'Attended recent school days','attendance',[605,300,65,65]],['Total Assignments',pending,'Pending','my-assignments',[909,300,65,65]],['My Grades',grade,'Average score','grades',[1220,300,65,65]]].map(([label,value,note,path,art])=><Link className="st-metric" key={label} to={`${base}/${path}`}><ReferenceArt x={art[0]} y={art[1]} w={art[2]} h={art[3]} width={64}/><div><span>{label}</span><strong>{value}</strong>{note&&<small>{note}</small>}</div><Icon name="ChevronRight" size={20}/></Link>)}</div>
          <div className="st-middle-grid"><section className="st-panel st-class-panel"><header className="st-panel-heading"><div><span className="st-heading-icon purple"><Icon name="UsersRound" size={23}/></span><div><h2>My Class</h2><p>{profile.gradeLevel||'Class not assigned'}{profile.teacher?.name?` · Teacher: ${profile.teacher.name}`:''}</p></div></div><Link className="st-small-button" to={`${base}/my-classes`}>View All</Link></header>{classCards}</section><Section title="Attendance Overview" icon="CalendarDays" extra={periodSelect}>{attendanceDonut}</Section><Section title="Quick Actions" icon="Zap"><div className="st-quick-actions">{[['View Assignments','NotebookPen','my-assignments','purple'],['My Grades','ClipboardCheck','grades','blue'],['Send Message','MessagesSquare','messages','green'],['View Gallery','Images','gallery','orange']].map(([label,icon,path,tone])=><Link key={path} className={tone} to={`${base}/${path}`}><Icon name={icon} size={27}/><span>{label}</span></Link>)}</div></Section></div>
          <div className="st-bottom-grid"><Section title="Today’s Activities" icon="CalendarDays" to="my-classes#schedule">{activityList}</Section><Section title="Latest Announcements" icon="Megaphone" extra={<button className="st-text-button" onClick={()=>setModal({type:'announcements'})}>View All</button>}>{announcementsList}</Section><section className="st-panel st-encouragement"><header><span className="st-award">🌟</span><div><h2>You’re doing great!</h2><small>Keep up the good work, {firstName}!</small></div><Icon name="Star" size={18}/></header>{progressContent}</section></div>
        </>}
        {page==='my-classes'&&<StudentsMyClassesSection1 profile={profile} classroom={classroom} filteredSubjects={filteredSubjects} setModal={setModal} ReferenceArt={ReferenceArt} Pill={Pill} Section={Section} activityList={activityList}/>}
        {page==='my-assignments'&&<StudentsMyAssignmentsSection2 gradeLevel={profile.gradeLevel} assignments={assignments} pending={pending} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} filteredAssignments={filteredAssignments} Pill={Pill} setModal={setModal}/>}
        {page==='attendance'&&<StudentsAttendanceSection3 periodSelect={periodSelect} Section={Section} attendanceDonut={attendanceDonut} present={present} absent={absent} late={late} periodRows={periodRows} notify={notify} setModal={setModal}/>}
        {page==='grades'&&<StudentsGradesSection4 studentId={selectedStudentId} firstName={firstName} grade={grade} average={average} notify={notify} subjects={subjects} filteredSubjects={filteredSubjects} ReferenceArt={ReferenceArt} Section={Section} progressContent={progressContent} teacher={profile.teacher}/>} 
        {page==='gallery'&&<StudentsGallerySection5 gallery={studentGallery} filter={filter} setFilter={setFilter} filteredGallery={filteredGallery} setModal={setModal} favorites={favorites} toggleFavorite={toggleFavorite}/>}
        {page==='profile'&&<StudentsProfileSection6 saveProfile={saveProfile} saving={saving} Portrait={Portrait} profile={profile} Pill={Pill} ReferenceArt={ReferenceArt} Section={Section}/>}
        {page==='settings'&&<StudentsSettingsSection7 Section={Section} theme={theme} settings={settings} setSettings={setSettings} saving={saving}/>}
        {page==='messages'&&<StudentsMessagesSection8 mobileChat={mobileChat} threads={threads} match={match} selectedThread={selectedThread} setReply={setReply} setMobileChat={setMobileChat} currentThread={currentThread} reply={reply} readThread={readThread} sendReply={sendReply} saving={saving}/>}
      </div>
      <footer className="st-footer"><div><span>💗</span><strong>{profile.school?.name||'My School'}</strong><small>A safe place for a bright future</small></div><div><span>Need Help? Contact your teacher or admin</span><Link to={`${base}/messages`}><Icon name="Send" size={14}/>Send Message</Link></div></footer>
    </main>
    {toast&&<div className="ad-toast" role="status"><Icon name="CircleCheck" size={20}/>{toast}<button aria-label="Dismiss notification" onClick={()=>setToast('')}><Icon name="X" size={16}/></button></div>}
    {modal&&<Modal title={modal.type==='photo'?studentGallery[modal.index].title:modal.type==='announcements'?'School Announcements':modal.type==='assignment'?modal.item.title:modal.type==='class'?modal.item.name:modal.type==='activity'?modal.item.title:modal.type==='attendance'?showDate(modal.item.date):modal.item.title} onClose={()=>setModal(null)}>
      {modal.type==='class'&&<div className="st-class-detail"><ReferenceArt x={modal.item.art[0]} y={modal.item.art[1]} w={modal.item.art[2]} h={modal.item.art[3]} width={85}/><p>{modal.item.description}</p><dl><dt>My teacher</dt><dd>{modal.item.teacher||'Not assigned'}</dd><dt>My classroom</dt><dd>{profile.gradeLevel||'Not assigned'}{(classroom?.room||classroom?.details?.room)?` · ${classroom.room||classroom.details.room}`:''}</dd><dt>Class time</dt><dd>{modal.item.time||'Schedule pending'}</dd></dl><Link className="st-primary" to={`${base}/my-assignments`} onClick={()=>setModal(null)}>View Assignments <Icon name="ArrowRight" size={16}/></Link></div>}
      {modal.type==='assignment'&&<form className="st-assignment-form" onSubmit={async e=>{e.preventDefault();if(modal.item.status==='Closed')return;const response=String(new FormData(e.currentTarget).get('response')||'').trim();if(!response)return;if(await submitAssignment(modal.item.id,response))setModal(null)}}><div className="st-assignment-meta"><Pill>{modal.item.status}</Pill><span>{modal.item.subject} · Due {showDate(modal.item.due)}</span></div><p>{modal.item.description}</p><label>My answer or a description of my work<textarea name="response" rows={6} defaultValue={modal.item.response} disabled={modal.item.status==='Closed'} required placeholder="Tell your teacher what you discovered…"/></label><p className="st-note">{modal.item.status==='Closed'?'This assignment is closed for new submissions.':'Your submission is saved in the school database and shared with your teacher.'}</p><button className="st-primary" disabled={saving||modal.item.status==='Closed'}>{saving?'Saving…':modal.item.status==='Submitted'?'Update My Work':modal.item.status==='Closed'?'Assignment Closed':'Submit My Work'}<Icon name="Check" size={17}/></button></form>}
      {modal.type==='attendance'&&<div className="st-attendance-detail"><span className={`st-big-icon ${modal.item.status==='Absent'?'pink':modal.item.status==='Late'?'orange':'green'}`}><Icon name={modal.item.status==='Absent'?'UserX':'CalendarCheck'} size={30}/></span><Pill>{modal.item.status}</Pill><dl><dt>Date</dt><dd>{showDate(modal.item.date)}</dd><dt>Arrival</dt><dd>{modal.item.arrival||'—'}</dd><dt>Class</dt><dd>{profile.gradeLevel||'Not assigned'}</dd></dl></div>}
      {modal.type==='activity'&&<div className="st-activity-detail"><span className={`st-big-icon ${modal.item.tone}`}><Icon name={modal.item.icon} size={30}/></span><p>{modal.item.description}</p><p><Icon name="Clock3" size={16}/> {modal.item.time}</p><Pill>{modal.item.status}</Pill><p className="st-note">Follow your teacher’s instructions and enjoy learning with your classmates.</p></div>}
      {modal.type==='announcement'&&<article className="st-news-detail"><img src={modal.item.image} alt={modal.item.title}/><span>{modal.item.tag} · {showDate(modal.item.date)}</span><p>{modal.item.body}</p></article>}
      {modal.type==='announcements'&&announcementsList}
      {modal.type==='photo'&&<div className="st-lightbox"><img src={studentGallery[modal.index].src} alt={studentGallery[modal.index].title}/><div><button className="st-secondary" aria-label="Previous photo" onClick={()=>setModal(m=>({...m,index:(m.index-1+studentGallery.length)%studentGallery.length}))}><Icon name="ChevronLeft" size={18}/></button><span>{modal.index+1} of {studentGallery.length} · {studentGallery[modal.index].category}</span><button className="st-secondary" aria-label="Next photo" onClick={()=>setModal(m=>({...m,index:(m.index+1)%studentGallery.length}))}><Icon name="ChevronRight" size={18}/></button></div><button className="st-secondary" aria-pressed={favorites.includes(studentGallery[modal.index].id)} onClick={()=>toggleFavorite(studentGallery[modal.index].id)}><Icon name="Heart" size={17}/>{favorites.includes(studentGallery[modal.index].id)?'Saved to Favorites':'Save to Favorites'}</button></div>}
    </Modal>}
  </div>
}
