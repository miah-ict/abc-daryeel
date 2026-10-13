import Icon from '../../../components/ui/Icon'
import type { DownloadReport, Match, TileIconComponent } from '../types'

interface Props { match: Match; TileIcon: TileIconComponent; download: DownloadReport }

export default function SuperadminReportsSection5({match, TileIcon, download}: Props) {
 return (<><div className="sa-report-grid">{[['System Overview','A snapshot of users, enrollment, programs and centers.','ChartNoAxesCombined','overview'],['User Directory','Roles, school assignments and account status.','UsersRound','users'],['Center Enrollment','Student counts and operating status by center.','School','schools'],['Program Report','Enrollment and age groups across all programs.','BookOpen','programs'],['Activity Report','An export of the workspace activity.','ClipboardList','logs']].filter(r=>match(r[0],r[1])).map(([heading,desc,icon,kind],i)=><section className="sa-panel sa-report" key={kind}><TileIcon name={icon} tone={['blue','purple','green','orange','pink'][i]}/><h2>{heading}</h2><p>{desc}</p><small>CSV spreadsheet · Current school records</small><button className="sa-button secondary" onClick={()=>download(kind)}><Icon name="Download" size={15}/>Download Report</button></section>)}</div></>)
}
