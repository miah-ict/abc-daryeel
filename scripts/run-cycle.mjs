import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
console.log('\n=== ABC 22-AGENT UI CYCLE ===')
execFileSync(process.execPath,['scripts/agent-manager.mjs'],{stdio:'inherit'})
execFileSync(process.execPath,['scripts/design-agents.mjs'],{stdio:'inherit'})
execFileSync(process.execPath,['scripts/audit-agents.mjs'],{stdio:'inherit'})
const report=JSON.parse(fs.readFileSync('audit-report.json','utf8'))
console.log(`\nCycle result: ${report.status}`)
console.log('If FAIL: Manager routes gaps back to the responsible design agent; rerun npm run audit after fixes.')
