import Icon from '../../../components/ui/Icon'

export default function FinanceIncomeExpensesSection1({Panel, monthSelect, download, setModal, filterBar, transactionTable, records}: any) {
 return (<Panel title="Income & Expense Ledger" icon="ArrowLeftRight" action={<div className="ac-actions">{monthSelect}<button className="ac-button secondary" onClick={()=>download('transactions')}><Icon name="Download" size={15}/>Export</button><button className="ac-button" onClick={()=>setModal({kind:'transaction',type:'Income'})}>+ Record Income</button><button className="ac-button pink-button" onClick={()=>setModal({kind:'transaction',type:'Expense'})}>+ Record Expense</button></div>}>{filterBar(['Income','Expense'],'Search transactions…')}{transactionTable(records)}<p className="ac-table-note">{records.length} records · Local demo ledger · Amounts in USD</p></Panel>)
}
