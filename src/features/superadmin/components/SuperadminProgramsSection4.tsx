import Icon from '../../../components/ui/Icon'
import { Empty } from '../../../components/ui/TeacherUI';
import { programGroups } from '../../../data/superadminData';
import type { FilterRenderer, Program, StatusComponent } from '../types'

interface Props { programs: Program[]; edit: (kind: 'program', item?: Program) => unknown; filters: FilterRenderer; shownPrograms: Program[]; Status: StatusComponent }

export default function SuperadminProgramsSection4({programs, edit, filters, shownPrograms, Status}: Props) {
 return (<><div className="sa-section-bar"><span>{programs.length} programs · A brighter start for every child</span><button className="sa-button" onClick={()=>edit('program')}>+ Add Program</button></div>{filters(programGroups,'Search programs…')}<div className="sa-program-grid">{shownPrograms.map((p,i)=><section className="sa-panel sa-program-card" key={p.id}><div className={`sa-program-banner ${['blue','purple','green','orange'][programGroups.indexOf(p.category)]}`}><Icon name={['Baby','Blocks','BookOpen','GraduationCap'][programGroups.indexOf(p.category)]} size={40}/><span>{p.age}</span></div><div><Status value={p.status}/><h2>{p.name}</h2><p>{p.category}</p><div className="sa-program-count"><span>Enrolled students</span><strong>{p.enrolled}</strong></div><button className="sa-button secondary" onClick={()=>edit('program',p)}>Manage Program <Icon name="ArrowRight" size={14}/></button></div></section>)}</div>{!shownPrograms.length&&<Empty/>}</>)
}
