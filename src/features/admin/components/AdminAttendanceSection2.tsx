import {useMemo,useState} from 'react'
import Icon from '../../../components/ui/Icon'

const staffRole = role => ({manager:'Manager',accountant:'Accountant',guard:'Guard',driver:'Driver',cooking:'Cook',cleaner:'Cleaner',ict:'ICT'}[role]||'Staff')
const statusTone = status => status==='Present'?'present':status==='Absent'?'absent':status==='Leave'?'leave':'unmarked'
const percent = (value,total) => total ? Math.round(value/total*100) : 0

function AttendanceRing({present,absent,leave=0,total,label}) {
  const marked=present+absent+leave,presentShare=percent(present,total),absentShare=percent(absent,total),leaveShare=percent(leave,total)
  const first=presentShare,second=first+absentShare,third=second+leaveShare
  return <div className="ad-attendance-ring-wrap">
    <div className="ad-attendance-ring" style={{background:`conic-gradient(#29bf87 0 ${first}%,#ff648f ${first}% ${second}%,#f5ad42 ${second}% ${third}%,#e7edf8 ${third}% 100%)`}}><div><strong>{percent(marked,total)}%</strong><small>marked</small></div></div>
    <div className="ad-ring-copy"><small>{label}</small><strong>{present} of {total}</strong><span><i className="present"/>Present <i className="absent"/>Absent {leave>0&&<><i className="leave"/>Leave</>}</span></div>
  </div>
}

function PersonRow({person,index,status,onMark,Avatar,Badge,type}) {
  return <tr>
    <td><div className="ad-person"><Avatar name={person.name} index={index}/><div><strong>{person.name||'Unnamed'}</strong><small>{person.loginId||person.id||''}</small></div></div></td>
    <td><span className="ad-class-tag">{type==='staff'?staffRole(person.role):(person.group||'Unassigned')}</span></td>
    <td><Badge>{status}</Badge></td>
    <td><div className="ad-attendance-buttons">
      {(type==='staff'?['Present','Absent','Leave','Unmarked']:['Present','Absent','Unmarked']).map(value=><button key={value} aria-pressed={status===value} className={status===value?`selected ${statusTone(value)}`:''} onClick={()=>onMark(person.id,value)}><Icon name={value==='Present'?'Check':value==='Absent'?'X':value==='Leave'?'CalendarClock':'Minus'} size={13}/>{value}</button>)}
    </div></td>
  </tr>
}

