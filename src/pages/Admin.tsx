import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, LogOut, Building2, Mail, Calendar, Clock } from 'lucide-react'

interface Tenant {
  id: string
  name: string
  email: string
  created_at: string
  last_access: string | null
  status: 'active' | 'inactive'
  owner_id: string
}

export default function Admin() {
  const { user, profile, logout } = useAuthStore()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Only admin can access
  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at, role')
        .eq('role', 'admin')
        .order('created_at', { ascending: false })

      if (err) throw err

      // Mock last_access for now (you can add this to profiles table later)
      const tenantsData: Tenant[] = (data || []).map((profile: any) => ({
        id: profile.id,
        name: profile.full_name || 'Sem nome',
        email: profile.email,
        created_at: profile.created_at,
        last_access: null,
        status: 'active',
        owner_id: profile.id,
      }))

      setTenants(tenantsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tenants')
    } finally {
      setLoading(false)
    }
  }

  const toggleStatus = async (tenantId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'

      setTenants(tenants.map(t =>
        t.id === tenantId ? { ...t, status: newStatus as 'active' | 'inactive' } : t
      ))

      // TODO: Update status in database
      // await supabase.from('tenants').update({ status: newStatus }).eq('id', tenantId)
    } catch (err) {
      setError('Erro ao atualizar status')
      fetchTenants()
    }
  }

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">MesaFlow Admin</h1>
            <p className="text-sm text-slate-400">Gestão de clientes</p>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total de Clientes</p>
                <p className="text-3xl font-bold text-white mt-2">{tenants.length}</p>
              </div>
              <Building2 size={32} className="text-indigo-400 opacity-20" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Ativos</p>
                <p className="text-3xl font-bold text-emerald-400 mt-2">
                  {tenants.filter(t => t.status === 'active').length}
                </p>
              </div>
              <Eye size={32} className="text-emerald-400 opacity-20" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Inativos</p>
                <p className="text-3xl font-bold text-rose-400 mt-2">
                  {tenants.filter(t => t.status === 'inactive').length}
                </p>
              </div>
              <EyeOff size={32} className="text-rose-400 opacity-20" />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Taxa de Atividade</p>
                <p className="text-3xl font-bold text-blue-400 mt-2">
                  {tenants.length > 0
                    ? Math.round((tenants.filter(t => t.status === 'active').length / tenants.length) * 100)
                    : 0}%
                </p>
              </div>
              <Building2 size={32} className="text-blue-400 opacity-20" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-slate-400">Carregando clientes...</div>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded text-rose-300 text-sm">
              {error}
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-slate-400">Nenhum cliente encontrado</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Restaurante</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">E-mail</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Cadastro</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Último Acesso</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-indigo-400" />
                          <span className="text-white font-medium">{tenant.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Mail size={14} className="text-slate-500" />
                          {tenant.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Calendar size={14} />
                          {new Date(tenant.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Clock size={14} />
                          {tenant.last_access
                            ? new Date(tenant.last_access).toLocaleDateString('pt-BR')
                            : 'Nunca'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          tenant.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {tenant.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleStatus(tenant.id, tenant.status)}
                          className="px-3 py-1.5 text-xs rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                        >
                          {tenant.status === 'active' ? 'Desativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
