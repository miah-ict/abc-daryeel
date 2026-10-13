import Icon from '../../../components/ui/Icon'
import { Empty } from '../../../components/ui/TeacherUI';
import type { DownloadReport, FilterRenderer, LogEntry, PanelComponent } from '../types'

interface Props { Panel: PanelComponent; download: DownloadReport; filters: FilterRenderer; logs: LogEntry[]; shownLogs: LogEntry[] }

export default function SuperadminLogsSection7({Panel, download, filters, logs, shownLogs}: Props) {
 return (<Panel title="Logs & Activity" icon="ClipboardList" action={<button className="sa-button secondary" onClick={()=>download('logs')}><Icon name="Download" size={15}/>Export Logs</button>}>{filters([...new Set(logs.map(l=>l.type))],'Search activity…')}<div className="sa-table-wrap"><table><thead><tr><th>Activity</th><th>Details</th><th>Category</th><th>Actor</th><th>Time</th></tr></thead><tbody>{shownLogs.slice(0,100).map(l=><tr key={l.id}><td><strong>{l.title}</strong></td><td>{l.detail}</td><td><span className="sa-role">{l.type}</span></td><td>{l.actor}</td><td>{new Date(l.time).toLocaleString()}</td></tr>)}</tbody></table>{!shownLogs.length&&<Empty/>}</div><p className="sa-note">Showing up to 100 recent events. Exports include all matching records. Local demo activity only.</p></Panel>)
}
