

export default function SuperadminAnalyticsSection6({charts, Panel, shownSchools, schools}) {
 return (<><div className="sa-charts-row sa-analytics">{charts}</div><Panel title="Enrollment by Center" icon="School"><div className="sa-center-bars">{shownSchools.map(s=><div key={s.id}><span>{s.name}</span><div><i style={{width:`${s.students/Math.max(1,...schools.map(s=>s.students))*100}%`}}/></div><strong>{s.students}</strong></div>)}</div><p className="sa-note">The trend chart is a historical demo snapshot. Center and program totals reflect current workspace records.</p></Panel></>)
}
