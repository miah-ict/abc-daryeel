import Icon from '../../../components/ui/Icon'
import { Empty } from '../../../components/ui/TeacherUI';
import { showDate } from '../../../data/studentData';

export default function StudentsMyAssignmentsSection2({gradeLevel, assignments, pending, filter, setFilter, search, setSearch, filteredAssignments, Pill, setModal}) {
 return (<>
          <div className="st-summary-grid">{[['My Assignments',assignments.length,'ClipboardList','blue'],['To Do',pending,'Star','orange'],['Submitted',assignments.length-pending,'CircleCheck','green']].map(([label,value,icon,tone])=><div className="st-panel st-summary" key={label}><span className={`st-big-icon ${tone}`}><Icon name={icon} size={27}/></span><div><small>{label}</small><strong>{value}</strong></div></div>)}</div>
          <div className="st-filterbar"><div role="tablist" aria-label="Assignment status">{['All','Pending','Submitted'].map(x=><button role="tab" aria-selected={filter===x} key={x} onClick={()=>setFilter(x)}>{x==='Pending'?'To Do':x}</button>)}</div><label><Icon name="Search" size={17}/><input aria-label="Search assignments" placeholder="Find an assignment…" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
          <div className="st-assignment-grid">{filteredAssignments.map(a=><article className="st-panel st-assignment-card" key={a.id}><div><span className={`st-big-icon ${a.tone}`}><Icon name={a.icon} size={28}/></span><Pill>{a.status}</Pill></div><span className="st-subject-label">{a.subject}{gradeLevel?` · ${gradeLevel}`:''}</span><h2>{a.title}</h2><p>{a.description}</p><div className="st-assignment-due"><Icon name="CalendarDays" size={15}/>Due {showDate(a.due,{year:undefined})}</div><button className="st-primary" onClick={()=>setModal({type:'assignment',item:a})}>{a.status==='Pending'?'Let’s Get Started':'View My Work'}<Icon name="ArrowRight" size={16}/></button></article>)}</div>{!filteredAssignments.length&&<Empty title="You’re all caught up!">Try another filter to find your assignments.</Empty>}
        </>)
}
