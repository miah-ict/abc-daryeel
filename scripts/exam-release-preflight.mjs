import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root=resolve(new URL('..',import.meta.url).pathname)
const required=[
  'docs/EXAM_POLICY_DECISIONS.md',
  'docs/EXAM_WAVE1_MANAGER_REVIEW.md',
  'docs/EXAM_IMPLEMENTATION_EVIDENCE.md',
  'server/db/migrations/0013_exams_v2_foundation.sql',
]

const failures=[]
const contents=new Map()

for(const relative of required){
  try{contents.set(relative,await readFile(resolve(root,relative),'utf8'))}
  catch{failures.push(`Missing required release artifact: ${relative}`)}
}

const policy=contents.get('docs/EXAM_POLICY_DECISIONS.md')||''
const waveOne=contents.get('docs/EXAM_WAVE1_MANAGER_REVIEW.md')||''
const evidence=contents.get('docs/EXAM_IMPLEMENTATION_EVIDENCE.md')||''

const pending=(policy.match(/\*\*Status:\*\* PENDING/g)||[]).length
if(pending)failures.push(`Academic policy has ${pending} pending decision(s).`)
if(!/Overall status:\s*\*\*APPROVED\*\*/.test(waveOne))failures.push('Manager gate G1 is not APPROVED.')
for(const gate of ['G2','G3','G4','G5']){
  const approved=new RegExp(`\\| ${gate}[^\\n]*\\| \\*\\*APPROVED\\*\\* \\|`).test(evidence)
  if(!approved)failures.push(`Manager gate ${gate} is not APPROVED in implementation evidence.`)
}

if(failures.length){
  console.error('Exam release preflight: BLOCKED')
  for(const failure of failures)console.error(`- ${failure}`)
  process.exitCode=1
}else{
  console.log('Exam release preflight: APPROVED')
}
