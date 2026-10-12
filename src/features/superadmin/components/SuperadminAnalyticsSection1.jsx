import Icon from '../../../components/ui/Icon'

export default function SuperadminAnalyticsSection1({metrics, TileIcon, active, schools}) {
 return (<div className="sa-metrics">{metrics.map(([label,value,icon,tone],i)=><section className="sa-metric" key={label}><TileIcon name={icon} tone={tone} sprite={i}/><div><span>{label}</span><strong>{typeof value==='number'?value.toLocaleString():value}</strong><small><Icon name={i===5?'ShieldCheck':'ArrowUp'} size={13}/>{i===5?(active===schools.length?'All centers operational':`${active} centers active`):'Current total'}</small><em>{i===5?'Center status':'School workspace'}</em></div></section>)}</div>)
}
