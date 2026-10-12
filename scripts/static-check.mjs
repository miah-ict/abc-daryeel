import fs from 'node:fs'
import path from 'node:path'
const root=process.cwd()
const files=[]
function walk(d){for(const x of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,x.name);if(x.isDirectory()&&!['node_modules','dist'].includes(x.name))walk(p);else if(x.isFile()&&/\.(jsx|js)$/.test(x.name))files.push(p)}}
walk(path.join(root,'src'))
const missing=[]
for(const file of files){const text=fs.readFileSync(file,'utf8');for(const m of text.matchAll(/from ['"](\.\.?\/[^'"]+)['"]/g)){let p=path.resolve(path.dirname(file),m[1]);if(!path.extname(p)) for(const ext of ['.js','.jsx']) if(fs.existsSync(p+ext)){p=p+ext;break} if(!fs.existsSync(p)) missing.push({file:path.relative(root,file),import:m[1]})}}
const refDir=path.join(root,'public/references'); const refs=fs.readdirSync(refDir).filter(x=>x.endsWith('.png'))
const result={status:missing.length?'FAIL':'PASS',jsFiles:files.length,missingImports:missing,referenceImages:refs.length,agentFiles:fs.readdirSync(path.join(root,'agents/design')).length+fs.readdirSync(path.join(root,'agents/audit')).length+2}
console.log(JSON.stringify(result,null,2)); fs.writeFileSync(path.join(root,'static-check.json'),JSON.stringify(result,null,2)); process.exit(missing.length?1:0)
