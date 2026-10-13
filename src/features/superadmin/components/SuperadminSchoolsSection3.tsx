import type { DownloadReport, FilterRenderer, PanelComponent, School } from '../types'
import type { ReactNode } from 'react'

interface Props { Panel: PanelComponent; download: DownloadReport; filters: FilterRenderer; schoolTable: (schools: School[], compact?: boolean) => ReactNode; shownSchools: School[] }

export default function SuperadminSchoolsSection3({Panel, download, filters, schoolTable, shownSchools}: Props) {
 return (<Panel title="Schools & Centers" icon="School" action={<button className="sa-button secondary" onClick={()=>download('schools')}>Export Centers</button>}>{filters(['Active','Inactive'],'Search centers…')}{schoolTable(shownSchools)}</Panel>)
}
