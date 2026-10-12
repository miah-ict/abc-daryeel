import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool as PostgresPool } from 'pg'
import { drizzle as drizzlePostgres } from 'drizzle-orm/node-postgres'
import ws from 'ws'
import * as schema from './schema/index.js'
export function connectDatabase(url) {
  const hostname = new URL(url).hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    const pool = new PostgresPool({ connectionString: url, max: 5, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000 })
    pool.on('error', error => console.error('PostgreSQL pool connection error:', error.code || error.message))
    return { db: drizzlePostgres(pool, { schema }), pool }
  }
  neonConfig.webSocketConstructor = ws
  // Use Neon HTTPS for ordinary queries. Interactive transactions still use
  // WebSockets, but login/session reads no longer depend on that connection.
  neonConfig.poolQueryViaFetch = true
  const pool = new Pool({
    connectionString: url,
    max: 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  })
  pool.on('error', error => console.error('Neon pool connection error:', error.code || error.message))
  return { db: drizzle(pool, { schema }), pool }
}
