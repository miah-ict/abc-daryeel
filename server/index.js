import { readEnv } from './config/env.js'
import { connectDatabase } from './db/index.js'
import { retryDatabase } from './db/retry.js'
import { createApp } from './app.js'
import { sql } from 'drizzle-orm'

async function start() {
 const env=readEnv(),{db,pool}=connectDatabase(env.DATABASE_URL)
 
 try {
   await retryDatabase(() => db.execute(sql`select 1`))
   console.log('Database connected successfully.')
 } catch (error) {
   console.warn(`Warning: Initial database connection test failed (${error.message}). The server will still start, but the first request might take longer.`)
 }

 const server=createApp(db,env).listen(env.PORT,()=>console.log(`ABC API listening on http://localhost:${env.PORT}`))
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(async()=>{await pool.end();process.exit(0)}))
}

start().catch(error=>{console.error(`Fatal error: ${error.message}`);process.exitCode=1})
