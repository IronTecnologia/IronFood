import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tables from './pages/Tables'
import Products from './pages/Products'
import Orders from './pages/Orders'
import KitchenKDS from './pages/KitchenKDS'
import BarKDS from './pages/BarKDS'
import POS from './pages/POS'
import Reports from './pages/Reports'
import Users from './pages/Users'
import Settings from './pages/Settings'
import Menu from './pages/Menu'
import DeliveryOrders from './pages/DeliveryOrders'
import Landing from './pages/Landing'
import Admin from './pages/Admin'
import Customers from './pages/Customers'
import SuperAdmin from './pages/SuperAdmin'
import Financial from './pages/Financial'

function RoleRedirect() {
  const role = useAuthStore(s => s.profile?.role)
  const map: Record<string, string> = {
    admin: '/dashboard',
    waiter: '/tables',
    kitchen: '/kds/kitchen',
    bar: '/kds/bar',
    cashier: '/pos',
  }
  return <Navigate to={role ? (map[role] ?? '/dashboard') : '/login'} replace />
}

function AdminRoute() {
  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)

  // Se é superadmin (tenant_id === user.id)
  if (user && profile && profile.tenant_id === user.id) {
    return <SuperAdmin />
  }

  // Caso contrário, mostra o painel de admin normal
  return <Admin />
}

export default function App() {
  const initialize = useAuthStore(s => s.initialize)
  const loading = useAuthStore(s => s.loading)

  useEffect(() => { initialize() }, [initialize])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
          <span className="text-slate-500 text-sm font-medium">Carregando MesaFlow…</span>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/menu/:slug" element={<Menu />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminRoute />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<RoleRedirect />} />
            <Route path="/dashboard"   element={<ProtectedRoute roles={['admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/tables"      element={<ProtectedRoute roles={['admin','waiter']}><Tables /></ProtectedRoute>} />
            <Route path="/products"    element={<ProtectedRoute roles={['admin']}><Products /></ProtectedRoute>} />
            <Route path="/orders"      element={<ProtectedRoute roles={['admin','waiter','cashier']}><Orders /></ProtectedRoute>} />
            <Route path="/delivery"    element={<ProtectedRoute roles={['admin','cashier']}><DeliveryOrders /></ProtectedRoute>} />
            <Route path="/kds/kitchen" element={<ProtectedRoute roles={['admin','kitchen','waiter']}><KitchenKDS /></ProtectedRoute>} />
            <Route path="/kds/bar"     element={<ProtectedRoute roles={['admin','bar','waiter']}><BarKDS /></ProtectedRoute>} />
            <Route path="/pos"         element={<ProtectedRoute roles={['admin','cashier']}><POS /></ProtectedRoute>} />
            <Route path="/reports"     element={<ProtectedRoute roles={['admin']}><Reports /></ProtectedRoute>} />
            <Route path="/financial"   element={<ProtectedRoute roles={['admin']}><Financial /></ProtectedRoute>} />
            <Route path="/users"       element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
            <Route path="/customers"   element={<ProtectedRoute roles={['admin']}><Customers /></ProtectedRoute>} />
            <Route path="/settings"    element={<ProtectedRoute roles={['admin']}><Settings /></ProtectedRoute>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
