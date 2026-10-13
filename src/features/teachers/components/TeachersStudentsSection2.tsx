import Icon from '../../../components/ui/Icon'
import { Avatar, Badge, Metrics, Empty, exportCsv } from '../../../components/ui/TeacherUI';
import type { AttendanceStatus, SearchField, Student, TeacherModal, TeacherSettings, StateSetter } from '../types'

interface Props { students: Student[]; present: number; absent: number; classAverage: number; visibleStudents: Student[]; settings: TeacherSettings; setToast: StateSetter<string>; searchField: SearchField; setModal: StateSetter<TeacherModal | null>; statusFor: (student: Student) => AttendanceStatus; studentAverage: (id: string) => number }

export default function TeachersStudentsSection2({students, present, absent, classAverage, visibleStudents, settings, setToast, searchField, setModal, statusFor, studentAverage}: Props) {
 return (<>
          <Metrics items={[[ 'My Students',students.length,'KG 1 · Morning Class','UsersRound','blue'],['Present Today',present,'Ready to learn','UserCheck','green'],['Absent Today',absent,'Missed in class','UserX','pink'],['Class Average',`${classAverage}%`,'Growing every day','Sparkles','purple']]}/>
          <section className="ad-panel"><div className="ad-toolbar"><div><h2>Meet Our Little Learners</h2><small>{visibleStudents.length} students · {settings.className}</small></div><button className="ad-button secondary" onClick={()=>{exportCsv('kg1-students.csv',[['ID','Name','Age','Guardian','Email'],...visibleStudents.map(s=>[s.id,s.name,s.age,s.guardian,s.email])]);setToast('Student directory prepared for download')}}><Icon name="Download" size={16}/>Export Directory</button></div><div className="ad-filters">{searchField('Search students or parents…')}</div><div className="tc-student-grid">{visibleStudents.map((s,i)=><button className="tc-student-card" key={s.id} onClick={()=>setModal({type:'student',item:s})}><Avatar name={s.name} index={i} large/><h3>{s.name}</h3><small>{s.id} · {s.age} years old</small><Badge>{statusFor(s)}</Badge><div><span>Learning progress</span><strong>{studentAverage(s.id)}%</strong></div><span className="ad-progress"><span style={{width:`${studentAverage(s.id)}%`}}/></span><span className="tc-view-profile">View student <Icon name="ArrowRight" size={13}/></span></button>)}</div>{!visibleStudents.length&&<Empty title="No students found"/>}</section>
        </>)
}
