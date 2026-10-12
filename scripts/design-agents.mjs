import fs from 'node:fs'
import path from 'node:path'
const root=process.cwd()
const required=['LandingPage.jsx','AuthPage.jsx','DashboardPage.jsx','Sidebar.jsx','Topbar.jsx','MetricCard.jsx','Chart.jsx']
const missing=required.filter(f=>!fs.existsSync(path.join(root,'src',f.includes('Page')?'pages':'components',f)))
console.log(JSON.stringify({agent:'design-collective',status:missing.length?'FAIL':'PASS',missing},null,2))
process.exit(missing.length?1:0)
