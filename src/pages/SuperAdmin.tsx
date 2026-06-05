import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { Building2, Users, ShoppingCart, TrendingUp, DollarSign, Eye, EyeOff, Calendar, Activity, LogOut } from 'lucide-react'
import type { Profile } from '../types'

interface RestaurantMetrics {
  id: string
  name: string
  email: string
  created_at: string
  last_activity?: string
  status: 'active' | 'inactive'
  total_orders: number
  total_revenue: number
  total_users: number
}

export default function SuperAdmin() {
  const { user, profile, logout } = useAuthStore()
  const [restaurants, setRestaurants] = useState<RestaurantMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!user || !profile) return
    fetchRestaurantMetrics()
  }, [user, profile])

  const fetchRestaurantMetrics = async () => {
    try {
      setLoading(true)

      // Get all admin profiles (restaurant owners)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at, role')
        .eq('role', 'admin')
        .order('created_at', { ascending: false })

      if (!profiles) {
        setRestaurants([])
        return
      }

      // For each restaurant, get metrics
      const metricsPromises = profiles.map(async (p) => {
        const [ordersRes, usersRes] = await Promise.all([
          supabase.from('orders').select('id, total', { count: 'exact' }).eq('tenant_id', p.id),
          supabase.from('profiles').select('id', { count: 'exact' }).eq('tenant_id', p.id),
        ])

        const total_orders = ordersRes.count || 0
        const total_revenue = (ordersRes.data || []).reduce((sum: number, o: any) => sum + (o.total || 0), 0)
        const total_users = usersRes.count || 0

        return {
          id: p.id,
          name: p.full_name || 'Sem nome',
          email: p.email || '',
          created_at: p.created_at,
          status: 'active' as const,
          total_orders,
          total_revenue,
          total_users,
        }
      })

      const metrics = await Promise.all(metricsPromises)
      setRestaurants(metrics.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    } catch (err) {
      console.error('Erro ao carregar métricas:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredRestaurants = restaurants.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    totalRestaurants: restaurants.length,
    totalOrders: restaurants.reduce((s, r) => s + r.total_orders, 0),
    totalRevenue: restaurants.reduce((s, r) => s + r.total_revenue, 0),
    totalUsers: restaurants.reduce((s, r) => s + r.total_users, 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Superadmin</h1>
          <p className="text-slate-600 mt-1">Visão geral de todos os restaurantes</p>
        </div>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Restaurantes</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalRestaurants}</p>
            </div>
            <Building2 size={32} className="text-indigo-400 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Pedidos Total</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalOrders.toLocaleString()}</p>
            </div>
            <ShoppingCart size={32} className="text-emerald-400 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Faturamento</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">
                R$ {(stats.totalRevenue / 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <DollarSign size={32} className="text-blue-400 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Usuários Total</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalUsers}</p>
            </div>
            <Users size={32} className="text-purple-400 opacity-20" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar restaurante por nome ou e-mail..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-slate-400">Carregando restaurantes...</div>
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-slate-500">Nenhum restaurante encontrado</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Restaurante</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">E-mail</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Pedidos</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Faturamento</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Usuários</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Cadastro</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRestaurants.map((restaurant) => (
                  <tr key={restaurant.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Building2 size={18} className="text-indigo-600" />
                        </div>
                        <p className="font-medium text-slate-900">{restaurant.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">{restaurant.email}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ShoppingCart size={14} className="text-slate-400" />
                        <span className="font-semibold text-slate-900">{restaurant.total_orders}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <DollarSign size={14} className="text-emerald-600" />
                        <span className="font-semibold text-emerald-600">
                          R$ {(restaurant.total_revenue / 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Users size={14} className="text-slate-400" />
                        <span className="font-semibold text-slate-900">{restaurant.total_users}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(restaurant.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        restaurant.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {restaurant.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
