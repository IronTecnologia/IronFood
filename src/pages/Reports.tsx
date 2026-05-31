import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, ShoppingBag, Receipt } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Card, Spinner } from '../components/ui'
import { formatCurrency, PAYMENT_LABEL } from '../utils/format'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function Reports() {
  const tenant = useAuthStore(s => s.tenant)
  const [period, setPeriod] = useState<'7d' | '30d' | 'today'>('7d')
  const [loading, setLoading] = useState(true)
  const [daily, setDaily] = useState<{ day: string; value: number }[]>([])
  const [byCategory, setByCategory] = useState<{ name: string; value: number }[]>([])
  const [byPayment, setByPayment] = useState<{ name: string; value: number }[]>([])
  const [metrics, setMetrics] = useState({ revenue: 0, orders: 0, avgTicket: 0, topProduct: '' })

  useEffect(() => {
    if (!tenant) return
    loadReports()
  }, [tenant, period])

  async function loadReports() {
    if (!tenant) return
    setLoading(true)
    const now = new Date()
    const days = period === 'today' ? 0 : period === '7d' ? 6 : 29
    const start = period === 'today' ? startOfDay(now) : startOfDay(subDays(now, days))

    const { data: orders } = await supabase
      .from('orders')
      .select('id, total, payment_method, created_at, items:order_items(product_name, total_price, quantity)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'paid')
      .gte('created_at', start.toISOString())
      .lte('created_at', endOfDay(now).toISOString())

    const allOrders = orders ?? []
    const revenue = allOrders.reduce((s, o) => s + Number(o.total), 0)
    const orderCount = allOrders.length

    // Daily chart
    const dailyMap: Record<string, number> = {}
    for (let i = days; i >= 0; i--) {
      dailyMap[format(subDays(now, i), 'dd/MM')] = 0
    }
    for (const o of allOrders) {
      const day = format(new Date(o.created_at), 'dd/MM')
      if (dailyMap[day] !== undefined) dailyMap[day] += Number(o.total)
    }
    setDaily(Object.entries(dailyMap).map(([day, value]) => ({ day, value: Number(value.toFixed(2)) })))

    // By payment method
    const payMap: Record<string, number> = {}
    for (const o of allOrders) {
      const pm = o.payment_method ?? 'other'
      payMap[pm] = (payMap[pm] ?? 0) + Number(o.total)
    }
    setByPayment(Object.entries(payMap).map(([k, v]) => ({ name: PAYMENT_LABEL[k] ?? k, value: Number(v.toFixed(2)) })))

    // By product/category
    const prodMap: Record<string, number> = {}
    let topProd = ''
    let topVal = 0
    for (const o of allOrders) {
      for (const item of (o.items ?? []) as { product_name: string; total_price: number; quantity: number }[]) {
        prodMap[item.product_name] = (prodMap[item.product_name] ?? 0) + Number(item.total_price)
        if (prodMap[item.product_name] > topVal) { topVal = prodMap[item.product_name]; topProd = item.product_name }
      }
    }
    const sortedProds = Object.entries(prodMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
    setByCategory(sortedProds)
    setMetrics({ revenue, orders: orderCount, avgTicket: orderCount > 0 ? revenue / orderCount : 0, topProduct: topProd })
    setLoading(false)
  }

  if (loading) return <div className="flex justify-center pt-20"><Spinner size={32} /></div>

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        {[
          { value: 'today', label: 'Hoje' },
          { value: '7d', label: '7 dias' },
          { value: '30d', label: '30 dias' },
        ].map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value as typeof period)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === p.value ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Receita', value: formatCurrency(metrics.revenue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pedidos Pagos', value: String(metrics.orders), icon: ShoppingBag, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Ticket Médio', value: formatCurrency(metrics.avgTicket), icon: Receipt, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Produto Top', value: metrics.topProduct || '—', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className="text-lg font-bold text-slate-800 truncate max-w-[140px]" title={value}>{value}</p>
              </div>
              <div className={`${bg} p-2.5 rounded-xl`}>
                <Icon size={18} className={color} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-semibold text-slate-700 mb-4 text-sm">Faturamento por Dia</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: number) => `R$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Receita" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-slate-700 mb-4 text-sm">Pagamentos por Método</h3>
          {byPayment.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={byPayment} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {byPayment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-slate-700 mb-4 text-sm">Top Produtos por Receita</h3>
        {byCategory.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-8">Sem dados de vendas no período</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: number) => `R$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={120} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} name="Receita" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}
