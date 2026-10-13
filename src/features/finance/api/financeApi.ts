import {api} from '../../../services/api'
export const getSummary=()=>api('/finance/summary')
export const getTransactions=()=>api('/finance/transactions')
export const getInvoices=()=>api('/finance/invoices')
export const recordPayment=body=>api('/finance/payments',{method:'POST',body})
export const financeGet=path=>api(`/finance${path}`)
export const financePost=(path,body)=>api(`/finance${path}`,{method:'POST',body})
export const financePut=(path,body)=>api(`/finance${path}`,{method:'PUT',body})
export const getFinanceClasses=()=>api('/classes')
