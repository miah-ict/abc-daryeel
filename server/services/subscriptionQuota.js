import { and, eq, inArray, ne, or } from 'drizzle-orm'
import { subscriptions, users } from '../db/schema/index.js'
import { HttpError } from '../middleware/error.middleware.js'

const seatLimits = {
  standard: { manager: 1, accountant: 1 },
  enterprise: { manager: 2, accountant: 2 },
}

const paidRoles = new Set(['manager', 'accountant'])

const isCurrent = (subscription, now) =>
  subscription.status === 'active' &&
  subscription.currentPeriodEnd instanceof Date &&
  subscription.currentPeriodEnd.getTime() > now.getTime()

/**
 * Enforce the manager/accountant seats bought by the owner of a school.
 *
 * A newly paid subscription can exist before onboarding assigns its schoolId,
 * so ownership through an admin account is accepted as well as a direct
 * subscription.schoolId link. Call this from the same transaction as the user
 * write so the workspace revision lock serializes competing seat allocations.
 */
export async function assertSubscriptionSeat(db, { schoolId, role, excludeUserId = null, now = new Date() }) {
  if (!paidRoles.has(role)) return
  if (!schoolId) throw new HttpError(400, 'A school is required for this account role.')

  const owners = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.schoolId, schoolId), eq(users.role, 'admin')))
  const ownerIds = owners.map(owner => owner.id)
  const schoolFilter = ownerIds.length
    ? or(eq(subscriptions.schoolId, schoolId), inArray(subscriptions.ownerUserId, ownerIds))
    : eq(subscriptions.schoolId, schoolId)
  const currentSubscriptions = (await db.select().from(subscriptions).where(schoolFilter))
    .filter(subscription => isCurrent(subscription, now))

  const entitlement = currentSubscriptions.reduce((best, subscription) => {
    const limits = seatLimits[String(subscription.planCode).toLowerCase()]
    return limits && limits[role] > best ? limits[role] : best
  }, 0)
  if (!entitlement) {
    throw new HttpError(403, 'An active subscription is required to add or reactivate managers and accountants.')
  }

  const conditions = [eq(users.schoolId, schoolId), eq(users.role, role), eq(users.status, 'Active')]
  if (excludeUserId) conditions.push(ne(users.id, excludeUserId))
  const activeSeats = await db.select({ id: users.id }).from(users).where(and(...conditions))
  if (activeSeats.length >= entitlement) {
    const label = role === 'manager' ? 'manager' : 'accountant'
    throw new HttpError(409, `Your subscription allows ${entitlement} active ${label}${entitlement === 1 ? '' : 's'}. Deactivate an account or upgrade your plan.`)
  }
}

