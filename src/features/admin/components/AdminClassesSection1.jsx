import { Link } from 'react-router-dom'
import Icon from '../../../components/ui/Icon'

export default function AdminClassesSection1({Metrics,classes=[],students=[],setModal,search='',base}) {
 const visible=classes.filter(c=>`${c.name||''} ${c.level||c.group||''} ${c.id||''}`.toLowerCase().includes(search.toLowerCase()))
 const byLevel=level=>classes.filter(c=>(c.level||c.group)===level).length
 return <>
  <Metrics items={[
   ['Classes',classes.length,'Registered classes','School','blue'],
   ['Lower Level',byLevel('Lower'),'Hoose','BookOpen','green'],
   ['Middle Level',byLevel('Middle'),'Dhexe','Layers3','purple'],
   ['Upper Level',byLevel('Upper'),'Sare','GraduationCap','orange'],
  ]}/>
  <div className="ad-section-toolbar"><h2>Registered Classes</h2><button className="ad-button" onClick={()=>setModal({type:'class'})}><Icon name="Plus" size={17}/> Create Class</button></div>
  <div className="ad-class-grid">{visible.map((classroom,index)=>{
   const level=classroom.level||classroom.group||'Lower'
   const count=students.filter(student=>student.classId===classroom.id||(!student.classId&&(student.group===classroom.group||student.group===classroom.name))).length
   return <section key={classroom.id} className="ad-panel ad-class-card">
    <div className={`ad-class-banner av-${index%6}`}><Icon name={['Sun','Rainbow','Flower2','Star'][index%4]} size={48}/><span>{level}</span><small>{level==='Lower'?'HOOSE':level==='Middle'?'DHEXE':'SARE'}</small></div>
    <div className="ad-class-body"><span className="ad-class-id">{classroom.id}</span><h2>{classroom.name||'Untitled Class'}</h2><p><Icon name="Layers3" size={15}/>Education level: {level}</p><p><Icon name="MapPin" size={15}/>Room: {classroom.room||classroom.details?.room||'Not assigned'}</p><div className="ad-capacity"><span>Students</span><strong>{count} / {classroom.capacity||classroom.details?.capacity||'—'} enrolled</strong></div><div className="ad-class-actions"><Link to={`${base}/students?class=${encodeURIComponent(classroom.id)}`}>View students <Icon name="ArrowRight" size={14}/></Link><button onClick={()=>setModal({type:'class',item:classroom})} aria-label={`Edit ${classroom.name||'class'}`}><Icon name="Pencil" size={15}/></button></div></div>
   </section>
  })}</div>
  {!visible.length&&<div className="ad-empty"><Icon name="School" size={28}/><strong>No classes found</strong><span>Create a class with its name and education level.</span></div>}
 </>
}
