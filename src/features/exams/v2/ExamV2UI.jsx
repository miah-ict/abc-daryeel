import Icon from '../../../components/ui/Icon'

export const examStatusTone=status=>({Published:'green',Ready:'green',Submitted:'green',Passed:'green',Completed:'green',Draft:'purple',Collecting:'blue',Open:'blue',Running:'blue',Late:'pink',Failed:'pink',Missing:'pink',Pending:'orange',Waiting:'orange',Reopened:'orange',Locked:'orange'}[status]||'orange')

export function ExamStatus({children}){
 return <span className={`ad-badge ${examStatusTone(children)}`}><i/>{children||'Unknown'}</span>
}

export function ExamLoading({label='Loading exam workspace…'}){
 return <section className="ad-panel exam-v2-state" aria-busy="true"><span className="exam-v2-spinner"><Icon name="LoaderCircle"/></span><strong>{label}</strong><small>Please wait while the latest school data is loaded.</small></section>
}

export function ExamError({message,onRetry}){
 return <section className="ad-panel exam-v2-state exam-v2-error" role="alert"><span><Icon name="TriangleAlert"/></span><strong>Exam workspace could not load</strong><small>{message||'Try again in a moment.'}</small>{onRetry&&<button className="ad-button secondary" onClick={onRetry}><Icon name="RefreshCw" size={16}/>Retry</button>}</section>
}

export function ExamUnsupported({message,children}){
 return <section className="ad-panel exam-v2-unsupported" role="status"><span className="ad-icon orange"><Icon name="ShieldAlert"/></span><div><strong>Exam v2 actions are unavailable</strong><p>{message}</p><small><Icon name="LockKeyhole" size={13}/>No setup, score, publish, promotion, course, or payment action will fall back to the legacy API.</small></div>{children}</section>
}

export function ExamEmpty({icon='ClipboardCheck',title,description,action}){
 return <div className="ad-empty exam-v2-empty"><Icon name={icon} size={30}/><strong>{title}</strong><span>{description}</span>{action}</div>
}

export const formatExamDate=value=>{
 if(!value)return 'Not set'
 const parsed=new Date(value)
 return Number.isNaN(parsed.valueOf())?String(value):new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Mogadishu',month:'short',day:'numeric',year:'numeric',hour:value.includes?.('T')?'numeric':undefined,minute:value.includes?.('T')?'2-digit':undefined}).format(parsed)
}

export const percent=(value,total)=>total?Math.round(Number(value||0)/Number(total)*100):0

