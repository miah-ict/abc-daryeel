import Icon from '../../../components/ui/Icon'

export default function FinancePaymentsSection5({Panel, monthSelect, download, pending, setModal, filterBar, transactionTable, records}: any) {
 return (<Panel title="Payment History" icon="WalletCards" action={<div className="ac-actions">{monthSelect}<button className="ac-button secondary" onClick={()=>download('payments')}><Icon name="Download" size={15}/>Export</button><button className="ac-button" disabled={!pending.length} onClick={()=>setModal({kind:'payment',item:pending[0]})}><Icon name="Plus" size={16}/>Record Payment</button></div>}>{filterBar(null,'Search payments…')}{transactionTable(records.filter(t=>t.type==='Income'))}<p className="ac-table-note">Demo payment records only. This workspace does not move money or charge families.</p></Panel>)
}
