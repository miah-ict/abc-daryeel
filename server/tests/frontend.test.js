import {test} from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import {renderToString} from 'react-dom/server'
import {StaticRouter} from 'react-router-dom'
import {build} from 'esbuild'
import fs from 'node:fs/promises'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
const directory=path.resolve('node_modules/.cache/abc-tests')
await fs.mkdir(directory,{recursive:true})
const output=path.join(directory,'frontend-cases.mjs')
await build({entryPoints:['server/tests/frontend-cases.jsx'],outfile:output,bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'},logLevel:'silent'})
const {cases,WorkspaceContext,fixtures,readonly}=await import(pathToFileURL(output).href)
for(const [role,Workspace,routes] of cases) {
 test(`${role} route sections render with database payloads`,()=>{
  for(const route of routes) {
   const value={data:fixtures[role],content:{...readonly[role],linkAccounts:[]},update(){}}
   const html=renderToString(React.createElement(StaticRouter,{location:`/dashboard/${role}/${route}`},React.createElement(WorkspaceContext.Provider,{value},React.createElement(Workspace))))
   assert.ok(html.length>1000,`${role}/${route} did not render its workspace`)
  }
 })
 test(`${role} handles empty newly provisioned modules`,()=>{
  const data=Object.fromEntries(Object.entries(fixtures[role]).map(([key,value])=>[key,Array.isArray(value)?[]:typeof value==='boolean'?false:typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,typeof v==='boolean'?v:''])):value]))
  if(role==='student')data['abc-student-profile']={name:'New Guardian',guardian:'Guardian',email:'new@example.com'}
  const content={...readonly[role],linkAccounts:[]}
  if(role==='student')Object.assign(content,{subjects:[],studentActivities:[],studentAnnouncements:[],studentGallery:[]})
  for(const route of routes) {
   const html=renderToString(React.createElement(StaticRouter,{location:`/dashboard/${role}/${route}`},React.createElement(WorkspaceContext.Provider,{value:{data,content,update(){}}},React.createElement(Workspace))))
   assert.ok(html.length>1000)
  }
 })
}

