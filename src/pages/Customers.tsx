import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { Search, Phone, MapPin, Calendar, User } from 'lucide-react'
import type { Customer } from '../types'

export default function Customers() {
  const { user, profile } = useAuthStore()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!user || !profile) return
    fetchCustomers()
  }, [user, profile])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', profile?.tenant_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCustomers((data || []) as Customer[])
    } catch (err) {
      console.error('Erro ao carregar clientes:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Clientes</h1>
        <p className="text-slate-600 mt-1">Gerenciar clientes de delivery e retirada</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Total de Clientes</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{customers.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Com Endereço</p>
          <p className="text-3xl font-bold text-indigo-600 mt-2">{customers.filter(c => c.address).length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Últimos 30 dias</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">
            {customers.filter(c => {
              const date = new Date(c.created_at)
              const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              return date > thirtyDaysAgo
            }).length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-slate-400">Carregando clientes...</div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex items-center justify-center p-12 text-center">
            <div>
              <User size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhum cliente encontrado</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Nome</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Telefone</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Endereço</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-indigo-600 font-semibold text-sm">
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{customer.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone size={14} className="text-slate-400" />
                        {customer.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {customer.address ? (
                        <div className="flex items-center gap-2 text-slate-600 text-sm">
                          <MapPin size={14} className="text-slate-400" />
                          <span className="line-clamp-1">{customer.address}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(customer.created_at).toLocaleDateString('pt-BR')}
                      </div>
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
