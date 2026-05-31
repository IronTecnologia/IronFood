import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import type { UserRole } from '../../types'

interface Props {
  roles?: UserRole[]
  children?: React.ReactNode
}

export default function ProtectedRoute({ roles, children }: Props) {
  const { user, profile, initialized } = useAuthStore()

  if (!initialized) return null
  if (!user || !profile) return <Navigate to="/login" replace />
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />

  return children ? <>{children}</> : <Outlet />
}
