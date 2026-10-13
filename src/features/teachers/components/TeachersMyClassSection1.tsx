import { Link } from 'react-router-dom';
import Icon from '../../../components/ui/Icon'
import { Badge, Panel, Metrics } from '../../../components/ui/TeacherUI';
import { teacherBase as base } from '../../../data/teacherData';
import type { Lesson, Student, TeacherSettings } from '../types'
import type { ReactNode } from 'react'

interface Props { settings: TeacherSettings; students: Student[]; present: number; classAverage: number; lessons: Lesson[]; scheduleContent: ReactNode; visibleLessons: Lesson[] }

export default function TeachersMyClassSection1({settings, students, present, classAverage, lessons, scheduleContent, visibleLessons}: Props) {
 return (<>
          <section className="tc-class-hero"><div><span className="ad-icon orange"><Icon name="Sun" size={28}/></span><span className="tc-overline">OUR LITTLE LEARNING COMMUNITY</span><h2>{settings.className}</h2><p>Ages 4–5 · {settings.room} · 8:00 AM – 12:00 PM</p><div><Link className="ad-button" to={`${base}/students`}>Meet the class <Icon name="ArrowRight" size={15}/></Link><Link className="ad-button secondary" to={`${base}/attendance`}>Take Attendance</Link></div></div><img src="/gallery/art.png" alt="Children enjoying a creative classroom activity"/></section>
          <Metrics items={[[ 'Little Learners',students.length,'Learning together','UsersRound','blue'],['Class Attendance',`${Math.round(present/students.length*100)||0}%`,'Present today','UserCheck','green'],['Class Average',`${classAverage}%`,'Across five learning areas','ChartNoAxesCombined','purple'],['Weekly Plans',lessons.length,'Ready for discovery','BookOpen','orange']]}/>
          <div className="tc-two-col"><Panel title="Our Daily Rhythm" icon="CalendarDays">{scheduleContent}<p className="tc-note">Monday–Friday · Break and snack time: 10:00–10:15 AM</p></Panel><Panel title="This Week's Learning" icon="Sparkles" link="lesson-plans" label="Open lesson plans"><div className="tc-learning-list">{visibleLessons.slice(0,3).map((l,i)=><Link to={`${base}/lesson-plans`} key={l.id}><span className={`ad-icon ${['blue','purple','green'][i]}`}><Icon name="BookOpen"/></span><div><strong>{l.title}</strong><small>{l.subject} · {l.duration} minutes</small></div><Badge>{l.status}</Badge></Link>)}</div></Panel></div>
          <Panel title="Classroom Moments" icon="Images" className="tc-gallery-panel"><div className="tc-gallery">{[['art','Little artists, big imaginations'],['story','A story shared is a world discovered'],['playground','Learning through play']].map(([src,caption])=><figure key={src}><img src={`/gallery/${src}.png`} alt={caption}/><figcaption>{caption}</figcaption></figure>)}</div></Panel>
        </>)
}
