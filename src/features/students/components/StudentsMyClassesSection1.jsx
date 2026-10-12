import { Link } from 'react-router-dom';
import Icon from '../../../components/ui/Icon'
import { Avatar, Empty } from '../../../components/ui/TeacherUI';
import { studentBase as base } from '../../../data/studentData';

export default function StudentsMyClassesSection1({profile, classroom, filteredSubjects, setModal, ReferenceArt, Pill, Section, activityList}) {
 const teacher=profile.teacher
 return (<>
          <section className="st-class-welcome"><div><span className="st-eyebrow">MY HAPPY PLACE TO LEARN</span><h2>{profile.gradeLevel||'Class assignment pending'}</h2><p>{teacher?.name?`With ${teacher.name}`:'Teacher assignment pending'}{classroom?.room?` · ${classroom.room}`:''}</p><Link className="st-primary" to={`${base}/messages`}>Message My Teacher <Icon name="MessageCircle" size={16}/></Link></div><img src="/gallery/story.png" alt="Story time in our classroom"/></section>
          <div className="st-section-title"><h2>My Learning Adventures</h2><span>{filteredSubjects.length} subjects to explore</span></div><div className="st-class-grid">{filteredSubjects.map(s=><button className="st-panel st-class-card" key={s.id} onClick={()=>setModal({type:'class',item:s})}><div className={`st-class-banner ${s.tone}`}><ReferenceArt x={s.art[0]} y={s.art[1]} w={s.art[2]} h={s.art[3]} width={78}/><Pill>{s.label}</Pill></div><div className="st-class-card-body"><h3>{s.name}</h3><p>{s.description}</p><span><Icon name="UserRound" size={14}/>{s.teacher}</span><small><Icon name="Clock3" size={14}/>{s.time}</small><b>Explore class <Icon name="ArrowRight" size={15}/></b></div></button>)}</div>{!filteredSubjects.length&&<Empty title="No classes found"/>}
          <div className="st-two-columns st-schedule-section" id="schedule"><Section title="Today’s Activities" icon="CalendarDays">{activityList}</Section><Section title="Meet My Teacher" icon="Heart">{teacher?<div className="st-teacher-card"><Avatar name={teacher.name} large/><h3>{teacher.name}</h3><span>Class Teacher</span><p>Your teacher can share lessons, assignments, and messages through the school portal.</p><Link className="st-primary" to={`${base}/messages`}>Say Hello <Icon name="MessageCircle" size={16}/></Link></div>:<Empty title="Teacher not assigned yet">Your teacher will appear here after the school assigns one.</Empty>}</Section></div>
        </>)
}
