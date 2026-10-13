import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),{parse}=require('@babel/parser'),traverse=require('@babel/traverse').default,generate=require('@babel/generator').default
for(const feature of ['admin','teachers','students','finance','superadmin']) {
 const dir=`src/features/${feature}/components`,file=fs.readdirSync(dir).find(n=>n.endsWith('Workspace.tsx'))
 const source=fs.readFileSync(path.join(dir,file),'utf8'),ast=parse(source,{sourceType:'module',plugins:['jsx']})
 const imports=ast.program.body.filter(n=>n.type==='ImportDeclaration').map(n=>source.slice(n.start,n.end)).join('\n')
 const edits=[],newImports=[];let count=0
 traverse(ast,{LogicalExpression(p){
  if(p.node.operator!=='&&'||!['JSXElement','JSXFragment'].includes(p.node.right.type))return
  const left=generate(p.node.left).code
  if(!/\bpage === ['"]/.test(left)||p.node.right.end-p.node.right.start<350)return
  // Avoid nested route sections: only extract the outer section.
  if(p.findParent(q=>q.isLogicalExpression()&&q.node.operator==='&&'&&/\bpage === ['"]/.test(generate(q.node.left).code)&&['JSXElement','JSXFragment'].includes(q.node.right.type)))return
  const right=p.get('right'),props=new Set(),modules=new Set()
  const record=(name,scope)=>{const binding=scope.getBinding(name);if(!binding)return;if(binding.identifier.start>=right.node.start&&binding.identifier.end<=right.node.end)return;if(binding.kind==='module')modules.add(name);else props.add(name)}
  right.traverse({ReferencedIdentifier(q){record(q.node.name,q.scope)},JSXOpeningElement(q){if(q.node.name.type==='JSXIdentifier'&&/^[A-Z]/.test(q.node.name.name))record(q.node.name.name,q.scope)}})
  const slug=left.match(/page === ['"]([^'"]*)/)[1]||'overview',name=feature[0].toUpperCase()+feature.slice(1)+slug.split(/[^a-zA-Z0-9]/).map(w=>w[0]?.toUpperCase()+w.slice(1)).join('')+'Section'+(++count)
  const body=source.slice(right.node.start,right.node.end)
  const neededImports=ast.program.body.filter(n=>n.type==='ImportDeclaration'&&n.specifiers.some(s=>modules.has(s.local.name))).map(n=>source.slice(n.start,n.end)).join('\n')
  fs.writeFileSync(path.join(dir,`${name}.jsx`),`${neededImports}\n\nexport default function ${name}({${[...props].join(', ')}}) {\n return (${body})\n}\n`)
  newImports.push(`import ${name} from './${name}'`)
  edits.push({start:right.node.start,end:right.node.end,value:`<${name} ${[...props].map(k=>`${k}={${k}}`).join(' ')}/>`})
 }})
 let result=source;for(const e of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,e.start)+e.value+result.slice(e.end)
 fs.writeFileSync(path.join(dir,file),newImports.join('\n')+'\n'+result)
 console.log(`${feature}: extracted ${count} route sections`)
}