const [,AdminWorkspace,adminRoutes]=cases.find(([role])=>role==='admin')
test('admin routes render after creating a class with an education level',()=>{
 const data={...fixtures.admin,
  'abc-admin-teachers':[],
  'abc-admin-classes':[{id:'CL-005',name:'New classroom',level:'Lower',group:'Lower',capacity:20}],
 }
 for(const route of adminRoutes){
  const html=renderToString(React.createElement(StaticRouter,{location:`/dashboard/admin/${route}`},React.createElement(WorkspaceContext.Provider,{value:{data,content:{linkAccounts:[]},update(){}}},React.createElement(AdminWorkspace))))
  assert.ok(html.length>1000)
  if(route==='classes'){assert.match(html,/New classroom/);assert.match(html,/Lower/)}
 }
})
test('admin teachers page renders subjects assigned to multiple teachers',()=>{
 const data={...fixtures.admin,'abc-admin-subjects':[{id:'SUB-010',name:'Biology',teacherIds:['TC-001','TC-002']}]}
 const html=renderToString(React.createElement(StaticRouter,{location:'/dashboard/admin/teachers'},React.createElement(WorkspaceContext.Provider,{value:{data,content:{linkAccounts:[]},update(){}}},React.createElement(AdminWorkspace))))
 assert.match(html,/Teachers &amp; Subjects/)
 assert.match(html,/Biology/)
 assert.match(html,/Amina Hassan/)
 assert.match(html,/Maryam Ali/)
})
test('admin class links filter the student directory and unassigned students get an assign action',()=>{
 const data={...fixtures.admin,
  'abc-admin-classes':[{id:'class-a',name:'Grade 7',level:'Middle',section:'A',capacity:30},{id:'class-b',name:'Grade 7',level:'Middle',section:'B',capacity:30}],
  'abc-admin-students':[{id:'student-a',name:'Student Alpha',classId:'class-a',group:'Grade 7',section:'A',status:'Present'},{id:'student-b',name:'Student Beta',classId:'class-b',group:'Grade 7',section:'B',status:'Present'},{id:'student-free',name:'Student Free',group:'Unassigned',status:'Present'}]
 }
 const value={data,content:{linkAccounts:[]},update(){},refresh(){}}
 const classesHtml=renderToString(React.createElement(StaticRouter,{location:'/dashboard/admin/classes'},React.createElement(WorkspaceContext.Provider,{value},React.createElement(AdminWorkspace))))
 assert.match(classesHtml,/students\?class=class-a/)
 const filteredHtml=renderToString(React.createElement(StaticRouter,{location:'/dashboard/admin/students?class=class-a'},React.createElement(WorkspaceContext.Provider,{value},React.createElement(AdminWorkspace))))
 assert.match(filteredHtml,/Student Alpha/);assert.doesNotMatch(filteredHtml,/Student Beta/)
 const allHtml=renderToString(React.createElement(StaticRouter,{location:'/dashboard/admin/students'},React.createElement(WorkspaceContext.Provider,{value},React.createElement(AdminWorkspace))))
 assert.match(allHtml,/Assign class to Student Free/)
})
test('admin routes render records and settings with missing names',()=>{
 const data={...fixtures.admin,
  'abc-admin-settings':{...fixtures.admin['abc-admin-settings'],name:null},
  'abc-admin-students':[{id:'ST-new',group:'KG 1',status:'Present'}],
  'abc-admin-teachers':[{id:'TC-new',group:'KG 1',status:'Active'}],
  'abc-admin-staff':[{id:'SF-new',group:'Operations',status:'Active'}],
 }
 for(const route of adminRoutes){
  const html=renderToString(React.createElement(StaticRouter,{location:`/dashboard/admin/${route}`},React.createElement(WorkspaceContext.Provider,{value:{data,content:{linkAccounts:[]},update(){}}},React.createElement(AdminWorkspace))))
  assert.ok(html.length>1000)
 }
})
test('new teacher dashboard renders with empty content and workspace modules',()=>{
 const data=Object.fromEntries(Object.entries(fixtures.teacher).map(([key,value])=>[key,Array.isArray(value)?[]:typeof value==='boolean'?false:typeof value==='object'?{}:value]))
 data['abc-teacher-settings']={name:'Mohamed Hassan',email:null}
 const [,TeacherWorkspace]=cases.find(([role])=>role==='teacher')
 const html=renderToString(React.createElement(StaticRouter,{location:'/dashboard/teacher'},React.createElement(WorkspaceContext.Provider,{value:{data,content:{},update(){}}},React.createElement(TeacherWorkspace))))
 assert.ok(html.length>1000)
 assert.match(html,/Good Morning/)
 assert.match(html,/Mohamed/)
})
test('manager dashboard and pages render with missing newly provisioned data',()=>{
 const [,ManagerWorkspace,routes]=cases.find(([role])=>role==='manager')
 for(const route of routes){
  const html=renderToString(React.createElement(StaticRouter,{location:`/dashboard/manager/${route}`},React.createElement(WorkspaceContext.Provider,{value:{data:{},content:{},update(){},refresh(){}}},React.createElement(ManagerWorkspace))))
  assert.ok(html.length>1000)
  if(!route){assert.match(html,/Quick Actions/);assert.match(html,/Weekly lessons/);assert.match(html,/Team attendance/)}
 }
})
test('superadmin does not offer school or user creation actions',()=>{
 const [,SuperAdminWorkspace]=cases.find(([role])=>role==='superadmin')
 const value={data:fixtures.superadmin,content:readonly.superadmin,update(){}}
 for(const route of ['','users','schools']){
  const html=renderToString(React.createElement(StaticRouter,{location:`/dashboard/superadmin/${route}`},React.createElement(WorkspaceContext.Provider,{value},React.createElement(SuperAdminWorkspace))))
  assert.doesNotMatch(html,/Add User/)
  assert.doesNotMatch(html,/Add School/)
 }
})
