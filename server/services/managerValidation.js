import {eq} from 'drizzle-orm'
import {users,classes} from '../db/schema/index.js'
import {HttpError} from '../middleware/error.middleware.js'

const statuses={schedule:['Scheduled','In Progress','Completed','Cancelled'],'teacher-attendance':['Present','Absent','Late','Leave'],'staff-attendance':['Present','Absent','Late','Leave'],monitoring:['Open','Follow-up','Resolved'],'leave-requests':['Pending','Approved','Rejected'],expenses:['Paid','Pending'],procurements:['Requested','Approved','Ordered','Received','Cancelled'],maintenance:['Open','In Progress','Resolved','Completed','Closed'],kitchen:['Planned','Ready','Served','In Stock','Low Stock'],transport:['Active','Maintenance','Inactive'],tasks:['To Do','Open','In Progress','Completed'],messages:['Sent'],reports:['Generated']}
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value
const invalid=message=>{throw new HttpError(400,message)}
export async function validateManagerRecords(tx,schoolId,module,records){
 if(!Array.isArray(records))return
 const people=await tx.select().from(users).where(eq(users.schoolId,schoolId||''))
 const teachers=new Set(people.filter(row=>row.role==='teacher').map(row=>row.id))
 const staff=new Set(people.filter(row=>['accountant','guard','cleaner','cooking','driver','ict'].includes(row.role)).map(row=>row.id))
 const staffAttendance=new Set([...staff,...teachers])
 const classIds=new Set((await tx.select({id:classes.id}).from(classes).where(eq(classes.schoolId,schoolId||''))).map(row=>row.id))
 const ids=new Set()
 for(const row of records){
  if(typeof row.id!=='string'||!row.id.trim()||ids.has(row.id))invalid('Manager records require unique IDs.')
  ids.add(row.id)
  for(const field of ['date','startDate','endDate','dueDate','from','to'])if(row[field]!==undefined&&row[field]!==''&&!validDate(row[field]))invalid(`Invalid ${field}.`)
  if(row.startDate&&row.endDate&&row.startDate>row.endDate||row.from&&row.to&&row.from>row.to)invalid('End date must follow start date.')
  if(statuses[module]&&row.status!==undefined&&!statuses[module].includes(row.status))invalid(`Invalid ${module} status.`)
  for(const [field,set] of [['teacherId',teachers],['substituteId',teachers],['staffId',module==='staff-attendance'?staffAttendance:staff],['classId',classIds]])if(row[field]&&!set.has(row[field]))throw new HttpError(403,`${field} is outside your school.`)
  for(const field of ['amount','quantity','capacity','passengers','monthlySalary'])if(row[field]!==undefined&&(typeof row[field]!=='number'||!Number.isFinite(row[field])||row[field]<0))invalid(`Invalid ${field}.`)
  for(const field of ['capacity','passengers','quantity'])if(row[field]!==undefined&&!Number.isInteger(row[field]))invalid(`${field} must be an integer.`)
  if(module==='expenses'&&(!(row.amount>0)||!validDate(row.date)))invalid('Expenses require a positive amount and date.')
  if(row.capacity!==undefined&&row.capacity<1)invalid('Capacity must be positive.')
  if(row.passengers!==undefined&&row.capacity!==undefined&&row.passengers>row.capacity)invalid('Passengers exceed capacity.')
  if(module==='substitutes'&&row.teacherId&&row.teacherId===row.substituteId)invalid('Choose a different substitute teacher.')
  if(module==='schedule'){
   if(!validDate(row.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(row.end)||row.start>=row.end)invalid('Invalid schedule date or time.')
   if(!teachers.has(row.teacherId)||!classIds.has(row.classId))invalid('Schedule requires a teacher and class.')
  }
 }
 if(module==='schedule')for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length;j++){
  const a=records[i],b=records[j]
  if(a.status==='Cancelled'||b.status==='Cancelled')continue
  if(a.date===b.date&&a.start<b.end&&a.end>b.start&&(a.teacherId===b.teacherId||a.classId===b.classId||a.room&&a.room===b.room))invalid('Schedule conflicts with another lesson.')
 }
}
