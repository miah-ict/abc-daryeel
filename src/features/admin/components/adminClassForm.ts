const ownedFields=['name','level','section','academicYear','room','capacity']

export function buildClassPayload(form,item=null) {
 const payload={
  name:form.name,
  level:form.level,
  section:form.section,
  academicYear:form.academicYear,
  room:form.room,
  capacity:Number(form.capacity||20),
 }
 if(!item)return payload
 return {...payload,
  teacherId:item.teacherId||null,
  status:item.status||'Active',
  progressionOrder:item.progressionOrder??null,
  nextClassId:item.nextClassId||null,
  courseEnabled:Boolean(item.courseEnabled),
  courseRankLimit:Number(item.courseRankLimit||25),
  coursePassMark:Number(item.coursePassMark||50),
 }
}

export const classEditorFields=()=>[...ownedFields]

