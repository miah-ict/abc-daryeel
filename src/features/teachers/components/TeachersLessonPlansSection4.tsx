import Icon from '../../../components/ui/Icon'
import { Badge, Metrics, Empty } from '../../../components/ui/TeacherUI';
import { friendlyDate } from '../../../data/teacherData';
import type { Lesson, SearchField, StateSetter, TeacherModal, TeacherSettings } from '../types'
import type { ReactNode } from 'react'

interface Props { lessons: Lesson[]; setModal: StateSetter<TeacherModal | null>; searchField: SearchField; subjectFilter: ReactNode; visibleLessons: Lesson[]; settings: TeacherSettings }
const lessonIcons: Record<string, string> = {Math:'Calculator',Language:'BookOpen',Art:'Palette',Science:'Sprout',Social:'Heart'}

export default function TeachersLessonPlansSection4({lessons, setModal, searchField, subjectFilter, visibleLessons, settings}: Props) {
 return (<>
          <Metrics items={[[ 'Lesson Plans',lessons.length,'Moments of discovery','BookOpen','blue'],['Ready to Teach',lessons.filter(l=>l.status==='Ready').length,'Let the learning begin','CircleCheck','green'],['Drafts',lessons.filter(l=>l.status==='Draft').length,'Ideas taking shape','Pencil','orange'],['Learning Areas',new Set(lessons.map(l=>l.subject)).size,'A balanced classroom','Palette','purple']]}/>
          <div className="ad-section-toolbar"><h2>Your Teaching Plans</h2><button className="ad-button" onClick={()=>setModal({type:'lesson'})}><Icon name="Plus" size={17}/>Create Lesson Plan</button></div><div className="ad-filters">{searchField('Search lesson plans…')}{subjectFilter}</div><div className="tc-lesson-grid">{visibleLessons.map((lesson,i)=><article className="ad-panel tc-lesson-card" key={lesson.id}><div className={`tc-lesson-banner av-${i%6}`}><Icon name={lessonIcons[lesson.subject] ?? 'BookOpen'} size={38}/><span>{lesson.subject}</span><Badge>{lesson.status}</Badge></div><div className="tc-lesson-body"><small><Icon name="CalendarDays" size={13}/>{friendlyDate(lesson.date,{year:undefined})}<span>·</span><Icon name="Clock" size={13}/>{lesson.duration} min</small><h2>{lesson.title}</h2><p>{lesson.objective}</p><div className="tc-lesson-footer"><span>KG 1 · {settings.name}</span><button className="ad-edit" onClick={()=>setModal({type:'lesson',item:lesson})}><Icon name="Pencil" size={14}/>Edit Plan</button></div></div></article>)}</div>{!visibleLessons.length&&<Empty title="No lesson plans found">Create a plan or try a different search.</Empty>}
        </>)
}
