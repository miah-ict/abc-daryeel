import {useEffect,useMemo,useState} from 'react'
import Icon from '../../../components/ui/Icon'
import {ExamEmpty,ExamStatus,formatExamDate,percent} from './ExamV2UI'

const steps=[
 ['Academic year','CalendarRange','Name the school year and set its active dates.'],
 ['Class progression','ListOrdered','Arrange classes in order and identify the final class.'],
 ['Pass rules','BadgeCheck','Review the average, subject minimum and decimal policy.'],
 ['Exam templates','LayoutTemplate','Prepare reusable names, subjects, marks and promotion behavior.'],
 ['Course settings','Rocket','Review whether accelerated courses are available and how they are governed.'],
]

function validateSetupStep(step: any,draft: any,classes: any[],subjects: any[]){
 if(step===0){if(!draft.yearName?.trim()||!draft.startDate||!draft.endDate)throw new Error('Enter the academic year name, start date and end date.');if(draft.endDate<=draft.startDate)throw new Error('End date must be after the start date.')}
 if(step===1&&!classes.length)throw new Error('Create at least one class before configuring progression.')
 if(step===2){const pass=Number(draft.passAverage),minimum=Number(draft.subjectMinimum||0);if(!Number.isFinite(pass)||pass<0||pass>100)throw new Error('Pass average must be between 0 and 100.');if(minimum<0||minimum>100)throw new Error('Subject minimum must be between 0 and 100.')}
 if(step===3){const selected=Array.isArray(draft.templateSubjectIds)?draft.templateSubjectIds:subjects.map(item=>item.id);if(!draft.templateName?.trim())throw new Error('Enter a starter exam template name.');if(!selected.length)throw new Error('Select at least one subject for the starter template.');if(Number(draft.templateSubjectMinimum||0)>Number(draft.templateMaxMarks||100))throw new Error('Subject minimum cannot exceed the maximum mark.')}
 if(step===4&&draft.courseEnabled){if(!(Number(draft.courseDurationMonths)>0)&&draft.courseDurationMonths!=='')throw new Error('Course duration must be greater than zero.');if(Number(draft.coursePassMark||0)>100)throw new Error('Course pass mark cannot exceed 100%.')}
}

const field=(object,...keys)=>keys.find(key=>object?.[key]!==undefined)!=null?object[keys.find(key=>object?.[key]!==undefined)]:''

