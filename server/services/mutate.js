import {randomUUID} from 'node:crypto'
import {eq} from 'drizzle-orm'
import {workspaces,systemLogs} from '../db/schema/index.js'
import {HttpError} from '../middleware/error.middleware.js'
// All canonical writes lock the same revision as workspace saves.
export function mutate(db,user,action,run) {
 return db.transaction(async tx=>{
  const [state]=await tx.select().from(workspaces).where(eq(workspaces.id,'school')).for('update')
  if(!state)throw new HttpError(503,'Initialize the school database first.')
  const result=await run(tx)
  if(result?.duplicate)return result
  await tx.update(workspaces).set({revision:state.revision+1}).where(eq(workspaces.id,'school'))
  const recordId=result?.id||result?.entry?.id||result?.transaction?.id||result?.record?.id||null
  await tx.insert(systemLogs).values({id:randomUUID(),actorId:user?.id||null,schoolId:user?.schoolId||null,
   action,detail:recordId?`Record ${recordId}`:'Canonical resource updated'})
  return result
 })
}
