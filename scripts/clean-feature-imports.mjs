import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),{parse}=require('@babel/parser'),traverse=require('@babel/traverse').default,generate=require('@babel/generator').default
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())scan(p);else if(e.name.endsWith('.jsx')){
 const s=fs.readFileSync(p,'utf8'),ast=parse(s,{sourceType:'module',plugins:['jsx']}),edits=[]
 traverse(ast,{ImportDeclaration(q){if(!q.node.specifiers.length)return;const kept=q.node.specifiers.filter(n=>q.scope.getBinding(n.local.name)?.referenced);if(kept.length===q.node.specifiers.length)return;const start=q.node.start,end=q.node.end;q.node.specifiers=kept;edits.push({start,end,value:kept.length?generate(q.node).code:''})}})
 let result=s;for(const e of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,e.start)+e.value+result.slice(e.end);fs.writeFileSync(p,result)
}}}
scan('src/features')