export default function AdminAttendanceSection2({Metrics,students=[],staff=[],statusFor,date,setDate,downloadCSV,setToast,search,setSearch,filter,setFilter,setRegister,staffRegister={},setStaffRegister,Avatar,Badge,mark}) {
  const [section,setSection]=useState('staff'),[onlyAbsent,setOnlyAbsent]=useState(false)
  const safeStudents=Array.isArray(students)?students:[],safeStaff=Array.isArray(staff)?staff:[]
  const staffStatus=person=>staffRegister?.[date]?.[person.id]||'Unmarked'
  const studentStatus=person=>statusFor?.(person)||'Unmarked'
  const uniqueGroups=[...new Set(safeStudents.map(person=>person?.group).filter(Boolean))]
  const uniqueRoles=[...new Set(safeStaff.map(person=>person?.role).filter(Boolean))]
  const current=section==='staff'?safeStaff:safeStudents,status=section==='staff'?staffStatus:studentStatus
  const counts=useMemo(()=>Object.fromEntries(['Present','Absent','Leave','Unmarked'].map(value=>[value,current.filter(person=>status(person)===value).length])),[current,date,staffRegister,statusFor,section])
  const visible=current.filter(person=>{
    const target=`${person?.name||''} ${person?.id||''} ${person?.loginId||''}`.toLowerCase()
    const category=section==='staff'?person?.role:person?.group
    return target.includes(search.toLowerCase())&&(filter==='All'||category===filter)&&(!onlyAbsent||status(person)==='Absent')
  })
  const classSummary=uniqueGroups.map((group,index)=>{const rows=safeStudents.filter(person=>person.group===group),present=rows.filter(person=>studentStatus(person)==='Present').length,absent=rows.filter(person=>studentStatus(person)==='Absent').length;return {group,index,total:rows.length,present,absent}})
  const markStaff=(id,value)=>setStaffRegister(old=>({...old,[date]:{...(old?.[date]||{}),[id]:value}}))
  const markAll=()=>{
    if(section==='staff')setStaffRegister(old=>({...old,[date]:{...(old?.[date]||{}),...Object.fromEntries(visible.map(person=>[person.id,'Present']))}}))
    else setRegister(old=>({...old,[date]:{...(old?.[date]||{}),...Object.fromEntries(visible.map(person=>[person.id,'Present']))}}))
    setToast(`Visible ${section} marked present`)
  }
  const showAbsent=(nextSection,nextFilter='All')=>{setSection(nextSection);setFilter(nextFilter);setOnlyAbsent(true);setSearch('')}
  const exportRows=()=>{downloadCSV(`${section}-attendance-${date}.csv`,[['Date',section==='staff'?'Staff member':'Student',section==='staff'?'Role':'Class','Status'],...visible.map(person=>[date,person.name,section==='staff'?staffRole(person.role):person.group,status(person)])]);setToast('Attendance exported')}

  return <div className="ad-attendance-page">
    <section className="ad-attendance-control">
      <div className="ad-attendance-switch" role="tablist" aria-label="Attendance type">
        <button role="tab" aria-selected={section==='staff'} className={section==='staff'?'active':''} onClick={()=>{setSection('staff');setFilter('All');setOnlyAbsent(false)}}><span><Icon name="BriefcaseBusiness"/></span><b>Staff Attendance</b><small>Daily team register</small></button>
        <button role="tab" aria-selected={section==='students'} className={section==='students'?'active':''} onClick={()=>{setSection('students');setFilter('All');setOnlyAbsent(false)}}><span><Icon name="UsersRound"/></span><b>Student Attendance</b><small>Attendance by class</small></button>
      </div>
      <label className="ad-attendance-date"><span><Icon name="CalendarDays" size={17}/><small>Attendance date</small></span><input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label>
    </section>

    <Metrics items={section==='staff'?[
      ['Total Staff',safeStaff.length,'Registered team members','UsersRound','blue'],['Present',counts.Present,`${percent(counts.Present,safeStaff.length)}% of the team`,'UserCheck','green'],['Absent',counts.Absent,'Needs follow-up','UserX','pink'],['On Leave',counts.Leave,'Approved or reported leave','CalendarClock','orange']
    ]:[
      ['Total Students',safeStudents.length,'Across all classes','UsersRound','blue'],['Present',counts.Present,`${percent(counts.Present,safeStudents.length)}% attendance`,'UserCheck','green'],['Absent',counts.Absent,'Families to follow up','UserX','pink'],['Unmarked',counts.Unmarked,'Waiting for attendance','Clock','purple']
    ]}/>

    <div className="ad-attendance-insights">
      <section className="ad-panel ad-attendance-chart-card"><div className="ad-panel-head"><h2><span className="ad-icon blue"><Icon name="ChartPie"/></span>{section==='staff'?'Staff overview':'Student overview'}</h2><span className="ad-live-pill"><i/>Live register</span></div><AttendanceRing present={counts.Present} absent={counts.Absent} leave={section==='staff'?counts.Leave:0} total={current.length} label={section==='staff'?'Team present':'Students present'}/></section>
      {section==='staff'?<section className="ad-panel ad-absent-preview"><div className="ad-panel-head"><h2><span className="ad-icon pink"><Icon name="UserX"/></span>Absent staff</h2><button className="ad-text-action" onClick={()=>showAbsent('staff')}>View absent staff <Icon name="ArrowRight" size={13}/></button></div>{safeStaff.filter(person=>staffStatus(person)==='Absent').slice(0,4).map((person,index)=><div className="ad-absent-person" key={person.id}><Avatar name={person.name} index={index}/><span><b>{person.name}</b><small>{staffRole(person.role)}</small></span><em>Absent</em></div>)}{!counts.Absent&&<div className="ad-attendance-clear"><Icon name="BadgeCheck"/><b>Everyone is accounted for</b><small>No absent staff for this date.</small></div>}</section>:<section className="ad-panel ad-class-attendance"><div className="ad-panel-head"><h2><span className="ad-icon purple"><Icon name="School"/></span>Attendance by class</h2><small>{uniqueGroups.length} classes</small></div><div className="ad-class-attendance-grid">{classSummary.map(item=><button key={item.group} onClick={()=>showAbsent('students',item.group)}><span className={`ad-icon av-${item.index%6}`}><Icon name="School"/></span><div><b>{item.group}</b><small>{item.present} present · {item.absent} absent</small><i><span style={{width:`${percent(item.present,item.total)}%`}}/></i></div><em>{percent(item.present,item.total)}%</em><strong>View absent students</strong></button>)}{!classSummary.length&&<p className="ad-empty">Create classes and enroll students to see class attendance.</p>}</div></section>}
    </div>

    <section className="ad-panel ad-attendance-register">
      <div className="ad-toolbar"><div><span className="ad-kicker">{section==='staff'?'TEAM REGISTER':'CLASS REGISTER'}</span><h2>{onlyAbsent?'Absent ':''}{section==='staff'?'Staff':'Students'}</h2><small>{visible.length} records for {date}</small></div><div className="ad-toolbar-actions"><button className="ad-button secondary" onClick={exportRows}><Icon name="Download" size={15}/>Export</button><button className="ad-button" onClick={markAll}><Icon name="CheckCheck" size={15}/>Mark visible present</button></div></div>
      <div className="ad-filters"><label><Icon name="Search" size={16}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder={`Search ${section}…`}/></label><select value={filter} onChange={event=>setFilter(event.target.value)}><option value="All">All {section==='staff'?'roles':'classes'}</option>{(section==='staff'?uniqueRoles:uniqueGroups).map(value=><option key={value} value={value}>{section==='staff'?staffRole(value):value}</option>)}</select><button className={`ad-absent-filter ${onlyAbsent?'active':''}`} onClick={()=>setOnlyAbsent(value=>!value)}><Icon name="UserX" size={14}/>{onlyAbsent?'Show everyone':`View absent ${section}`}</button></div>
      <div className="ad-table-scroll"><table><thead><tr><th>{section==='staff'?'Staff member':'Student'}</th><th>{section==='staff'?'Role':'Class'}</th><th>Status</th><th>Mark attendance</th></tr></thead><tbody>{visible.map((person,index)=><PersonRow key={person.id||index} person={person} index={index} status={status(person)} onMark={section==='staff'?markStaff:mark} Avatar={Avatar} Badge={Badge} type={section}/>)}</tbody></table>{!visible.length&&<div className="ad-empty"><Icon name={onlyAbsent?'BadgeCheck':'Search'} size={30}/><strong>{onlyAbsent?'No absent records':'No matching records'}</strong><span>{onlyAbsent?'Everyone in this view is accounted for.':'Change the search or filter and try again.'}</span></div>}</div>
      <div className="ad-table-footer"><span>{counts.Present+counts.Absent+(section==='staff'?counts.Leave:0)} of {current.length} marked</span><span>{date}</span></div>
    </section>
  </div>
}
