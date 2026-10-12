import Icon from './Icon'
export default function MetricCard({icon,title,value,change,caption,tone='blue'}){return <div className={`metric-card tone-${tone}`}><div className="metric-icon"><Icon name={icon}/></div><div><span>{title}</span><strong>{value}</strong><small className={String(change).startsWith('-')?'negative':''}>{change} <em>{caption}</em></small></div></div>}
