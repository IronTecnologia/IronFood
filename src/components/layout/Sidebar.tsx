import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, UtensilsCrossed, Package, ClipboardList,
  ChefHat, GlassWater, DollarSign, BarChart3, Users,
  Settings, QrCode, LogOut, Utensils,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { cn } from '../../utils/cn'
import { ROLE_LABEL } from '../../utils/format'

const NAV = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',    roles: ['admin'] },
  { to: '/tables',      icon: UtensilsCrossed, label: 'Mesas',        roles: ['admin','waiter'] },
  { to: '/orders',      icon: ClipboardList,   label: 'Pedidos',      roles: ['admin','waiter','cashier'] },
  { to: '/kds/kitchen', icon: ChefHat,         label: 'KDS Cozinha',  roles: ['admin','kitchen','waiter'] },
  { to: '/kds/bar',     icon: GlassWater,      label: 'KDS Bar',      roles: ['admin','bar','waiter'] },
  { to: '/pos',         icon: DollarSign,      label: 'Caixa',        roles: ['admin','cashier'] },
  { to: '/products',    icon: Package,         label: 'Produtos',     roles: ['admin'] },
  { to: '/reports',     icon: BarChart3,       label: 'Relatórios',   roles: ['admin'] },
  { to: '/users',       icon: Users,           label: 'Usuários',     roles: ['admin'] },
  { to: '/settings',    icon: Settings,        label: 'Configurações',roles: ['admin'] },
]

interface Props { onClose?: () => void }

export default function Sidebar({ onClose }: Props) {
  const { profile, tenant, logout } = useAuthStore()
  const role = profile?.role ?? ''

  const visibleNav = NAV.filter(n => n.roles.includes(role))

  return (
    <aside className="flex flex-col h-full bg-slate-900 text-slate-100 w-64">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Utensils size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <span className="font-bold text-white tracking-tight">MesaFlow</span>
          {tenant && (
            <p className="text-xs text-slate-400 truncate">{tenant.name}</p>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto scrollbar-thin space-y-0.5">
        {visibleNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              )
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        {/* Cardápio digital */}
        {tenant && (
          <a
            href={`/menu/${tenant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-all"
          >
            <QrCode size={18} className="flex-shrink-0" />
            Cardápio Digital
          </a>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{profile?.full_name}</p>
            <p className="text-xs text-slate-400">{ROLE_LABEL[role] ?? role}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 text-slate-400 hover:text-rose-400 text-sm transition-colors w-full px-1 py-1"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  )
}
