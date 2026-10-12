import Icon from '../../../components/ui/Icon'
import { Avatar, Empty } from '../../../components/ui/TeacherUI';
import { money } from '../../../data/accountantData';

export default function FinanceStudentsSection3({Panel, download, filterBar, feePlans, visibleStudents, balance, setModal}) {
 return (<Panel title="Student Accounts" icon="UsersRound" action={<button className="ac-button secondary" onClick={()=>download('students')}><Icon name="Download" size={15}/>Export Accounts</button>}>{filterBar(feePlans.map(p=>p.class),'Search students…')}<div className="ac-table-scroll"><table><thead><tr><th>Student</th><th>Class</th><th>Parent / Guardian</th><th>Email</th><th>Outstanding</th><th>Action</th></tr></thead><tbody>{visibleStudents.map((s,i)=><tr key={s.id}><td><div className="ad-person"><Avatar name={s.name} index={i}/><div><strong>{s.name}</strong><small>{s.id}</small></div></div></td><td><span className="ac-class-tag">{s.class}</span></td><td>{s.guardian}</td><td>{s.email}</td><td className="ac-amount">{money(balance(s.id))}</td><td><button className="ac-text-button" onClick={()=>setModal({kind:'student',item:s})}>View Account</button></td></tr>)}</tbody></table>{!visibleStudents.length&&<Empty title="No matching students"/>}</div></Panel>)
}
