import {useEffect,useState} from 'react'
import Icon from '../../../components/ui/Icon'
import {createAcademicYear,getAcademicYears,startAcademicYear} from '../api/adminApi'

const schoolToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Mogadishu',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const yearDraft=startYear=>({name:`${startYear}–${startYear+1}`,startDate:`${startYear}-09-01`,endDate:`${startYear+1}-06-30`})
const initialDraft=()=>{const today=schoolToday(),year=Number(today.slice(0,4)),month=Number(today.slice(5,7));return yearDraft(month>=7?year:year-1)}
const readableDate=value=>value?new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'}).format(new Date(`${value}T00:00:00Z`)):'—'

export default function AdminAcademicYears({setToast}){
 const [years,setYears]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[draft,setDraft]=useState(initialDraft)
 const today=schoolToday()
 const load=async()=>{try{const rows=await getAcademicYears();setYears(Array.isArray(rows)?rows:[]);return rows}catch(reason){setError(reason.message);return []}}
 useEffect(()=>{load()},[])

 const update=event=>setDraft(old=>({...old,[event.target.name]:event.target.value}))
 const create=async event=>{
  event.preventDefault()
  const form=event.currentTarget
  const payload=Object.fromEntries(new FormData(form))
  if(payload.endDate<=payload.startDate){setError('End date must be after the start date.');return}
  setBusy(true);setError('')
  try{
   await createAcademicYear(payload)
   await load()
   setDraft(yearDraft(Number(payload.endDate.slice(0,4))))
   setToast?.('Academic year created')
  }catch(reason){setError(reason.message)}finally{setBusy(false)}
 }
 const start=async year=>{
  if(!window.confirm(`Close the current year and start ${year.name}?`))return
  setBusy(true);setError('')
  try{await startAcademicYear(year.id);await load();setToast?.(`${year.name} is now active`)}catch(reason){setError(reason.message)}finally{setBusy(false)}
 }
 const active=years.find(year=>year.status==='Active')

 return <section className="ad-panel academic-years">
  <div className="academic-years-head">
   <div className="ad-panel-head"><h2><span className="ad-icon green"><Icon name="CalendarRange"/></span>Academic Years</h2></div>
   <div className="academic-year-summary"><span><Icon name="CalendarCheck" size={15}/><small>Active year</small><strong>{active?.name||'Not configured'}</strong></span><span><Icon name="Layers3" size={15}/><small>Total periods</small><strong>{years.length}</strong></span></div>
  </div>
  <p className="ad-settings-description">Create the next school year in advance. Starting it closes the active year after exam checks pass.</p>
  {years.some(year=>year.status==='Active'&&year.endDate<today)&&<p className="ad-local-note academic-year-warning"><Icon name="TriangleAlert" size={16}/>The active academic year has ended. Review exams, then start the prepared next year.</p>}
  {error&&<p className="ad-form-error academic-year-error" role="alert"><Icon name="CircleAlert" size={15}/>{error}</p>}

  <div className="academic-year-list">
   {years.map(year=><article key={year.id}>
    <span className={`ad-icon ${year.status==='Active'?'green':year.status==='Closed'?'orange':'purple'}`}><Icon name={year.status==='Active'?'CalendarCheck':'CalendarDays'}/></span>
    <div><strong>{year.name}</strong><small><Icon name="Calendar" size={12}/>{readableDate(year.startDate)} <i/> {readableDate(year.endDate)}</small></div>
    <b className={`ad-badge ${year.status==='Active'?'green':year.status==='Closed'?'orange':'purple'}`}><i/>{year.status==='Active'&&year.endDate<today?'Ended':year.status}</b>
    {year.status==='Draft'&&<button type="button" className="ad-button secondary" disabled={busy} onClick={()=>start(year)}>Close & Start</button>}
   </article>)}
   {!years.length&&<div className="academic-year-empty"><span><Icon name="CalendarPlus"/></span><strong>No academic year yet</strong><small>Complete the form below to create your first school year.</small></div>}
  </div>

  <form onSubmit={create} className="academic-year-form">
   <div className="academic-year-form-title"><span><Icon name="CalendarPlus"/></span><div><strong>Create academic year</strong><small>Dates are based on the school calendar.</small></div></div>
   <label><span>Year name</span><div className="academic-year-input"><Icon name="GraduationCap" size={16}/><input name="name" required value={draft.name} onChange={update} placeholder="2026–2027"/></div></label>
   <label><span>Start date</span><div className="academic-year-input"><Icon name="CalendarArrowUp" size={16}/><input name="startDate" type="date" required value={draft.startDate} onChange={update}/></div></label>
   <label><span>End date</span><div className="academic-year-input"><Icon name="CalendarArrowDown" size={16}/><input name="endDate" type="date" required min={draft.startDate||undefined} value={draft.endDate} onChange={update}/></div></label>
   <button className="ad-button academic-year-submit" disabled={busy}><Icon name={busy?'LoaderCircle':'Plus'} size={16}/>{busy?'Creating…':'Create Year'}</button>
  </form>
 </section>
}
