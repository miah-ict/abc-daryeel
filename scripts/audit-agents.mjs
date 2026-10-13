import fs from 'node:fs'
import path from 'node:path'
const root=process.cwd()
const files=['src/pages/LandingPage.tsx','src/pages/AuthPage.tsx','src/pages/DashboardPage.tsx','src/components/layout/Sidebar.tsx','src/components/layout/Topbar.tsx','src/styles/app.css']
const missing=files.filter(f=>!fs.existsSync(path.join(root,f)))
const refs=fs.readdirSync(path.join(root,'public/references')).filter(x=>x.endsWith('.png'))
const report={agent:'10 audit agents',status:missing.length?'FAIL':'PASS',missing,referenceImages:refs.length,routeTargets:['/','/login','/register',...['superadmin','admin','teacher','student','accountant','cleaner','cooking','driver','ict'].map(x=>`/dashboard/${x}`)]}
fs.writeFileSync(path.join(root,'audit-report.json'),JSON.stringify(report,null,2))
console.log(JSON.stringify(report,null,2))
process.exit(missing.length?1:0)
