import { useEffect, useState, useCallback } from 'react'
import { GlassWater, Clock, CheckCheck, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { cn } from '../utils/cn'
import { timeElapsed, ORDER_TYPE_LABEL } from '../utils/format'
import type { Order, OrderItem, ItemStatus } from '../types'

interface KDSOrder extends Order { barItems: OrderItem[] }

export default function BarKDS() {
  const tenant = useAuthStore(s => s.tenant)
  const [orders, setOrders] = useState<KDSOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30000)
    return () => clearInterval(t)
  }, [])

  const loadOrders = useCallback(async () => {
    if (!tenant) return
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*), table:restaurant_tables(number)')
      .eq('tenant_id', tenant.id)
      .in('status', ['confirmed', 'preparing', 'ready'])
      .order('created_at', { ascending: true })

    const kdsOrders: KDSOrder[] = (data ?? [])
      .map(o => ({
        ...o,
        barItems: (o.items ?? []).filter(
          (i: OrderItem) => i.station === 'bar' && i.status !== 'cancelled' && i.status !== 'delivered'
        ),
      }))
      .filter(o => o.barItems.length > 0) as KDSOrder[]

    setOrders(kdsOrders)
    setLoading(false)
  }, [tenant])

  useEffect(() => {
    if (!tenant) return
    loadOrders()
    const ch = supabase.channel('kds-bar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `station=eq.bar` }, loadOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenant.id}` }, loadOrders)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [tenant, loadOrders])

  async function advanceItem(itemId: string, current: ItemStatus) {
    const next: Partial<Record<ItemStatus, ItemStatus>> = { pending: 'preparing', preparing: 'ready' }
    const nextStatus = next[current]
    if (!nextStatus) return
    await supabase.from('order_items').update({ status: nextStatus }).eq('id', itemId)
    loadOrders()
  }

  async function advanceAll(orderId: string) {
    await supabase.from('order_items').update({ status: 'ready' })
      .eq('order_id', orderId).eq('station', 'bar').in('status', ['pending', 'preparing'])
    loadOrders()
  }

  const pending = orders.filter(o => o.barItems.every(i => i.status === 'pending'))
  const preparing = orders.filter(o => o.barItems.some(i => i.status === 'preparing') || (o.barItems.some(i => i.status === 'pending') && o.barItems.some(i => i.status !== 'pending')))
  const ready = orders.filter(o => o.barItems.every(i => i.status === 'ready'))

  if (loading) return (
    <div className="flex justify-center pt-20">
      <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="min-h-full bg-slate-900">
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700">
        <GlassWater size={20} className="text-blue-400" />
        <span className="text-white font-bold text-lg flex-1">KDS — Bar</span>
        <span className="text-blue-400 font-semibold text-sm">{pending.length + preparing.length} pedidos ativos</span>
        <span className="text-slate-400 text-xs">{new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}</span>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80">
          <GlassWater size={48} className="text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">Nenhum pedido para o bar</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-0 divide-x divide-slate-700">
          <KDSColumn title="Aguardando" count={pending.length} color="text-amber-400" bg="bg-amber-400/10">
            {pending.map(o => <BarCard key={o.id} order={o} onAdvance={advanceItem} onAdvanceAll={() => advanceAll(o.id)} />)}
          </KDSColumn>
          <KDSColumn title="Preparando" count={preparing.length} color="text-blue-400" bg="bg-blue-400/10">
            {preparing.map(o => <BarCard key={o.id} order={o} onAdvance={advanceItem} onAdvanceAll={() => advanceAll(o.id)} />)}
          </KDSColumn>
          <KDSColumn title="Prontos" count={ready.length} color="text-emerald-400" bg="bg-emerald-400/10">
            {ready.map(o => <BarCard key={o.id} order={o} onAdvance={advanceItem} onAdvanceAll={() => advanceAll(o.id)} done />)}
          </KDSColumn>
        </div>
      )}
    </div>
  )
}

function KDSColumn({ title, count, color, bg, children }: {
  title: string; count: number; color: string; bg: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col">
      <div className={cn('flex items-center justify-between px-4 py-2.5', bg)}>
        <span className={cn('font-bold text-sm', color)}>{title}</span>
        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full bg-slate-700', color)}>{count}</span>
      </div>
      <div className="p-3 space-y-3 overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 140px)' }}>
        {children}
      </div>
    </div>
  )
}

function BarCard({ order, onAdvance, onAdvanceAll, done }: {
  order: KDSOrder; onAdvance: (id: string, status: ItemStatus) => void; onAdvanceAll: () => void; done?: boolean
}) {
  const isOld = Date.now() - new Date(order.created_at).getTime() > 10 * 60000
  return (
    <div className={cn('bg-slate-800 rounded-xl border overflow-hidden kds-card-new',
      done ? 'border-emerald-700/50' : isOld ? 'border-rose-600/60' : 'border-slate-700')}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm">#{order.order_number}</span>
          <span className="text-xs text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded">
            {ORDER_TYPE_LABEL[order.order_type]}
            {order.table && ` — Mesa ${(order.table as { number: string }).number}`}
          </span>
        </div>
        <span className={cn('text-xs flex items-center gap-1', isOld ? 'text-rose-400 font-bold' : 'text-slate-400')}>
          {isOld && <AlertCircle size={11} />}
          <Clock size={11} /> {timeElapsed(order.created_at)}
        </span>
      </div>
      <div className="p-3 space-y-2">
        {order.barItems.map(item => (
          <div key={item.id}
            onClick={() => !done && onAdvance(item.id, item.status)}
            className={cn('flex items-start justify-between gap-2 p-2 rounded-lg cursor-pointer transition-all',
              item.status === 'ready' ? 'bg-emerald-900/30 line-through opacity-60' :
              item.status === 'preparing' ? 'bg-blue-900/30' : 'bg-slate-700/50 hover:bg-slate-700')}>
            <span className="text-white text-sm">
              <span className="text-blue-300 font-bold mr-1">{item.quantity}x</span>
              {item.product_name}
            </span>
            <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0',
              item.status === 'ready' ? 'bg-emerald-700 text-emerald-200' :
              item.status === 'preparing' ? 'bg-blue-700 text-blue-200' : 'bg-slate-600 text-slate-300')}>
              {item.status === 'ready' ? '✓' : item.status === 'preparing' ? 'Fazendo' : 'Ag.'}
            </span>
          </div>
        ))}
      </div>
      {!done && (
        <div className="px-3 pb-3">
          <button onClick={onAdvanceAll}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors">
            <CheckCheck size={13} /> Tudo Pronto
          </button>
        </div>
      )}
    </div>
  )
}
