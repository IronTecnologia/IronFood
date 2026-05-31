import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Profile, Tenant, UserRole } from '../types'

interface AuthState {
  user: { id: string; email?: string } | null
  profile: Profile | null
  tenant: Tenant | null
  loading: boolean
  initialized: boolean
}

interface AuthActions {
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  profile: null,
  tenant: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await fetchUserData(session.user.id, set)
      }
    } catch (err) {
      console.error('Auth init error:', err)
    } finally {
      set({ loading: false, initialized: true })
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchUserData(session.user.id, set)
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null, tenant: null })
      }
    })
  },

  login: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, tenant: null })
  },

  refreshProfile: async () => {
    const { user } = get()
    if (user) await fetchUserData(user.id, set)
  },
}))

async function fetchUserData(
  userId: string,
  set: (partial: Partial<AuthState>) => void
) {
  const [{ data: profile }, { data: { user } }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single(),
    supabase.auth.getUser(),
  ])

  if (!profile) return

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', profile.tenant_id)
    .single()

  set({
    user: user ? { id: user.id, email: user.email } : null,
    profile: profile as Profile,
    tenant: tenant as Tenant,
  })
}

export function useIsRole(...roles: UserRole[]) {
  const role = useAuthStore(s => s.profile?.role)
  return role ? roles.includes(role) : false
}

export function useCanAccess(page: string): boolean {
  const role = useAuthStore(s => s.profile?.role)
  if (!role) return false
  const access: Record<string, UserRole[]> = {
    dashboard: ['admin'],
    tables: ['admin', 'waiter'],
    products: ['admin'],
    orders: ['admin', 'waiter', 'cashier'],
    'kds/kitchen': ['admin', 'kitchen', 'waiter'],
    'kds/bar': ['admin', 'bar', 'waiter'],
    pos: ['admin', 'cashier'],
    reports: ['admin'],
    users: ['admin'],
    settings: ['admin'],
  }
  return access[page]?.includes(role) ?? false
}
