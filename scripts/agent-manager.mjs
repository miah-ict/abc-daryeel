import fs from 'node:fs'
import path from 'node:path'
const root=process.cwd()
const design=fs.readdirSync(path.join(root,'agents/design')).length
const audit=fs.readdirSync(path.join(root,'agents/audit')).length
const manager=fs.existsSync(path.join(root,'agents/00-manager.md'))
const planner=fs.existsSync(path.join(root,'agents/01-planner.md'))
console.log(JSON.stringify({manager,planner,designAgents:design,auditAgents:audit,totalAgents:design+audit+2},null,2))