function SetupStep({index,draft,setDraft,classes=[],subjects=[],readOnly}: any){
 const update=event=>setDraft(old=>({...old,[event.target.name]:event.target.type==='checkbox'?event.target.checked:event.target.value}))
 if(index===0)return <div className="exam-v2-form-grid">
  <label>Academic year name<input name="yearName" value={draft.yearName||''} onChange={update} disabled={readOnly} required placeholder="2026–2027"/></label>
  <label>Start date<input name="startDate" type="date" value={draft.startDate||''} onChange={update} disabled={readOnly} required/></label>
  <label>End date<input name="endDate" type="date" value={draft.endDate||''} onChange={update} disabled={readOnly} required/></label>
  <label className="exam-v2-switch"><span><strong>Active academic year</strong><small>Use this year for new exam sessions.</small></span><input name="active" type="checkbox" checked={Boolean(draft.active)} onChange={update} disabled={readOnly}/></label>
 </div>
 if(index===1){
  const saved=(draft.classOrder||[]).filter(id=>classes.some(item=>item.id===id)),order=[...saved,...classes.map(item=>item.id).filter(id=>!saved.includes(id))].map(id=>classes.find(item=>item.id===id)),finalId=draft.finalClassId||order[order.length-1]?.id
  const move=(position,delta)=>{const ids=order.map(item=>item.id),target=position+delta;if(target<0||target>=ids.length)return;[ids[position],ids[target]]=[ids[target],ids[position]];setDraft(old=>({...old,classOrder:ids}))}
  return <div className="exam-v2-progression"><p className="ad-local-note"><Icon name="GripVertical" size={16}/>Arrange classes in the order students move up (Class 1 → Class 2 → Class 3). Classes after the final class are left out of promotion.</p>{order.map((item,position)=><div key={item.id}><b>{position+1}</b><span><strong>{item.name}</strong><small>{item.level||item.group||'Education level not set'}{position<order.findIndex(entry=>entry.id===finalId)?' → '+order[position+1].name:''}</small></span><button type="button" className="ad-button secondary" aria-label={`Move ${item.name} up`} onClick={()=>move(position,-1)} disabled={readOnly||position===0}><Icon name="ArrowUp" size={14}/></button><button type="button" className="ad-button secondary" aria-label={`Move ${item.name} down`} onClick={()=>move(position,1)} disabled={readOnly||position===order.length-1}><Icon name="ArrowDown" size={14}/></button><label><input type="radio" name="finalClass" value={item.id} checked={finalId===item.id} onChange={event=>setDraft(old=>({...old,classOrder:order.map(entry=>entry.id),finalClassId:event.target.value}))} disabled={readOnly}/>Final / graduating class</label></div>)}{!classes.length&&<ExamEmpty icon="School" title="No classes available" description="Create classroom records before configuring progression."/>}</div>
 }
 if(index===2)return <div className="exam-v2-form-grid">
  <label>Pass average (%)<input name="passAverage" type="number" min="0" max="100" required placeholder="50" value={draft.passAverage??''} onChange={update} disabled={readOnly}/></label>
  <label>Fail below average (%)<input name="failBelow" type="number" min="0" max="100" required placeholder="50" value={draft.failBelow??draft.passAverage??''} onChange={update} disabled={readOnly}/></label>
  <label>Minimum mark per subject<input name="subjectMinimum" type="number" min="0" max="100" required placeholder="40" value={draft.subjectMinimum??''} onChange={update} disabled={readOnly}/></label>
  <label>Decimal display<select name="decimalPlaces" value={draft.decimalPlaces??'2'} onChange={update} disabled={readOnly}><option value="0">Whole number</option><option value="1">1 decimal</option><option value="2">2 decimals</option></select></label>
  <div className="exam-v2-policy-warning"><Icon name="Scale"/><div><strong>Rules applied by the server</strong><p>A learner must meet the overall average and the minimum mark for every required subject. Late submissions stay locked until an admin reopens them.</p></div></div>
 </div>
 if(index===3){
  const selected=Array.isArray(draft.templateSubjectIds)?draft.templateSubjectIds:subjects.map(item=>item.id)
  const toggleSubject=(id,checked)=>setDraft(old=>({...old,templateSubjectIds:checked?[...new Set([...(Array.isArray(old.templateSubjectIds)?old.templateSubjectIds:subjects.map(item=>item.id)),id])]:(Array.isArray(old.templateSubjectIds)?old.templateSubjectIds:subjects.map(item=>item.id)).filter(item=>item!==id)}))
  return <div className="exam-v2-template-preview"><div><span className="ad-icon purple"><Icon name="FileStack"/></span><div><strong>Starter exam template</strong><small>This template is saved to the database when setup is completed.</small></div></div><dl><dt>Name</dt><dd>{draft.templateName||'Final Exam'}</dd><dt>Category</dt><dd>{draft.templateCategory||'Final'}</dd><dt>Selected subjects</dt><dd>{selected.length}</dd></dl><div className="exam-v2-form-grid">
   <label>Template name<input name="templateName" value={draft.templateName||''} onChange={update} disabled={readOnly} placeholder="Final Exam"/></label>
   <label>Category<select name="templateCategory" value={draft.templateCategory||'Final'} onChange={update} disabled={readOnly}><option>Monthly</option><option>Midterm</option><option>Final</option><option>Re-exam</option><option>Course</option></select></label>
   <label>Maximum mark per subject<input name="templateMaxMarks" type="number" min="1" value={draft.templateMaxMarks??100} onChange={update} disabled={readOnly}/></label>
   <label>Pass average (%)<input name="templatePassAverage" type="number" min="0" max="100" value={draft.templatePassAverage??draft.passAverage??50} onChange={update} disabled={readOnly}/></label>
   <label>Minimum mark per subject<input name="templateSubjectMinimum" type="number" min="0" value={draft.templateSubjectMinimum??draft.subjectMinimum??0} onChange={update} disabled={readOnly}/></label>
   <label>Result visibility<select disabled value="PublishedOnly"><option>After admin publishes</option></select></label>
   <label className="exam-v2-switch"><span><strong>Promotion exam</strong><small>Use this exam when calculating promotion.</small></span><input name="templatePromotion" type="checkbox" checked={Boolean(draft.templatePromotion??((draft.templateCategory||'Final')==='Final'))} onChange={update} disabled={readOnly}/></label>
   <label className="exam-v2-switch"><span><strong>Allow re-exam</strong><small>Failed learners can be assigned a re-exam.</small></span><input name="templateReExam" type="checkbox" checked={Boolean(draft.templateReExam??((draft.templateCategory||'Final')==='Final'))} onChange={update} disabled={readOnly}/></label>
  </div><fieldset className="exam-v2-subject-picker"><legend>Subjects included</legend>{subjects.map(subject=><label key={subject.id}><input type="checkbox" checked={selected.includes(subject.id)} onChange={event=>toggleSubject(subject.id,event.target.checked)} disabled={readOnly}/><span>{subject.name}</span></label>)}{!subjects.length&&<p className="ad-local-note">Add school subjects before completing exam setup.</p>}</fieldset></div>
 }
 return <div className="exam-v2-form-grid">
  <label className="exam-v2-switch"><span><strong>Course feature</strong><small>Keep disabled until consent and finance policies are approved.</small></span><input name="courseEnabled" type="checkbox" checked={Boolean(draft.courseEnabled)} onChange={update} disabled={readOnly}/></label>
  <label>Default duration (months)<input name="courseDurationMonths" type="number" min="1" value={draft.courseDurationMonths||''} onChange={update} disabled={readOnly||!draft.courseEnabled}/></label>
  <label>Default capacity<input name="courseCapacity" type="number" min="1" value={draft.courseCapacity||''} onChange={update} disabled={readOnly||!draft.courseEnabled}/></label>
  <label>Default fee<input name="courseFee" type="number" min="0" step="0.01" value={draft.courseFee??''} onChange={update} disabled={readOnly||!draft.courseEnabled}/></label>
  <label>Eligibility average (%)<input name="courseEligibilityAverage" type="number" min="0" value={draft.courseEligibilityAverage||''} onChange={update} disabled={readOnly||!draft.courseEnabled}/></label>
  <label>Course exam pass mark (%)<input name="coursePassMark" type="number" min="0" max="100" value={draft.coursePassMark||''} onChange={update} disabled={readOnly||!draft.courseEnabled}/></label>
  <label>Target accelerated class<select name="courseTargetClassId" value={draft.courseTargetClassId||''} onChange={update} disabled={readOnly||!draft.courseEnabled}><option value="">Choose target class</option>{classes.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
  <fieldset className="exam-v2-subject-picker"><legend>Classes allowed to join courses</legend>{classes.map(item=>{const selected=Array.isArray(draft.courseClassIds)?draft.courseClassIds:classes.map(row=>row.id);return <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={event=>setDraft(old=>({...old,courseClassIds:event.target.checked?[...new Set([...(Array.isArray(old.courseClassIds)?old.courseClassIds:classes.map(row=>row.id)),item.id])]:(Array.isArray(old.courseClassIds)?old.courseClassIds:classes.map(row=>row.id)).filter(id=>id!==item.id)}))} disabled={readOnly||!draft.courseEnabled}/><span>{item.name}</span></label>})}</fieldset>
  <div className="exam-v2-policy-warning"><Icon name="ShieldCheck"/><div><strong>Consent and payment remain server-owned</strong><p>Enabling the feature does not approve a consent rule, reserve seats, or mark fees paid.</p></div></div>
 </div>
}

export function AdminExamOnboarding({model,classes,subjects,onSave,onComplete,writable=true,settingsMode=false,onExit}: any){
 const [step,setStep]=useState(Math.max(0,Math.min(4,Number(model?.currentStep||0)))),[draft,setDraft]=useState(model?.draft||{}),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const save=async next=>{if(!writable)return;setBusy(true);setError('');try{validateSetupStep(step,draft,classes,subjects);const result=await onSave?.({step,draft,classes});if(result?.draft)setDraft(result.draft);if(next)setStep(value=>Math.min(4,value+1))}catch(reason){setError(reason.message)}finally{setBusy(false)}}
 const complete=async()=>{if(!writable)return;setBusy(true);setError('');try{validateSetupStep(4,draft,classes,subjects);validateSetupStep(3,draft,classes,subjects);await onComplete?.({step:4,draft,classes,subjects})}catch(reason){setError(reason.message)}finally{setBusy(false)}}
 return <section className="ad-panel exam-v2-onboarding" aria-labelledby="exam-setup-title">
  <header><div><span className="ad-icon purple"><Icon name={settingsMode?'Settings2':'Sparkles'}/></span><div><small>{settingsMode?'Exam settings':'First-time setup'}</small><h2 id="exam-setup-title">{settingsMode?'Review exam foundations':'Set up trusted exam workflows'}</h2><p>{settingsMode?'Changes create a new server-owned policy version.':'Five guided steps prepare the school before teachers enter marks.'}</p></div></div>{settingsMode&&onExit&&<button className="ad-button secondary" onClick={onExit}><Icon name="X" size={16}/>Close settings</button>}</header>
  <ol className="exam-v2-steps" aria-label="Exam setup progress">{steps.map(([label,icon],index)=><li key={label} className={index===step?'active':index<step?'done':''}><button type="button" onClick={()=>index<=step&&setStep(index)} aria-current={index===step?'step':undefined} disabled={index>step}><span>{index<step?<Icon name="Check" size={15}/>:index+1}</span><Icon name={icon} size={16}/><b>{label}</b></button></li>)}</ol>
  <div className="exam-v2-step-copy"><span>Step {step+1} of 5</span><h3>{steps[step][0]}</h3><p>{steps[step][2]}</p></div>
  {!writable&&<p className="ad-local-note"><Icon name="LockKeyhole" size={16}/>This setup is a read-only preview until the Exam v2 contract is enabled.</p>}
  <SetupStep index={step} draft={draft} setDraft={setDraft} classes={classes} subjects={subjects} readOnly={!writable}/>
  {error&&<p className="ad-form-error" role="alert">{error}</p>}
  <footer><button type="button" className="ad-button secondary" onClick={()=>setStep(value=>Math.max(0,value-1))} disabled={!step||busy}><Icon name="ArrowLeft" size={16}/>Back</button><span>Drafts are saved on the school server.</span>{step<4?<button type="button" className="ad-button" onClick={()=>save(true)} disabled={!writable||busy}>{busy?'Saving…':'Save & Continue'}<Icon name="ArrowRight" size={16}/></button>:<button type="button" className="ad-button" onClick={complete} disabled={!writable||busy}><Icon name="BadgeCheck" size={16}/>{busy?'Completing…':'Review & Complete'}</button>}</footer>
 </section>
}

function TemplatesPanel({templates=[],subjects=[],writable,onCreate}: any){
 const blank={name:'',category:'Final',totalMarks:'100',minimumMarks:'40',passAverage:'50',promotionExam:true,reExamAllowed:true,picked:{},max:{},minimum:{}}
 const [creating,setCreating]=useState(false),[form,setForm]=useState(blank),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const set=(key,value)=>setForm(old=>({...old,[key]:value}))
 const category=event=>{const value=event.target.value;setForm(old=>({...old,category:value,promotionExam:value==='Final'?true:old.promotionExam,reExamAllowed:value==='Final'?true:old.reExamAllowed}))}
 const pick=(id,checked)=>setForm(old=>({...old,picked:{...old.picked,[id]:checked}}))
 const total=Number(form.totalMarks),maxFor=id=>form.max[id]??form.totalMarks,minFor=id=>form.minimum[id]??form.minimumMarks
 const submit=async event=>{event.preventDefault();setError('');const chosen=subjects.filter(item=>form.picked[item.id]);if(!chosen.length){setError('Select at least one subject.');return}if(!(total>0)){setError('Total marks must be greater than zero.');return}if(chosen.some(item=>Number(minFor(item.id))>Number(maxFor(item.id)))){setError('A subject minimum cannot exceed its maximum mark.');return}try{setBusy(true);await onCreate?.({name:form.name,category:form.category,totalMarks:total,passAverage:Number(form.passAverage),promotionExam:form.promotionExam,reExamAllowed:form.reExamAllowed,subjects:chosen.map(item=>({subjectId:item.id,maxMark:Number(maxFor(item.id)),minimumMark:Number(minFor(item.id))}))});setForm(blank);setCreating(false)}catch(reason){setError(reason.message)}finally{setBusy(false)}}
 return <section className="exam-v2-stack"><div className="ad-section-toolbar"><div><h2>Exam templates</h2><p>Reusable exam names with total marks, pass average, subjects and promotion behavior.</p></div><button className="ad-button" onClick={()=>setCreating(!creating)} disabled={!writable}><Icon name={creating?'X':'Plus'} size={16}/>{creating?'Close':'New template'}</button></div>
  {creating&&<form className="ad-panel exam-v2-editor" onSubmit={submit}><div className="exam-v2-form-grid">
   <label>Exam name<input name="name" value={form.name} onChange={event=>set('name',event.target.value)} required minLength={2} placeholder="Midterm, Final Exam, Monthly Exam"/></label>
   <label>Category<select name="category" value={form.category} onChange={category}><option>Monthly</option><option>Midterm</option><option>Final</option><option>Re-exam</option><option>Course</option></select></label>
   <label>Total marks per subject<input name="totalMarks" type="number" min="1" value={form.totalMarks} onChange={event=>set('totalMarks',event.target.value)} required/></label>
   <label>Default subject minimum<input name="minimumMarks" type="number" min="0" value={form.minimumMarks} onChange={event=>set('minimumMarks',event.target.value)} required/></label>
   <label>Pass average (%)<input name="passAverage" type="number" min="0" max="100" value={form.passAverage} onChange={event=>set('passAverage',event.target.value)} required/></label>
   <label>Promotion exam<select name="promotion" value={String(form.promotionExam)} onChange={event=>set('promotionExam',event.target.value==='true')}><option value="false">No</option><option value="true">Yes</option></select></label>
   <label>Re-exam allowed<select name="reExamAllowed" value={String(form.reExamAllowed)} onChange={event=>set('reExamAllowed',event.target.value==='true')}><option value="false">No</option><option value="true">Yes</option></select></label>
  </div><p className="ad-local-note"><Icon name="Eye" size={16}/>Results are visible to students only after an admin publishes the exam.</p>
  <fieldset><legend>Subjects, maximum marks and pass minimums</legend>{subjects.map(subject=><div key={subject.id}><label><input type="checkbox" name="subjectIds" checked={Boolean(form.picked[subject.id])} onChange={event=>pick(subject.id,event.target.checked)}/>{subject.name}</label><input aria-label={`${subject.name} maximum mark`} name={`max-${subject.id}`} type="number" min="1" value={maxFor(subject.id)} onChange={event=>setForm(old=>({...old,max:{...old.max,[subject.id]:event.target.value}}))} disabled={!form.picked[subject.id]}/><input aria-label={`${subject.name} minimum mark`} name={`minimum-${subject.id}`} type="number" min="0" value={minFor(subject.id)} onChange={event=>setForm(old=>({...old,minimum:{...old.minimum,[subject.id]:event.target.value}}))} disabled={!form.picked[subject.id]}/></div>)}{!subjects.length&&<p className="ad-local-note">Add subjects before creating a template.</p>}</fieldset>
  {error&&<p className="ad-form-error" role="alert">{error}</p>}<button className="ad-button" disabled={busy}><Icon name="Save" size={16}/>{busy?'Saving…':'Save template'}</button></form>}
  <div className="exam-v2-template-grid">{templates.map(template=><article className="ad-panel" key={template.id}><header><span className="ad-icon purple"><Icon name="LayoutTemplate"/></span><ExamStatus>{template.status||'Active'}</ExamStatus></header><h3>{template.name}</h3><p>{template.category} · Version {template.version||1}</p><dl><dt>Subjects</dt><dd>{template.subjectCount??template.subjects?.length??0}</dd><dt>Total marks</dt><dd>{template.rules?.totalMarks??template.totalMarks??'Per subject'}</dd><dt>Pass average</dt><dd>{(template.rules?.passAverage??template.passAverage)!=null?`${template.rules?.passAverage??template.passAverage}%`:'Policy default'}</dd><dt>Promotion exam</dt><dd>{template.promotionExam?'Yes':'No'}</dd><dt>Re-exam</dt><dd>{template.reExamAllowed?'Allowed':'Not allowed'}</dd></dl></article>)}{!templates.length&&<ExamEmpty icon="LayoutTemplate" title="No templates yet" description="Create a reusable exam template, then pick it when opening a new exam."/>}</div>
 </section>
}

function SubjectsPanel({subjects=[],legacySubjects=[],classes=[],teachers=[],years=[],writable,onCreateSubject,onCreateOffering}: any){
 const [name,setName]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
 const missing=legacySubjects.filter(item=>item.name&&!subjects.some(row=>row.name.trim().toLowerCase()===String(item.name).trim().toLowerCase()))
 const run=async work=>{setBusy(true);setError('');setNotice('');try{await work()}catch(reason){setError(reason.message)}finally{setBusy(false)}}
 const teacherLabel=item=>item.name||item.fullName||item.email
 return <section className="exam-v2-stack"><div className="ad-section-toolbar"><div><h2>Subjects and teachers</h2><p>Link each class and subject to its lead teacher. Exam assignments are generated from these links.</p></div></div>
  <div className="ad-panel exam-v2-editor"><h3>Exam subjects</h3><div className="exam-v2-template-preview"><ul>{subjects.map(item=><li key={item.id}>{item.name}</li>)}</ul>{!subjects.length&&<p className="ad-local-note">No exam subjects yet.</p>}</div>
   <form onSubmit={event=>{event.preventDefault();run(async()=>{await onCreateSubject(name);setName('');setNotice('Subject added.')})}}><div className="exam-v2-form-grid"><label>New subject<input value={name} onChange={event=>setName(event.target.value)} required minLength={1} placeholder="Mathematics"/></label></div><button className="ad-button" disabled={!writable||busy}><Icon name="Plus" size={16}/>Add subject</button></form>
   {missing.length>0&&<button type="button" className="ad-button secondary" disabled={!writable||busy} onClick={()=>run(async()=>{for(const item of missing)await onCreateSubject(item.name);setNotice(`Imported ${missing.length} subjects.`)})}><Icon name="Download" size={16}/>Import {missing.length} existing school subjects</button>}</div>
  <form className="ad-panel exam-v2-editor" onSubmit={event=>{event.preventDefault();const form=new FormData(event.currentTarget);run(async()=>{await onCreateOffering({academicYearId:form.get('academicYearId'),classId:form.get('classId'),subjectId:form.get('subjectId'),teacherId:form.get('teacherId')});setNotice('Class subject linked to teacher.')})}}><h3>Class subject teacher</h3><div className="exam-v2-form-grid">
   <label>Academic year<select name="academicYearId" required><option value="">Select year</option>{years.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
   <label>Class<select name="classId" required><option value="">Select class</option>{classes.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
   <label>Subject<select name="subjectId" required><option value="">Select subject</option>{subjects.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
   <label>Lead teacher<select name="teacherId" required><option value="">Select teacher</option>{teachers.map(item=><option key={item.id} value={item.id}>{teacherLabel(item)}</option>)}</select></label></div>
   <button className="ad-button" disabled={!writable||busy}><Icon name="Link" size={16}/>Link teacher</button></form>
  {error&&<p className="ad-form-error" role="alert">{error}</p>}{notice&&<p className="ad-local-note"><Icon name="Check" size={16}/>{notice}</p>}</section>
}

function SessionCreator({templates=[],years=[],classes=[],teachers=[],subjects=[],writable,onPreview,onCreate}: any){
 const [preview,setPreview]=useState(null),[request,setRequest]=useState(null),[error,setError]=useState(''),[issues,setIssues]=useState([]),[templateId,setTemplateId]=useState(''),[busy,setBusy]=useState(false),[created,setCreated]=useState(null)
 const template=templates.find(item=>item.id===templateId),teacherName=id=>teachers.find(item=>item.id===id)?.name||teachers.find(item=>item.id===id)?.fullName||'Teacher'
 const submit=async event=>{event.preventDefault();setError('');setIssues([]);setPreview(null);setCreated(null);const form=new FormData(event.currentTarget),all=form.get('allClasses')==='on',payload={templateId:form.get('templateId'),academicYearId:form.get('academicYearId'),term:form.get('term'),allClasses:all,classIds:all?[]:form.getAll('classIds'),startDate:form.get('startDate'),endDate:form.get('endDate'),teacherDeadline:new Date(String(form.get('teacherDeadline'))).toISOString(),publishMode:'Manual'};if(!all&&!payload.classIds.length){setError('Select at least one class or choose all classes.');return}try{const result=await onPreview?.(payload);setRequest(payload);setPreview(result)}catch(reason){setError(reason.message);setIssues(reason.payload?.issues||[])}}
 const create=async()=>{setBusy(true);setError('');try{setCreated(await onCreate?.({...request,title:`${template?.name||'Exam'} · ${request.term}`}))}catch(reason){setError(reason.message);setIssues(reason.payload?.issues||[])}finally{setBusy(false)}}
 return <section className="ad-panel exam-v2-session"><div className="ad-panel-head"><h2><span className="ad-icon blue"><Icon name="CalendarPlus"/></span>Create exam session</h2></div><form onSubmit={submit}><div className="exam-v2-form-grid"><label>Exam template<select name="templateId" required value={templateId} onChange={event=>setTemplateId(event.target.value)}><option value="">Select template</option>{templates.map(item=><option key={item.id} value={item.id}>{item.name} · v{item.version||1}</option>)}</select></label><label>Academic year<select name="academicYearId" required><option value="">Select year</option>{years.map(item=><option key={item.id} value={item.id}>{item.name} · {item.status}</option>)}</select></label><label>Term<input name="term" required placeholder="Term 1"/></label><label>Start date<input name="startDate" type="date" required/></label><label>End date<input name="endDate" type="date" required/></label><label>Teacher submission deadline<input name="teacherDeadline" type="datetime-local" required/></label></div>
  {template&&<div className="exam-v2-template-preview"><strong>{template.name}</strong><small>{template.rules?.totalMarks?`${template.rules.totalMarks} marks per subject`:'Per-subject marks'} · pass average {template.rules?.passAverage??'policy default'}% · {template.promotionExam?'Promotion exam':'No promotion'} · {template.reExamAllowed?'Re-exam allowed':'No re-exam'}</small><ul>{(template.subjects||[]).map(row=><li key={row.subjectId||row.id}>{subjects.find(item=>item.id===row.subjectId)?.name||subjects_label(row)}: {row.maxMark}</li>)}</ul></div>}
  <fieldset className="exam-v2-class-picker"><legend>Classes</legend><label><input type="checkbox" name="allClasses"/>All classes</label>{classes.map(item=><label key={item.id}><input name="classIds" value={item.id} type="checkbox"/>{item.name}</label>)}</fieldset><p className="ad-local-note"><Icon name="Eye" size={16}/>Preview is required. The server resolves one subject offering and one lead teacher for every class/subject pair. Results stay hidden until you publish manually.</p>{error&&<p className="ad-form-error" role="alert">{error}</p>}{issues.map((issue,index)=><p className="ad-form-error" key={`${issue.code}-${index}`}>{issue.message||issue.code}</p>)}<button className="ad-button" disabled={!writable}><Icon name="ScanSearch" size={16}/>Preview assignments</button></form>
  {preview&&<div className="exam-v2-preview"><header><div><strong>Assignment preview</strong><small>{preview.candidates?.length||0} class–subject assignments · {preview.summary?.selectedClasses||0} classes</small></div><ExamStatus>Ready</ExamStatus></header><div className="ad-table-scroll"><table><thead><tr><th>Class</th><th>Subject</th><th>Lead teacher</th><th>Maximum</th><th>Students</th></tr></thead><tbody>{(preview.candidates||[]).map((row,index)=><tr key={`${row.classId}-${row.subjectId}-${index}`}><td>{row.className}</td><td>{row.subjectName}</td><td>{teacherName(row.leadTeacherId)}</td><td>{row.maxMark}</td><td>{row.roster?.length??0}</td></tr>)}</tbody></table></div>{created?<p className="ad-local-note"><Icon name="Check" size={16}/>Exam session created. Teachers can now see their assignments.</p>:<button className="ad-button" disabled={!writable||busy} onClick={create}><Icon name="Check" size={16}/>{busy?'Creating…':'Create exam session'}</button>}</div>}
 </section>
}
const subjects_label=row=>row.subjectName||row.name||row.subjectId

function MonitoringPanel({sessions=[],teachers=[],onOpen}: any){
 const totals=sessions.reduce((sum,item)=>({assignments:sum.assignments+Number(item.totalAssignments||0),submitted:sum.submitted+Number(item.submittedAssignments||0),late:sum.late+Number(item.lateAssignments||0)}),{assignments:0,submitted:0,late:0})
 return <section className="exam-v2-stack"><div className="exam-v2-summary"><article><span className="ad-icon blue"><Icon name="ClipboardList"/></span><div><small>Assignments</small><strong>{totals.assignments}</strong></div></article><article><span className="ad-icon green"><Icon name="BadgeCheck"/></span><div><small>Submitted</small><strong>{totals.submitted}</strong></div></article><article><span className="ad-icon pink"><Icon name="ClockAlert"/></span><div><small>Late</small><strong>{totals.late}</strong></div></article><article><span className="ad-icon purple"><Icon name="Gauge"/></span><div><small>Completion</small><strong>{percent(totals.submitted,totals.assignments)}%</strong></div></article></div>
  <div className="exam-v2-session-grid">{sessions.map(session=>{const completion=session.completionPercent??percent(session.submittedAssignments,session.totalAssignments);return <article className="ad-panel" key={session.id}><header><div><ExamStatus>{session.status}</ExamStatus><small>{session.academicYearName||session.academicYear} · {session.term}</small></div><button className="ad-button secondary" onClick={()=>onOpen?.(session)}><Icon name="ArrowRight" size={15}/>Open</button></header><h3>{session.name||session.title}</h3><div className="exam-v2-progress"><span><i style={{width:`${completion}%`}}/></span><b>{completion}%</b></div><dl><dt>Submitted</dt><dd>{session.submittedAssignments||0}/{session.totalAssignments||0}</dd><dt>Pending</dt><dd>{session.pendingAssignments??Math.max(0,Number(session.totalAssignments||0)-Number(session.submittedAssignments||0))}</dd><dt>Late</dt><dd>{session.lateAssignments||0}</dd><dt>Deadline</dt><dd>{formatExamDate(session.teacherDeadline)}</dd></dl></article>})}{!sessions.length&&<ExamEmpty title="No v2 exam sessions" description="Create a session from an approved template after setup is complete."/>}</div>
 </section>
}

function ReExamPanel({session,writable,actions,templates=[],years=[]}: any){
 const [rows,setRows]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[preview,setPreview]=useState(null),[request,setRequest]=useState(null)
 const load=async()=>{try{setRows(await actions.loadDecisions(session))}catch(reason){setError(reason.message)}}
 useEffect(()=>{load()},[session.id])
 const run=async work=>{setBusy(true);setError('');setNotice('');try{await work()}catch(failure){setError(failure.message)}finally{setBusy(false)}}
 const decide=(row,decision)=>run(async()=>{if(reason.trim().length<3)throw new Error('Write a reason for this decision first.');await actions.decide(row.id,{decision,reason:reason.trim()});setNotice('Decision saved.');await load()})
 const decided=row=>row.decisions.find(item=>item.status==='Open'||item.status==='Resolved')
 const hasReExam=(rows||[]).some(row=>row.decisions.some(item=>item.decision==='Re-exam'&&item.status==='Open'))
 const submit=event=>{event.preventDefault();const form=new FormData(event.currentTarget),payload={templateId:form.get('templateId'),academicYearId:session.academicYearId,term:form.get('term'),allClasses:false,classIds:[],startDate:form.get('startDate'),endDate:form.get('endDate'),teacherDeadline:new Date(String(form.get('teacherDeadline'))).toISOString(),publishMode:'Manual',parentSessionId:session.id};run(async()=>{setPreview(await actions.previewSession(payload));setRequest(payload)})}
 const open=()=>run(async()=>{await actions.createSession({...request,title:`Re-exam · ${session.title}`});setPreview(null);setNotice('Re-exam session created. Teachers can now enter marks for the failed subjects.')})
 return <section className="exam-v2-stack"><div className="ad-panel exam-v2-editor"><h3>Students who failed</h3><p className="ad-local-note"><Icon name="Info" size={16}/>Choose repeat class, re-exam or special review for each student.</p>
  <label>Decision reason<input value={reason} onChange={event=>setReason(event.target.value)} placeholder="Reason recorded with the decision"/></label>
  <div className="ad-table-scroll"><table><thead><tr><th>Student</th><th>Average</th><th>Failed subjects</th><th>Decision</th></tr></thead><tbody>{(rows||[]).map(row=><tr key={row.id}><td>{row.studentName||row.studentId}</td><td>{row.displayAverage}%</td><td>{row.failedSubjects.map(item=>item.name).join(', ')||'—'}</td><td>{decided(row)?<ExamStatus>{decided(row).decision}{decided(row).status==='Resolved'&&decided(row).decision==='Re-exam'?' · done':''}</ExamStatus>:<span className="exam-v2-decision">{['Repeat','Re-exam','SpecialReview'].map(kind=><button key={kind} className="ad-button secondary" disabled={!writable||busy} onClick={()=>decide(row,kind)}>{kind==='SpecialReview'?'Special review':kind==='Repeat'?'Repeat class':'Re-exam'}</button>)}</span>}</td></tr>)}</tbody></table></div>{rows&&!rows.length&&<p className="ad-local-note"><Icon name="Check" size={16}/>No student failed this exam.</p>}</div>
  {hasReExam&&<form className="ad-panel exam-v2-editor" onSubmit={submit}><h3>Open re-exam</h3><div className="exam-v2-form-grid"><label>Exam template<select name="templateId" required><option value="">Select template</option>{templates.map(item=><option key={item.id} value={item.id}>{item.name} · v{item.version||1}</option>)}</select></label><label>Term<input name="term" defaultValue={session.term} required/></label><label>Start date<input name="startDate" type="date" required/></label><label>End date<input name="endDate" type="date" required/></label><label>Teacher deadline<input name="teacherDeadline" type="datetime-local" required/></label></div><p className="ad-local-note"><Icon name="Eye" size={16}/>Only students assigned to re-exam appear, and only in the subjects they failed.</p><button className="ad-button" disabled={!writable||busy}><Icon name="ScanSearch" size={16}/>Preview re-exam</button>
   {preview&&<div className="exam-v2-preview"><div className="ad-table-scroll"><table><thead><tr><th>Class</th><th>Subject</th><th>Students</th><th>Maximum</th></tr></thead><tbody>{(preview.candidates||[]).map((row,index)=><tr key={index}><td>{row.className}</td><td>{row.subjectName}</td><td>{row.roster?.length||0}</td><td>{row.maxMark}</td></tr>)}</tbody></table></div><button type="button" className="ad-button" disabled={!writable||busy} onClick={open}><Icon name="Check" size={16}/>Create re-exam session</button></div>}</form>}
  {error&&<p className="ad-form-error" role="alert">{error}</p>}{notice&&<p className="ad-local-note"><Icon name="Check" size={16}/>{notice}</p>}</section>
}

function SessionDetail({session,classes=[],teachers=[],writable,onBack,onReopen,onPublish,actions={},templates=[],years=[]}: any){
 const assignments=session.assignments||[],total=assignments.length,submitted=assignments.filter(item=>item.status==='Submitted'||item.status==='Late').length
 const grouped=useMemo(()=>classes.map(classroom=>({classroom,rows:assignments.filter(item=>item.classId===classroom.id)})).filter(group=>group.rows.length),[assignments,classes])
 return <section className="ad-panel exam-v2-detail"><header><button className="ad-button secondary" onClick={onBack}><Icon name="ArrowLeft" size={16}/>All sessions</button><div><ExamStatus>{session.status}</ExamStatus><h2>{session.name||session.title}</h2><p>{submitted}/{total} assignments submitted · deadline {formatExamDate(session.teacherDeadline)}</p></div><button className="ad-button" disabled={!writable||submitted!==total||!total} onClick={()=>onPublish?.(session)}><Icon name="Send" size={16}/>Publish results</button></header>{submitted!==total&&<p className="ad-local-note"><Icon name="Info" size={16}/>Publish remains disabled until every applicable assignment is complete. Missing or late rows are shown below.</p>}<div className="exam-v2-class-monitor">{grouped.map(({classroom,rows})=><article key={classroom.id}><header><div><strong>{classroom.name}</strong><small>{rows.filter(row=>['Submitted','Late'].includes(row.status)).length}/{rows.length} subjects · {percent(rows.filter(row=>['Submitted','Late'].includes(row.status)).length,rows.length)}%</small></div><ExamStatus>{rows.every(row=>['Submitted','Late'].includes(row.status))?'Ready':'Waiting'}</ExamStatus></header>{rows.map(row=><div key={row.id}><span><strong>{row.subjectName}</strong><small>{row.teacherName||teachers.find(item=>item.id===row.teacherId)?.name||'Teacher not resolved'}</small></span><span><small>Missing</small><b>{row.missingMarks||0}</b></span><span><small>Deadline</small><b>{formatExamDate(row.deadline||session.teacherDeadline)}</b></span><ExamStatus>{row.status}</ExamStatus>{['Submitted','Late','Overdue'].includes(row.status)&&<button aria-label={`Reopen ${row.subjectName}`} disabled={!writable} onClick={()=>onReopen?.(row)}><Icon name="RotateCcw" size={15}/></button>}</div>)}</article>)}</div>{session.status==='Published'&&!session.parentSessionId&&<ReExamPanel session={session} writable={writable} actions={actions} templates={templates} years={years}/>}</section>
}


function CoursesPanel({courses=[],classes=[],subjects=[],teachers=[],years=[],templates=[],writable=false,actions={}}: any){
 const [selectedCourse,setSelectedCourse]=useState(null)
 const [detail,setDetail]=useState(null)
 const [creating,setCreating]=useState(false)
 const [candidates,setCandidates]=useState([])
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [courseTab,setCourseTab]=useState('roster') // roster | candidates | exam
 const [manualStudentId,setManualStudentId]=useState('')
 const [manualReason,setManualReason]=useState('')
 const [paymentModal,setPaymentModal]=useState(null)

 const blankCourse={
  name:'',description:'',academicYearId:years[0]?.id||'',startDate:'',endDate:'',
  durationMonths:3,capacity:20,fee:0,paymentType:'None',targetClassId:classes[0]?.id||'',
  pickedClasses:{},pickedSubjects:{},subjectTeachers:{},
  eligibilityAverage:60,eligibilityRank:10,coursePassMark:50
 }
 const [form,setForm]=useState<any>(blankCourse)

 const openCourse=async course=>{
  setSelectedCourse(course)
  setError('')
  setNotice('')
  setBusy(true)
  try{
   const d=await actions.loadCourseDetail(course.id)
   setDetail(d)
   setSelectedCourse(d)
  }catch(err){setError(err.message)}
  finally{setBusy(false)}
 }

 const refreshDetail=async()=>{
  if(!selectedCourse)return
  try{
   const d=await actions.loadCourseDetail(selectedCourse.id)
   setDetail(d)
   setSelectedCourse(d)
  }catch{}
 }

 const loadCandidatesList=async()=>{
  if(!selectedCourse)return
  setBusy(true)
  try{
   const list=await actions.loadCourseCandidates(selectedCourse.id)
   setCandidates(list)
  }catch(err){setError(err.message)}
  finally{setBusy(false)}
 }

 const enroll=async(studentId,reason)=>{
  setBusy(true)
  setError('')
  setNotice('')
  try{
   await actions.enrollCourseStudent(selectedCourse.id,{studentId,reason})
   setNotice('Student enrolled successfully. Confirmation notice dispatched.')
   await refreshDetail()
   await loadCandidatesList()
  }catch(err){setError(err.message)}
  finally{setBusy(false)}
 }

 const changeStatus=async nextStatus=>{
  setBusy(true)
  setError('')
  try{
   await actions.updateCourseStatus(selectedCourse.id,nextStatus)
   setNotice(`Course status updated to ${nextStatus}.`)
   await refreshDetail()
  }catch(err){setError(err.message)}
  finally{setBusy(false)}
 }

 const recordPayment=async(enrollmentId,status,postedAmount)=>{
  setBusy(true)
  setError('')
  try{
   await actions.updateCoursePayment(selectedCourse.id,enrollmentId,{status,postedAmount})
   setPaymentModal(null)
   setNotice('Payment status updated.')
   await refreshDetail()
  }catch(err){setError(err.message)}
  finally{setBusy(false)}
 }

 const createExam=async e=>{
  e.preventDefault()
  setBusy(true)
  setError('')
  const fd=new FormData(e.currentTarget)
  try{
   await actions.createCourseExam(selectedCourse.id,{
    templateId:fd.get('templateId'),
    startDate:fd.get('startDate'),
    endDate:fd.get('endDate'),
    teacherDeadline:new Date(String(fd.get('teacherDeadline'))).toISOString(),
    term:fd.get('term')||'Course Exam'
   })
   setNotice('Course exam created successfully!')
   await refreshDetail()
  }catch(err){setError(err.message)}
  finally{setBusy(false)}
 }

 const submitCreate=async e=>{
  e.preventDefault()
  setError('')
  setBusy(true)
  const classIds=classes.filter(c=>form.pickedClasses[c.id]).map(c=>c.id)
  if(!classIds.length){setError('Select at least one eligible class.');setBusy(false);return}
  const chosenSubjects=subjects.filter(s=>form.pickedSubjects[s.id]).map((s,i)=>({
   subjectId:s.id,
   teacherId:form.subjectTeachers[s.id]||null,
   order:i+1,
   rules:{}
  }))
  try{
   await actions.createCourse({
    academicYearId:form.academicYearId,
    name:form.name,
    description:form.description,
    startDate:form.startDate,
    endDate:form.endDate,
    capacity:Number(form.capacity),
    fee:Number(form.fee),
    paymentType:form.paymentType,
    targetClassId:form.targetClassId,
    classIds,
    subjects:chosenSubjects,
    rules:{
     durationMonths:Number(form.durationMonths),
     eligibilityAverage:Number(form.eligibilityAverage),
     eligibilityRank:Number(form.eligibilityRank),
     passMark:Number(form.coursePassMark)
    }
   })
   setCreating(false)
   setForm(blankCourse)
   setNotice('Accelerated course created.')
  }catch(err){setError(err.message)}
  finally{setBusy(false)}
 }

 return <section className="exam-v2-stack">
  <div className="ad-section-toolbar">
   <div>
    <h2>Accelerated Courses</h2>
    <p>Separate course tracks with dedicated subjects, eligibility screening, fees, and accelerated advancement.</p>
   </div>
   {!selectedCourse&&<button className="ad-button" onClick={()=>setCreating(!creating)} disabled={!writable}>
    <Icon name={creating?'X':'Plus'} size={16}/>{creating?'Close':'New Course'}
   </button>}
  </div>

  {error&&<p className="ad-form-error" role="alert">{error}</p>}
  {notice&&<p className="ad-local-note"><Icon name="Check" size={16}/>{notice}</p>}

  {creating&&<form className="ad-panel exam-v2-editor" onSubmit={submitCreate}>
   <h3>Create Accelerated Course</h3>
   <div className="exam-v2-form-grid">
    <label>Course name<input value={form.name} onChange={e=>setForm(o=>({...o,name:e.target.value}))} required placeholder="Fast-Track STEM, Accelerated Grade 2..."/></label>
    <label>Academic Year<select value={form.academicYearId} onChange={e=>setForm(o=>({...o,academicYearId:e.target.value}))} required>
     {years.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}
    </select></label>
    <label>Start Date<input type="date" value={form.startDate} onChange={e=>setForm(o=>({...o,startDate:e.target.value}))} required/></label>
    <label>End Date<input type="date" value={form.endDate} onChange={e=>setForm(o=>({...o,endDate:e.target.value}))} required/></label>
    <label>Duration (Months)<input type="number" min="1" max="24" value={form.durationMonths} onChange={e=>setForm(o=>({...o,durationMonths:e.target.value}))} required/></label>
    <label>Capacity<input type="number" min="1" max="1000" value={form.capacity} onChange={e=>setForm(o=>({...o,capacity:e.target.value}))} required/></label>
    <label>Target Accelerated Class<select value={form.targetClassId} onChange={e=>setForm(o=>({...o,targetClassId:e.target.value}))} required>
     {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
    </select></label>
    <label>Course Fee ($)<input type="number" min="0" step="0.01" value={form.fee} onChange={e=>setForm(o=>({...o,fee:e.target.value}))}/></label>
    <label>Payment Type<select value={form.paymentType} onChange={e=>setForm(o=>({...o,paymentType:e.target.value}))}>
     <option value="None">Free (None)</option>
     <option value="Full">Full Payment</option>
     <option value="Monthly">Monthly</option>
     <option value="Installment">Installment</option>
    </select></label>
    <label>Eligibility Minimum Average (%)<input type="number" min="0" max="100" value={form.eligibilityAverage} onChange={e=>setForm(o=>({...o,eligibilityAverage:e.target.value}))}/></label>
    <label>Eligibility Top Rank (#)<input type="number" min="1" max="500" value={form.eligibilityRank} onChange={e=>setForm(o=>({...o,eligibilityRank:e.target.value}))}/></label>
    <label>Course Exam Pass Mark (%)<input type="number" min="0" max="100" value={form.coursePassMark} onChange={e=>setForm(o=>({...o,coursePassMark:e.target.value}))}/></label>
   </div>
   <label>Description<textarea value={form.description} onChange={e=>setForm(o=>({...o,description:e.target.value}))} placeholder="Course goals and syllabus overview"/></label>

   <fieldset><legend>Eligible Classes</legend>
    <div style={{display:'flex',gap:'1rem',flexWrap:'wrap'}}>
     {classes.map(c=><label key={c.id}><input type="checkbox" checked={Boolean(form.pickedClasses[c.id])} onChange={e=>setForm(o=>({...o,pickedClasses:{...o.pickedClasses,[c.id]:e.target.checked}}))}/>{c.name}</label>)}
    </div>
   </fieldset>

   <fieldset><legend>Course Subjects & Teachers</legend>
    {subjects.map(s=><div key={s.id} style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'0.5rem'}}>
     <label style={{minWidth:'140px'}}><input type="checkbox" checked={Boolean(form.pickedSubjects[s.id])} onChange={e=>setForm(o=>({...o,pickedSubjects:{...o.pickedSubjects,[s.id]:e.target.checked}}))}/>{s.name}</label>
     {form.pickedSubjects[s.id]&&<select value={form.subjectTeachers[s.id]||''} onChange={e=>setForm(o=>({...o,subjectTeachers:{...o.subjectTeachers,[s.id]:e.target.value}}))}>
      <option value="">Select teacher</option>
      {teachers.map(t=><option key={t.id} value={t.id}>{t.name||t.fullName||t.email}</option>)}
     </select>}
    </div>)}
   </fieldset>

   <button className="ad-button" disabled={busy}><Icon name="Save" size={16}/>{busy?'Saving…':'Create Course'}</button>
  </form>}

  {!selectedCourse&&<div className="exam-v2-template-grid">
   {courses.map(course=><article className="ad-panel" key={course.id}>
    <header>
     <span className="ad-icon purple"><Icon name="Rocket"/></span>
     <ExamStatus>{course.status}</ExamStatus>
    </header>
    <h3>{course.name}</h3>
    <p>{course.academicYearName||'Academic Year'} · Target: <strong>{course.targetClassName||'Accelerated class'}</strong></p>
    <dl>
     <dt>Enrolled</dt><dd>{course.enrolledCount||0} / {course.capacity} seats</dd>
     <dt>Fee</dt><dd>{Number(course.fee)>0?`$${course.fee} (${course.paymentType})`:'Free'}</dd>
     <dt>Dates</dt><dd>{formatExamDate(course.startDate)} – {formatExamDate(course.endDate)}</dd>
     <dt>Exam</dt><dd>{course.examSession?`${course.examSession.status}`:'Not scheduled'}</dd>
    </dl>
    <button className="ad-button secondary" onClick={()=>openCourse(course)}>
     <Icon name="Settings" size={15}/>Manage Course
    </button>
   </article>)}
   {!courses.length&&<ExamEmpty icon="Rocket" title="No courses yet" description="Create an accelerated course to offer fast-track learning."/>}
  </div>}

  {selectedCourse&&detail&&<article className="ad-panel exam-v2-detail">
   <header>
    <button className="ad-button secondary" onClick={()=>{setSelectedCourse(null);setDetail(null)}}>
     <Icon name="ArrowLeft" size={16}/>All Courses
    </button>
    <div>
     <ExamStatus>{detail.status}</ExamStatus>
     <h2>{detail.name}</h2>
     <p>{detail.academicYearName} · Target: <strong>{detail.targetClassName}</strong> · {detail.enrollments?.length||0}/{detail.capacity} enrolled</p>
    </div>
    <div style={{display:'flex',gap:'0.5rem'}}>
     {detail.status==='Draft'&&<button className="ad-button" disabled={!writable||busy} onClick={()=>changeStatus('Open')}>
      <Icon name="Check" size={15}/>Open for Enrollment
     </button>}
     {detail.status==='Open'&&<button className="ad-button" disabled={!writable||busy} onClick={()=>changeStatus('Running')}>
      <Icon name="Play" size={15}/>Start Running
     </button>}
     {['Open','Running'].includes(detail.status)&&<button className="ad-button secondary" disabled={!writable||busy} onClick={()=>changeStatus('Completed')}>
      <Icon name="Square" size={15}/>Complete / Close Course
     </button>}
    </div>
   </header>

   <div className="exam-v2-tabs" style={{marginBottom:'1rem'}}>
    <button className={courseTab==='roster'?'active':''} onClick={()=>setCourseTab('roster')}>
     <Icon name="Users" size={15}/>Enrolled Roster ({detail.enrollments?.length||0})
    </button>
    <button className={courseTab==='candidates'?'active':''} onClick={()=>{setCourseTab('candidates');loadCandidatesList()}}>
     <Icon name="UserCheck" size={15}/>Qualifying Candidates
    </button>
    <button className={courseTab==='exam'?'active':''} onClick={()=>setCourseTab('exam')}>
     <Icon name="FileCheck" size={15}/>Course Exam ({detail.examSession?detail.examSession.status:'Unscheduled'})
    </button>
   </div>

   {courseTab==='roster'&&<div>
    <div className="ad-section-toolbar">
     <h3>Enrolled Students Roster</h3>
     <small>{detail.enrollments?.length||0} of {detail.capacity} capacity filled</small>
    </div>
    <div className="ad-table-scroll">
     <table>
      <thead>
       <tr>
        <th>Seat</th>
        <th>Student</th>
        <th>Current Class</th>
        <th>Target Accelerated Class</th>
        <th>Status</th>
        <th>Fee / Payment</th>
        <th>Actions</th>
       </tr>
      </thead>
      <tbody>
       {(detail.enrollments||[]).map(e=><tr key={e.id}>
        <td><strong>#{e.seatNumber}</strong></td>
        <td>{e.studentName}</td>
        <td>{e.sourceClassName}</td>
        <td><strong>{e.targetClassName}</strong></td>
        <td><ExamStatus>{e.status}</ExamStatus></td>
        <td>
         {Number(detail.fee)>0?(
          <span>
           <b>${e.payment?.postedAmount||0} / ${detail.fee}</b>
           <small style={{marginLeft:'6px'}} className={`ad-badge ${e.payment?.status==='Paid'?'green':e.payment?.status==='Partial'?'orange':'pink'}`}>
            {e.payment?.status||'Pending'}
           </small>
          </span>
         ):'Free'}
        </td>
        <td>
         {Number(detail.fee)>0&&<button className="ad-button secondary" style={{padding:'4px 8px'}} onClick={()=>setPaymentModal(e)}>
          <Icon name="DollarSign" size={14}/>Payment
         </button>}
        </td>
       </tr>)}
      </tbody>
     </table>
     {(!detail.enrollments||!detail.enrollments.length)&&<p className="ad-local-note">No students enrolled yet. Check the Qualifying Candidates tab or manually add a student.</p>}
    </div>

    {['Open','Running'].includes(detail.status)&&<form className="ad-panel exam-v2-editor" style={{marginTop:'1.5rem'}} onSubmit={e=>{
     e.preventDefault()
     if(!manualStudentId){setError('Select a student to enroll.');return}
     enroll(manualStudentId,manualReason)
    }}>
     <h4>Manual Student Enrollment</h4>
     <p className="ad-local-note"><Icon name="Info" size={14}/>Enrolls student directly and sends email notice to their parent.</p>
     <div className="exam-v2-form-grid">
      <label>Student<select value={manualStudentId} onChange={e=>setManualStudentId(e.target.value)} required>
       <option value="">Select student...</option>
       {candidates.length?candidates.filter(c=>!c.alreadyEnrolled).map(c=><option key={c.studentId} value={c.studentId}>{c.studentName} ({c.className})</option>):<option disabled>Open Qualifying tab to load students</option>}
      </select></label>
      <label>Enrollment Reason / Notes<input value={manualReason} onChange={e=>setManualReason(e.target.value)} placeholder="Administrative approval, advanced aptitude..."/></label>
     </div>
     <button className="ad-button" disabled={busy||!manualStudentId}><Icon name="UserPlus" size={15}/>Enroll Student</button>
    </form>}
   </div>}

   {courseTab==='candidates'&&<div>
    <div className="ad-section-toolbar">
     <h3>Qualifying Candidates</h3>
     <button className="ad-button secondary" onClick={loadCandidatesList} disabled={busy}>
      <Icon name="RotateCcw" size={14}/>Refresh Candidates
     </button>
    </div>
    <p className="ad-local-note"><Icon name="Filter" size={14}/>Filtered by Eligible Classes and rules: Min Avg {detail.rules?.eligibilityAverage||0}%, Top Rank #{detail.rules?.eligibilityRank||'—'}.</p>
    <div className="ad-table-scroll">
     <table>
      <thead>
       <tr>
        <th>Student</th>
        <th>Class</th>
        <th>Average</th>
        <th>Rank</th>
        <th>Eligibility</th>
        <th>Action</th>
       </tr>
      </thead>
      <tbody>
       {candidates.map(c=><tr key={c.studentId}>
        <td><strong>{c.studentName}</strong></td>
        <td>{c.className}</td>
        <td>{c.average!=null?`${c.average}%`:'—'}</td>
        <td>{c.rank!=null?`#${c.rank}`:'—'}</td>
        <td>
         {c.qualifying?<span className="ad-badge green"><Icon name="Check" size={12}/>Qualifies</span>:<span className="ad-badge gray">Review required</span>}
         {c.criteriaMatched?.map((m,i)=><small key={i} style={{display:'block'}}>{m}</small>)}
        </td>
        <td>
         {c.alreadyEnrolled?<ExamStatus>Enrolled</ExamStatus>:(
          <button className="ad-button secondary" disabled={busy||!['Open','Running'].includes(detail.status)} onClick={()=>enroll(c.studentId,'Automated eligibility qualification')}>
           <Icon name="UserPlus" size={14}/>Enroll
          </button>
         )}
        </td>
       </tr>)}
      </tbody>
     </table>
     {!candidates.length&&<p className="ad-local-note">No candidates loaded. Click 'Refresh Candidates' to screen eligible classes.</p>}
    </div>
   </div>}

   {courseTab==='exam'&&<div>
    <h3>Course Examination</h3>
    <p className="ad-local-note">Students who pass the course exam advance directly to the target accelerated class (<strong>{detail.targetClassName}</strong>). Students who fail retain their normal progression.</p>
    {detail.examSession?(
     <div className="ad-panel">
      <header>
       <ExamStatus>{detail.examSession.status}</ExamStatus>
       <h4>{detail.examSession.title}</h4>
      </header>
      <dl>
       <dt>Status</dt><dd>{detail.examSession.status}</dd>
       <dt>Published Date</dt><dd>{formatExamDate(detail.examSession.publishedAt)||'Not published yet'}</dd>
      </dl>
      <p className="ad-local-note">Manage marks and publishing from the Monitoring tab.</p>
     </div>
    ):(
     ['Open','Running'].includes(detail.status)?(
      <form className="ad-panel exam-v2-editor" onSubmit={createExam}>
       <h4>Create Course Exam Session</h4>
       <div className="exam-v2-form-grid">
        <label>Exam Template<select name="templateId" required>
         <option value="">Select template...</option>
         {templates.map(t=><option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
        </select></label>
        <label>Term / Period<input name="term" defaultValue="Accelerated Term" required/></label>
        <label>Start Date<input type="date" name="startDate" required/></label>
        <label>End Date<input type="date" name="endDate" required/></label>
        <label>Teacher Deadline<input type="datetime-local" name="teacherDeadline" required/></label>
       </div>
       <button className="ad-button" disabled={busy||!detail.enrollments?.length}><Icon name="CalendarPlus" size={15}/>Create Exam Session</button>
       {!detail.enrollments?.length&&<p className="ad-form-error">Enroll at least one student before creating the course exam.</p>}
      </form>
     ):<p className="ad-local-note">Open or start the course before scheduling its examination.</p>
    )}
   </div>}

   {paymentModal&&<div className="ad-modal-backdrop" style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
    <div className="ad-panel" style={{maxWidth:'400px',width:'100%',background:'var(--ad-bg-card,#fff)'}}>
     <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <h4>Record Payment for {paymentModal.studentName}</h4>
      <button className="ad-button secondary" onClick={()=>setPaymentModal(null)}><Icon name="X" size={14}/></button>
     </header>
     <form onSubmit={e=>{
      e.preventDefault()
      const fd=new FormData(e.currentTarget)
      recordPayment(paymentModal.id,fd.get('status'),Number(fd.get('postedAmount')))
     }}>
      <div className="exam-v2-form-grid" style={{gridTemplateColumns:'1fr'}}>
       <label>Payment Status<select name="status" defaultValue={paymentModal.payment?.status||'Paid'}>
        <option value="Pending">Pending</option>
        <option value="Partial">Partial</option>
        <option value="Paid">Paid</option>
       </select></label>
       <label>Amount Paid ($)<input type="number" min="0" step="0.01" name="postedAmount" defaultValue={paymentModal.payment?.postedAmount||detail.fee}/></label>
      </div>
      <div style={{display:'flex',gap:'0.5rem',marginTop:'1rem'}}>
       <button className="ad-button" disabled={busy}><Icon name="Save" size={15}/>Save Payment</button>
       <button type="button" className="ad-button secondary" onClick={()=>setPaymentModal(null)}>Cancel</button>
      </div>
     </form>
    </div>
   </div>}
  </article>}
 </section>
}


export default function AdminExamV2Workspace({model={},classes=[],subjects=[],teachers=[],writable=false,actions={}}: any){
 const [view,setView]=useState('monitor'),[detail,setDetail]=useState(null),[settings,setSettings]=useState(false),[createdTemplates,setCreatedTemplates]=useState([]),[createdSubjects,setCreatedSubjects]=useState([])
 const setup=model.setup||{},liveDetail=detail?(model.sessions||[]).find(item=>item.id===detail.id)||detail:null,allTemplates=[...(model.templates||[]),...createdTemplates],examSubjects=[...(model.subjects||[]),...createdSubjects]
 if(setup.status!=='Complete'||settings)return <AdminExamOnboarding model={setup} classes={classes} subjects={subjects} writable={writable} settingsMode={settings||setup.status==='Complete'} onExit={setup.status==='Complete'?()=>setSettings(false):undefined} onSave={actions.saveSetupDraft} onComplete={actions.completeSetup}/>
 return <div className="exam-v2-workspace"><nav className="exam-v2-tabs" aria-label="Exam workspace"><button className={view==='monitor'?'active':''} onClick={()=>{setView('monitor');setDetail(null)}}><Icon name="Gauge" size={16}/>Monitoring</button><button className={view==='sessions'?'active':''} onClick={()=>{setView('sessions');setDetail(null)}}><Icon name="CalendarPlus" size={16}/>New session</button><button className={view==='templates'?'active':''} onClick={()=>{setView('templates');setDetail(null)}}><Icon name="LayoutTemplate" size={16}/>Templates</button><button className={view==='courses'?'active':''} onClick={()=>{setView('courses');setDetail(null)}}><Icon name="Rocket" size={16}/>Courses</button><button className={view==='subjects'?'active':''} onClick={()=>{setView('subjects');setDetail(null)}}><Icon name="Link" size={16}/>Subjects</button><button onClick={()=>setSettings(true)}><Icon name="Settings2" size={16}/>Exam settings</button></nav>{detail?<SessionDetail session={liveDetail} classes={classes} teachers={teachers} writable={writable} onBack={()=>setDetail(null)} onReopen={actions.reopenAssignment} onPublish={actions.publishSession} actions={actions} templates={allTemplates} years={model.academicYears}/>:view==='courses'?<CoursesPanel courses={model.courses||[]} classes={classes} subjects={examSubjects} teachers={teachers} years={model.academicYears} templates={allTemplates} writable={writable} actions={actions}/>:view==='subjects'?<SubjectsPanel subjects={examSubjects} legacySubjects={subjects} classes={classes} teachers={teachers} years={model.academicYears} writable={writable} onCreateSubject={async value=>{const created=await actions.createSubject(value);setCreatedSubjects(old=>[...old,created]);return created}} onCreateOffering={actions.createOffering}/>:view==='templates'?<TemplatesPanel templates={allTemplates} subjects={examSubjects} writable={writable} onCreate={async input=>{const created=await actions.createTemplate(input);setCreatedTemplates(old=>[...old,created])}}/>:view==='sessions'?<SessionCreator templates={allTemplates} years={model.academicYears} classes={classes} teachers={teachers} subjects={examSubjects} writable={writable} onPreview={actions.previewSession} onCreate={actions.createSession}/>:<MonitoringPanel sessions={model.sessions} teachers={teachers} onOpen={setDetail}/>}</div>
}
