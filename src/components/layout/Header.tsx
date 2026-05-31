import { Menu, Bell } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tables': 'Mapa de Mesas',
  '/orders': 'Pedidos',
  '/kds/kitchen': 'KDS — Cozinha',
  '/kds/bar': 'KDS — Bar',
  '/pos': 'Caixa',
  '/products': 'Produtos',
  '/reports': 'Relatórios',
  '/users': 'Usuários',
  '/settings': 'Configurações',
}

interface Props {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: Props) {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] ?? 'MesaFlow'
  const tenant = useAuthStore(s => s.tenant)

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 gap-4 sticky top-0 z-10">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Menu size={20} className="text-slate-600" />
      </button>

      <h1 className="font-semibold text-slate-800 text-lg flex-1">{title}</h1>

      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors relative">
          <Bell size={18} className="text-slate-500" />
        </button>

        {tenant && (
          <span className="hidden sm:block text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
            {tenant.name}
          </span>
        )}
      </div>
    </header>
  )
}
