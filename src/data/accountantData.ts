export const accountantBase = '/dashboard/accountant'
export const accountantMenu = [
  ['Dashboard','House',''],['Income & Expenses','ArrowLeftRight','income-expenses'],
  ['Fees Management','BadgeDollarSign','fees-management'],['Reports','ChartNoAxesCombined','reports'],
  ['Students','UsersRound','students'],['Invoices','ClipboardList','invoices'],
  ['Payments','WalletCards','payments'],['Classes','School','classes'],['Settings','Settings','settings'],
]
export const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Mogadishu',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
export const currentMonth = today.slice(0,7)
export const dayOfMonth = day => `${currentMonth}-${String(Math.min(day,Number(today.slice(-2)))).padStart(2,'0')}`
export const displayDate = value => new Date(`${value}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
export const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2,minimumFractionDigits:0}).format(value)
export const categories = ['Salaries','Food & Nutrition','Utilities','Supplies','Maintenance','Others']
export const financeStudents = [
  {id:'ST-001',name:'Amina Ali',class:'KG 1',guardian:'Hassan Ali',email:'hassan@example.com'},
  {id:'ST-002',name:'Mohamed Ali',class:'KG 2',guardian:'Maryam Ali',email:'maryam@example.com'},
  {id:'ST-003',name:'Fatima Noor',class:'Nursery',guardian:'Ahmed Noor',email:'ahmed@example.com'},
  {id:'ST-004',name:'Yusuf Omar',class:'Primary',guardian:'Hawa Omar',email:'hawa@example.com'},
  {id:'ST-005',name:'Layla Ahmed',class:'KG 1',guardian:'Sara Ahmed',email:'sara@example.com'},
  {id:'ST-006',name:'Omar Hassan',class:'KG 2',guardian:'Ali Hassan',email:'ali@example.com'},
  {id:'ST-007',name:'Zahra Mohamed',class:'Nursery',guardian:'Nadia Mohamed',email:'nadia@example.com'},
  {id:'ST-008',name:'Adam Farah',class:'Primary',guardian:'Osman Farah',email:'osman@example.com'},
]
export const seedTransactions = [
  {id:'TX-001',date:dayOfMonth(6),description:'School Fee – KG 1',type:'Income',category:'School Fees',amount:450,method:'Bank Transfer'},
  {id:'TX-002',date:dayOfMonth(5),description:'Teacher Salary',type:'Expense',category:'Salaries',amount:1200,method:'Bank Transfer'},
  {id:'TX-003',date:dayOfMonth(4),description:'Food Supplies',type:'Expense',category:'Food & Nutrition',amount:650,method:'Cash'},
  {id:'TX-004',date:dayOfMonth(3),description:'New Student Registration',type:'Income',category:'Registration',amount:300,method:'Cash'},
  {id:'TX-005',date:dayOfMonth(2),description:'Electricity Bill',type:'Expense',category:'Utilities',amount:220,method:'Bank Transfer'},
  {id:'TX-006',date:dayOfMonth(1),description:'School Fees – Monthly Collection',type:'Income',category:'School Fees',amount:11700,method:'Bank Transfer'},
  ...[['Salaries',1680],['Food & Nutrition',1000],['Utilities',770],['Supplies',820],['Maintenance',660],['Others',1230]].map(([category,amount],i)=>({id:`TX-${i+7}`,date:dayOfMonth(1),description:`${category} – Monthly Operations`,type:'Expense',category,amount,method:'Bank Transfer'})),
]
export const seedInvoices = financeStudents.map((s,i)=>({id:`INV-2026-${String(i+1).padStart(3,'0')}`,studentId:s.id,description:'Monthly tuition & learning materials',amount:[150,120,200,180,100,670,800,1200][i],paid:0,issued:today,due:`${currentMonth}-${String(20+i).padStart(2,'0')}`}))
export const seedFeePlans = [
  {id:'F-1',name:'Kindergarten 1',class:'KG 1',tuition:150,materials:25,transport:40},
  {id:'F-2',name:'Kindergarten 2',class:'KG 2',tuition:170,materials:25,transport:40},
  {id:'F-3',name:'Nursery',class:'Nursery',tuition:200,materials:30,transport:40},
  {id:'F-4',name:'Primary',class:'Primary',tuition:180,materials:35,transport:40},
]
export const outstanding = invoice => Math.max(0,Math.round((invoice.amount-invoice.paid)*100)/100)
export function invoiceStatus(invoice) {
  if(outstanding(invoice)===0)return 'Paid'
  if(invoice.due<today)return 'Overdue'
  return invoice.paid>0?'Partial':'Pending'
}
export function totals(transactions,invoices,month) {
  const records=transactions.filter(t=>!month||t.date.startsWith(month))
  const sum=type=>Math.round(records.filter(t=>t.type===type).reduce((n,t)=>n+t.amount,0)*100)/100
  return {income:sum('Income'),expenses:sum('Expense'),pending:Math.round(invoices.reduce((n,i)=>n+outstanding(i),0)*100)/100,net:Math.round((sum('Income')-sum('Expense'))*100)/100}
}
