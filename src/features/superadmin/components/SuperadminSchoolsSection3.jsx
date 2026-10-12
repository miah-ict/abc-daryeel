

export default function SuperadminSchoolsSection3({Panel, download, filters, schoolTable, shownSchools}) {
 return (<Panel title="Schools & Centers" icon="School" action={<button className="sa-button secondary" onClick={()=>download('schools')}>Export Centers</button>}>{filters(['Active','Inactive'],'Search centers…')}{schoolTable(shownSchools)}</Panel>)
}
