import { and, eq, or } from 'drizzle-orm'
import { closings } from '../db/schema/index.js'
import { HttpError } from '../middleware/error.middleware.js'

export function financeSchoolId(user) {
  if (!user?.schoolId) throw new HttpError(403, 'A school account is required for finance records.')
  return user.schoolId
}

export function moneyCents(value, { allowZero = false } = {}) {
  let cents
  if (typeof value === 'string' && /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(value)) {
    const [whole, fraction = ''] = value.split('.')
    cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    const scaled = value * 100
    if (Math.abs(scaled - Math.round(scaled)) <= 0.000001) cents = Math.round(scaled)
  }
  if (!Number.isSafeInteger(cents) || cents > 999999999999 || (allowZero ? cents < 0 : cents <= 0)) {
    throw new HttpError(400, 'Amount must be a valid amount in cents.')
  }
  return cents
}

export const moneyString = cents => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`

export async function assertOpenFinancePeriod(tx, schoolId, date) {
  const [closed] = await tx.select({ id: closings.id }).from(closings).where(and(
    eq(closings.schoolId, schoolId),
    or(and(eq(closings.kind, 'day'), eq(closings.period, date)),
      and(eq(closings.kind, 'month'), eq(closings.period, date.slice(0, 7)))),
  )).limit(1)
  if (closed) throw new HttpError(409, 'This accounting period is closed.')
}
