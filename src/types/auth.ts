import type { Role } from '../data/roles'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: Role
  schoolId?: string | null
  loginId?: number | null
  firstLogin?: boolean
}

export interface AuthResult {
  user: AuthUser
}
