import { useEffect, useState } from 'react'
import { TrendingUp, ShoppingBag, UtensilsCrossed, Receipt, ArrowUpRight } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Card, Spinner } from '../components/ui'
import { formatCurrency, formatTime, ORDER_TYPE_LABEL } from '../utils/format'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'
import type { Order } from '../types'

interface Metrics {
  todayRevenue: number
  openOrders: number
  occupiedTables: number
  avgTicket: number
  revenueChange: number
}

interface HourlyData { hour: string; value: number }
interface DayData { day: string; value: number }

export default function Dashboard() {
  const tenant = useAuthStore(s => s.tenant)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [hourly, setHourly] = useState<HourlyData[]>([])
  const [weekly, setWeekly] = useState<DayData[]>([])
  const [recent, setRecent] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenant) return
    loadDashboard()
  }, [tenant])

  async function loadDashboard() {
    if (!tenant) return
    setLoading(true)
    const now = new Date()
    const todayStart = startOfDay(now).toISOString()
    const todayEnd = endOfDay(now).toISOString()

    const [ordersToday, openOrders, tables, yesterdayOrders] = await Promise.all([
      supabase.from('orders').select('total,created_at,order_type')
        .eq('tenant_id', tenant.id).eq('status', 'paid')
        .gte('created_at', todayStart).lte('created_at', todayEnd),
      supabase.from('orders').select('id')
        .eq('tenant_id', tenant.id)
        .in('status', ['pending','confirmed','preparing','ready']),
      supabase.from('restaurant_tables').select('status')
        .eq('tenant_id', tenant.id).eq('active', true),
      supabase.from('orders').select('total')
        .eq('tenant_id', tenant.id).eq('status', 'paid')
        .gte('created_at', startOfDay(subDays(now, 1)).toISOString())
        .lte('created_at', endOfDay(subDays(now, 1)).toISOString()),
    ])

    const todayRevenue = (ordersToday.data ?? []).reduce((s, o) => s + Number(o.total), 0)
    const yesterdayRevenue = (yesterdayOrders.data ?? []).reduce((s, o) => s + Number(o.total), 0)
    const revenueChange = yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0
    const occupiedTables = (tables.data ?? []).filter(t => t.status === 'occupied').length
    const totalTables = (tables.data ?? []).length
    const paidCount = (ordersToday.data ?? []).length
    const avgTicket = paidCount > 0 ? todayRevenue / paidCount : 0

    setMetrics({
      todayRevenue,
      openOrders: openOrders.data?.length ?? 0,
      occupiedTables: totalTables > 0 ? occupiedTables : 0,
      avgTicket,
      revenueChange,
    })

    // Hourly chart
    const hrs: Record<number, number> = {}
    for (let h = 8; h <= 23; h++) hrs[h] = 0
    for (const o of ordersToday.data ?? []) {
      const h = new Date(o.created_at).getHours()
      if (hrs[h] !== undefined) hrs[h] += Number(o.total)
    }
    setHourly(Object.entries(hrs).map(([h, v]) => ({ hour: `${h}h`, value: Number(v.toFixed(2)) })))

    // Weekly chart
    const days: DayData[] = []
    for (let i = 6; i >= 0; i--) {
      const d = subDays(now, i)
      const { data } = await supabase.from('orders').select('total')
        .eq('tenant_id', tenant.id).eq('status', 'paid')
        .gte('created_at', startOfDay(d).toISOString())
        .lte('created_at', endOfDay(d).toISOString())
      days.push({ day: format(d, 'dd/MM'), value: (data ?? []).reduce((s, o) => s + Number(o.total), 0) })
    }
    setWeekly(days)

    // Recent orders
    const { data: rec } = await supabase.from('orders').select('*')
      .eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(8)
    setRecent((rec ?? []) as Order[])

    setLoading(false)
  }

  if (loading) {
    return <div className="flex justify-center pt-20"><Spinner size={32} /></div>
  }

  const metricCards = [
    {
      title: 'Receita Hoje',
      value: formatCurrency(metrics?.todayRevenue ?? 0),
      change: metrics?.revenueChange ?? 0,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Pedidos Abertos',
      value: String(metrics?.openOrders ?? 0),
      icon: ShoppingBag,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Mesas Ocupadas',
      value: String(metrics?.occupiedTables ?? 0),
      icon: UtensilsCrossed,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Ticket Médio',
      value: formatCurrency(metrics?.avgTicket ?? 0),
      icon: Receipt,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map(({ title, value, change, icon: Icon, color, bg }) => (
          <Card key={title} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
                {change !== undefined && change !== 0 && (
                  <p className={`text-xs mt-1 flex items-center gap-0.5 ${change >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    <ArrowUpRight size={12} className={change < 0 ? 'rotate-180' : ''} />
                    {Math.abs(change).toFixed(1)}% vs ontem
                  </p>
                )}
              </div>
              <div className={`${bg} p-2.5 rounded-xl`}>
                <Icon size={20} className={color} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-semibold text-slate-700 mb-4 text-sm">Vendas por Hora (Hoje)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} labelStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-slate-700 mb-4 text-sm">Vendas — Últimos 7 dias</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} labelStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700 text-sm">Pedidos Recentes</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {recent.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">Nenhum pedido hoje</p>
          ) : (
            recent.map(order => (
              <div key={order.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-500">#{order.order_number}</span>
                  <span className="text-sm font-medium text-slate-700">
                    {ORDER_TYPE_LABEL[order.order_type]}
                    {order.customer_name ? ` — ${order.customer_name}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{formatTime(order.created_at)}</span>
                  <span className="font-semibold text-slate-800 text-sm">{formatCurrency(order.total)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
