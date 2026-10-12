import 'dotenv/config'
import fs from 'node:fs/promises'
import {connectDatabase} from '../server/db/index.js'

const {pool}=connectDatabase(process.env.DATABASE_URL)
const client=await pool.connect()
try {
 await client.query('BEGIN')
 const source=await fs.readFile(new URL('../server/db/migrations/0006_staff_id_ranges.sql',import.meta.url),'utf8')
 for(const statement of source.split('--> statement-breakpoint'))if(statement.trim())await client.query(statement)
 await client.query('COMMIT')
 console.log('Staff ID migration applied successfully.')
} catch(error) {
 await client.query('ROLLBACK')
 console.error('Staff ID migration failed:',error.code||error.message)
 process.exitCode=1
} finally {client.release();await pool.end()}
