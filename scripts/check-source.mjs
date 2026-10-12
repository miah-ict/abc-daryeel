import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),{parse}=require('@babel/parser'),traverse=require('@babel/traverse').default
let errors=0
function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())scan(file);else if(/\.(js|jsx|mjs)$/.test(file)){
 try {const ast=parse(fs.readFileSync(file,'utf8'),{sourceType:'module',plugins:['jsx']})
 traverse(ast,{ImportDeclaration(p){const value=p.node.source.value;if(value.startsWith('.')){const target=path.resolve(path.dirname(file),value);if(!['','.js','.jsx','.mjs'].some(ext=>fs.existsSync(target+ext))){console.error(`${file}: missing import ${value}`);errors++}}}})
 }catch(e){console.error(`${file}: ${e.message}`);errors++}
}}}
scan('src');scan('server');console.log(errors?`${errors} source errors`:'All JavaScript/JSX parses and local imports resolve.');process.exitCode=errors?1:0
