import 'dotenv/config'
import { z } from 'zod'
const schema = z.object({
  DATABASE_URL: z.string().url().refine(v => /^postgres(ql)?:/.test(v), 'Use a PostgreSQL connection URL'),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  CLIENT_ORIGIN: z.string().refine(value => value.split(',').every(origin => z.string().url().safeParse(origin.trim()).success), 'Use a comma-separated list of valid origins').default('http://localhost:5173'),
  PUBLIC_APP_URL: z.string().url().default('http://localhost:5000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TRUST_PROXY: z.enum(['true', 'false']).default('false').transform(value => value === 'true'),
  SIFALO_ENV: z.enum(['staging', 'live']).default('staging'),
  SIFALO_API_USER: z.string().trim().min(1).optional(),
  SIFALO_API_KEY: z.string().trim().min(1).optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') return
  for (const [field, value] of [['CLIENT_ORIGIN', env.CLIENT_ORIGIN], ['PUBLIC_APP_URL', env.PUBLIC_APP_URL]]) {
    if (String(value).split(',').some(url => !url.trim().startsWith('https://'))) ctx.addIssue({code:'custom',path:[field],message:'HTTPS is required in production'})
  }
  const database = new URL(env.DATABASE_URL)
  if (!['localhost', '127.0.0.1', '::1'].includes(database.hostname) && !/sslmode=(require|verify-ca|verify-full)/.test(database.search)) {
    ctx.addIssue({code:'custom',path:['DATABASE_URL'],message:'Remote production databases must require TLS'})
  }
})
export function readEnv(source = process.env) {
  const result = schema.safeParse(source)
  if (!result.success) throw new Error(`Invalid server configuration: ${result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  return result.data
}
