import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env before running database commands')
export default defineConfig({ schema: './server/db/schema/index.js', out: './server/db/migrations', dialect: 'postgresql', dbCredentials: { url: process.env.DATABASE_URL } })
