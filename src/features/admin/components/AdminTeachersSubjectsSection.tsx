import Icon from '../../../components/ui/Icon'

const money = value => Number(value || 0).toLocaleString('en-US')

export default function AdminTeachersSubjectsSection({Metrics,teachers,subjects,search,setModal,Avatar}) {
 const needle=(search||'').toLowerCase()
 const visibleTeachers=teachers.filter(t=>`${t.name||''} ${t.loginId||''} ${t.email||''} ${t.phone||''} ${t.location||''}`.toLowerCase().includes(needle))
 const visibleSubjects=subjects.filter(s=>`${s.name||''} ${teachers.filter(t=>(s.teacherIds||[]).includes(t.id)).map(t=>t.name).join(' ')}`.toLowerCase().includes(needle))
 const interns=teachers.filter(t=>t.employmentType==='internship').length
 return <>
  <Metrics items={[
   ['Teachers',teachers.length,'Registered teachers','GraduationCap','blue'],
   ['Subjects',subjects.length,'Available subjects','BookOpen','purple'],
   ['Salaried',teachers.length-interns,'Monthly contracts','WalletCards','green'],
   ['Internships',interns,'Training placements','CalendarClock','orange'],
  ]}/>
  <div className="ad-teacher-subject-grid">
   <section className="ad-panel ad-directory">
    <div className="ad-toolbar"><div><h2>Teachers</h2><small>{visibleTeachers.length} teachers · IDs are created automatically</small></div><button className="ad-button" onClick={()=>setModal({type:'teacher',employmentType:'salary'})}><Icon name="Plus" size={17}/> Add Teacher</button></div>
    <div className="ad-table-scroll"><table><thead><tr><th>Teacher</th><th>Phone & location</th><th>Contract</th><th>Subjects</th><th>Action</th></tr></thead><tbody>{visibleTeachers.map((teacher,index)=>{
     const assigned=subjects.filter(subject=>(subject.teacherIds||[]).includes(teacher.id))
     return <tr key={teacher.id}><td><div className="ad-person"><Avatar name={teacher.name} index={index}/><div><strong>{teacher.name||'Unnamed'}</strong><small>ID {teacher.loginId||teacher.id} · {teacher.email||'No email'}</small></div></div></td><td>{teacher.phone||'—'}<small className="ad-cell-note">{teacher.location||'No location'}</small></td><td><span className="ad-class-tag">{teacher.employmentType==='internship'?`Internship · ${teacher.internshipMonths||0} months`:`${money(teacher.monthlySalary)} / month`}</span></td><td><div className="ad-tag-list">{assigned.length?assigned.map(subject=><span key={subject.id}>{subject.name}</span>):<small>Unassigned</small>}</div></td><td><button className="ad-edit" onClick={()=>setModal({type:'teacher',item:teacher,employmentType:teacher.employmentType||'salary'})}><Icon name="Pencil" size={15}/> Edit</button></td></tr>
    })}</tbody></table>{!visibleTeachers.length&&<div className="ad-empty"><Icon name="GraduationCap" size={28}/><strong>No teachers found</strong></div>}</div>
   </section>
   <section className="ad-panel ad-directory">
    <div className="ad-toolbar"><div><h2>Subjects</h2><small>Create a subject and assign several teachers</small></div><button className="ad-button" onClick={()=>setModal({type:'subject'})}><Icon name="Plus" size={17}/> Add Subject</button></div>
    <div className="ad-subject-list">{visibleSubjects.map((subject,index)=>{
     const assigned=teachers.filter(teacher=>(subject.teacherIds||[]).includes(teacher.id))
     return <article key={subject.id}><span className={`ad-icon ${['blue','purple','green','orange'][index%4]}`}><Icon name="BookOpen"/></span><div><h3>{subject.name}</h3><small>{subject.id}</small><div className="ad-tag-list">{assigned.length?assigned.map(teacher=><span key={teacher.id}>{teacher.name}</span>):<small>No teacher assigned</small>}</div></div><button className="ad-edit" onClick={()=>setModal({type:'subject',item:subject})}><Icon name="Pencil" size={15}/> Edit</button></article>
    })}{!visibleSubjects.length&&<div className="ad-empty"><Icon name="BookOpen" size={28}/><strong>No subjects found</strong></div>}</div>
   </section>
  </div>
 </>
}
