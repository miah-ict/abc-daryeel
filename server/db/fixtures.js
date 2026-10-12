import {initialStudents,initialTeachers,initialStaff,initialClasses,initialSubjects} from './adminSeed.js'
import {teacherStudents,initialLessons,initialAssignments,initialScores,initialThreads,initialActivity,teacherSchedule,dateKey} from '../../src/data/teacherData.js'
import {studentAssignments,studentThreads,makeStudentAttendance,studentSubjects,studentActivities,studentAnnouncements,studentGallery} from '../../src/data/studentData.js'
import {financeStudents,seedTransactions,seedInvoices,seedFeePlans} from '../../src/data/accountantData.js'
import {schoolsSeed,usersSeed,programsSeed,logsSeed,alertsSeed,enrollmentHistory} from '../../src/data/superadminData.js'
import {DASH} from '../../src/data/dashboardData.js'
const today=dateKey()
export const fixtures = {
manager:Object.fromEntries(['teachers','staff','students','classes','schedule','teacher-attendance','staff-attendance','substitutes','monitoring','leave-requests','expenses','procurements','maintenance','kitchen','transport','tasks','messages','activity','reports'].map(k=>[`abc-manager-${k}`,[]]).concat([['abc-manager-settings',{notifications:true,weekly:true}],['abc-manager-dark',false]])),
'admin': {
  'abc-admin-students': initialStudents,
  'abc-admin-teachers': initialTeachers,
  'abc-admin-staff': initialStaff,
  'abc-admin-classes': initialClasses,
  'abc-admin-subjects': initialSubjects,
  'abc-admin-attendance': {},
  'abc-admin-staff-attendance': {},
  'abc-admin-settings': {school:'ABC Daycare & Kindergarten',name:'Amina Hassan',email:'hello@abcdaycare.edu',phone:'+251 911 234 567',notifications:true,weekly:true},
  'abc-admin-dark': false
},
'teacher': {
  'abc-teacher-students': teacherStudents,
  'abc-teacher-lessons': initialLessons,
  'abc-teacher-assignments': initialAssignments,
  'abc-teacher-scores': initialScores,
  'abc-teacher-attendance': {[today]:Object.fromEntries(teacherStudents.map(s => [s.id,s.status]))},
  'abc-teacher-messages': initialThreads,
  'abc-teacher-activity': initialActivity,
  'abc-teacher-settings': {name:'Amina Hassan',email:'amina@abcdaycare.edu',className:'KG 1 – Morning Class',room:'Sunshine Room',bio:'Helping little learners build confidence, kindness, and curiosity.',reminders:true,summary:true},
  'abc-teacher-dark': false
},
'student': {
  'abc-student-profile': {name:'Ahmed Ali',guardian:'Hassan Ali',email:'hassan@example.com',phone:'+251 911 234 567',interests:'Drawing, stories, and playing with my friends',about:'I love learning new things every day!'},
  'abc-student-settings': {dark:false,reminders:true,announcements:true,largeText:false},
  'abc-student-assignments': studentAssignments,
  'abc-student-attendance': makeStudentAttendance(),
  'abc-student-messages': studentThreads,
  'abc-student-favorites': []
},
'accountant': {
  'abc-finance-transactions': seedTransactions,
  'abc-finance-invoices': seedInvoices,
  'abc-finance-fees': seedFeePlans,
  'abc-finance-students': financeStudents,
  'abc-finance-settings': {name:'Ahmed Hassan',school:'ABC Daycare & Kindergarten',email:'accounts@abcdaycare.edu',phone:'+251 911 234 567',address:'123 Sunshine Avenue, Addis Ababa',reminders:true,summary:true},
  'abc-finance-dark': false
},
'superadmin': {
  'abc-super-users': usersSeed,
  'abc-super-schools': schoolsSeed,
  'abc-super-programs': programsSeed,
  'abc-super-logs': logsSeed,
  'abc-super-settings': {name:'Mohamed Hassan',school:'ABC Daycare & Kindergarten',email:'superadmin@abc.edu',timezone:'Africa/Mogadishu',notifications:true},
  'abc-super-dark': false,
  'abc-super-backup-history': []
},
}
export const readonly = {student:{subjects:studentSubjects,studentActivities,studentAnnouncements,studentGallery},teacher:{teacherSchedule},superadmin:{alertsSeed,enrollmentHistory}}
export {DASH,usersSeed,seedTransactions,seedInvoices}
