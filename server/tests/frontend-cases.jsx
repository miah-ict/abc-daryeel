import AdminWorkspace from '../../src/features/admin/components/AdminWorkspace'
import TeacherWorkspace from '../../src/features/teachers/components/TeacherWorkspace'
import StudentWorkspace from '../../src/features/students/components/StudentWorkspace'
import AccountantWorkspace from '../../src/features/finance/components/AccountantWorkspace'
import SuperAdminWorkspace from '../../src/features/superadmin/components/SuperAdminWorkspace'
import ManagerWorkspace from '../../src/features/manager/components/ManagerWorkspace'
export {WorkspaceContext} from '../../src/app/context/WorkspaceContext'
export {fixtures,readonly} from '../db/fixtures.js'
export const cases=[
 ['manager',ManagerWorkspace,['','teachers','teacher-schedule','workload','classes','monitoring','staff','staff-attendance','expenses','reports','settings']],
 ['admin',AdminWorkspace,['','students','teachers','staff','classes','attendance','exams','reports','settings']],
 ['teacher',TeacherWorkspace,['','my-class','students','attendance','lesson-plans','assessments','exams','messages','reports','settings']],
 ['student',StudentWorkspace,['','my-classes','my-assignments','attendance','grades','gallery','profile','settings','messages']],
 ['accountant',AccountantWorkspace,['','onboarding','student-fees','fee-collection','outstanding-fees','other-income','staff-payments','school-expenses','receipts','invoices-bills','reports','daily-closing','monthly-closing','budget','refunds','ledger','audit','settings','income-expenses','fees-management']],
 ['superadmin',SuperAdminWorkspace,['','users','schools','programs','reports','analytics','settings','logs','backup']],
]
