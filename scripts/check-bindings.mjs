import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),{parse}=require('@babel/parser'),traverse=require('@babel/traverse').default
const globals=new Set('undefined window document console Date Intl Math JSON Object Array String Number Boolean Set Map WeakSet WeakMap URL URLSearchParams IntersectionObserver Blob FormData FileReader crypto localStorage sessionStorage setTimeout clearTimeout setInterval clearInterval navigator fetch Promise Error Event AbortController globalThis'.split(' '))
let errors=0
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())scan(p);else if(e.name.endsWith('.jsx')){
 const ast=parse(fs.readFileSync(p,'utf8'),{sourceType:'module',plugins:['jsx']})
 traverse(ast,{ReferencedIdentifier(q){if(!q.scope.hasBinding(q.node.name)&&!globals.has(q.node.name)){console.error(`${p}:${q.node.loc.start.line}: unbound ${q.node.name}`);errors++}}})
}}}
scan('src');process.exitCode=errors?1:0;console.log(`${errors} unbound references`)
