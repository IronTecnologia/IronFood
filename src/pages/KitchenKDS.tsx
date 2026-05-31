import { useEffect, useState, useCallback } from 'react'
import { ChefHat, Clock, CheckCheck, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Badge, Card, EmptyState } from '../components/ui'
import { cn } from '../utils/cn'
import { timeElapsed, ORDER_TYPE_LABEL } from '../utils/format'
import type { Order, OrderItem, ItemStatus } from '../types'

interface KDSOrder extends Order {
  kitchenItems: OrderItem[]
}

const ITEM_STATUS_NEXT: Partial<Record<ItemStatus, ItemStatus>> = {
  pending: 'preparing',
  preparing: 'ready',
}

export default function KitchenKDS() {
  const tenant = useAuthStore(s => s.tenant)
  const [orders, setOrders] = useState<KDSOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [, setTick] = useState(0)

  // tick every 30s to update elapsed time
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
        kitchenItems: (o.items ?? []).filter(
          (i: OrderItem) => i.station === 'kitchen' && i.status !== 'cancelled' && i.status !== 'delivered'
        ),
      }))
      .filter(o => o.kitchenItems.length > 0) as KDSOrder[]

    setOrders(kdsOrders)
    setLoading(false)
  }, [tenant])

  useEffect(() => {
    if (!tenant) return
    loadOrders()
    const ch = supabase.channel('kds-kitchen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `station=eq.kitchen` }, loadOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenant.id}` }, loadOrders)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [tenant, loadOrders])

  async function advanceItem(itemId: string, current: ItemStatus) {
    const next = ITEM_STATUS_NEXT[current]
    if (!next) return
    await supabase.from('order_items').update({ status: next }).eq('id', itemId)
    loadOrders()
  }

  async function advanceAllItems(orderId: string) {
    await supabase.from('order_items')
      .update({ status: 'ready' })
      .eq('order_id', orderId)
      .eq('station', 'kitchen')
      .in('status', ['pending', 'preparing'])
    loadOrders()
  }

  const pending = orders.filter(o => o.kitchenItems.every(i => i.status === 'pending'))
  const preparing = orders.filter(o => o.kitchenItems.some(i => i.status === 'preparing') || (o.kitchenItems.some(i => i.status === 'pending') && o.kitchenItems.some(i => i.status !== 'pending')))
  const ready = orders.filter(o => o.kitchenItems.every(i => i.status === 'ready'))

  if (loading) return (
    <div className="flex justify-center pt-20">
      <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="min-h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2 flex-1">
          <ChefHat size={20} className="text-amber-400" />
          <span className="text-white font-bold text-lg">KDS — Cozinha</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-amber-400 font-semibold">{pending.length + preparing.length} pedidos ativos</span>
          <span className="text-slate-400 text-xs">{new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}</span>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80">
          <ChefHat size={48} className="text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">Nenhum pedido para a cozinha</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-0 h-full divide-x divide-slate-700">
          {/* Pending */}
          <KDSColumn title="Aguardando" count={pending.length} color="text-amber-400" bg="bg-amber-400/10">
            {pending.map(order => (
              <KDSCard key={order.id} order={order} onAdvance={advanceItem} onAdvanceAll={() => advanceAllItems(order.id)} />
            ))}
          </KDSColumn>

          {/* Preparing */}
          <KDSColumn title="Preparando" count={preparing.length} color="text-blue-400" bg="bg-blue-400/10">
            {preparing.map(order => (
              <KDSCard key={order.id} order={order} onAdvance={advanceItem} onAdvanceAll={() => advanceAllItems(order.id)} />
            ))}
          </KDSColumn>

          {/* Ready */}
          <KDSColumn title="Prontos" count={ready.length} color="text-emerald-400" bg="bg-emerald-400/10">
            {ready.map(order => (
              <KDSCard key={order.id} order={order} onAdvance={advanceItem} onAdvanceAll={() => advanceAllItems(order.id)} done />
            ))}
          </KDSColumn>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────
function KDSColumn({ title, count, color, bg, children }: {
  title: string; count: number; color: string; bg: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-0">
      <div className={cn('flex items-center justify-between px-4 py-2.5', bg)}>
        <span className={cn('font-bold text-sm', color)}>{title}</span>
        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full bg-slate-700', color)}>{count}</span>
      </div>
      <div className="flex-1 p-3 space-y-3 overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 140px)' }}>
        {children}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────
function KDSCard({ order, onAdvance, onAdvanceAll, done }: {
  order: KDSOrder
  onAdvance: (id: string, status: ItemStatus) => void
  onAdvanceAll: () => void
  done?: boolean
}) {
  const elapsed = timeElapsed(order.created_at)
  const isOld = Date.now() - new Date(order.created_at).getTime() > 15 * 60000

  return (
    <div className={cn(
      'bg-slate-800 rounded-xl border overflow-hidden kds-card-new',
      done ? 'border-emerald-700/50' : isOld ? 'border-rose-600/60' : 'border-slate-700'
    )}>
      {/* Card header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-750 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm">#{order.order_number}</span>
          <span className="text-xs text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded">
            {ORDER_TYPE_LABEL[order.order_type]}
            {order.table && ` — Mesa ${(order.table as { number: string }).number}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isOld && <AlertCircle size={14} className="text-rose-400" />}
          <span className={cn('text-xs flex items-center gap-1', isOld ? 'text-rose-400 font-bold' : 'text-slate-400')}>
            <Clock size={11} /> {elapsed}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="p-3 space-y-2">
        {order.kitchenItems.map(item => (
          <div key={item.id}
            className={cn(
              'flex items-start justify-between gap-2 p-2 rounded-lg cursor-pointer transition-all',
              item.status === 'ready'    ? 'bg-emerald-900/30 line-through opacity-60' :
              item.status === 'preparing' ? 'bg-blue-900/30' : 'bg-slate-700/50 hover:bg-slate-700'
            )}
            onClick={() => !done && onAdvance(item.id, item.status)}
          >
            <div>
              <span className="text-white text-sm font-medium">
                <span className="text-amber-400 font-bold mr-1">{item.quantity}x</span>
                {item.product_name}
              </span>
              {item.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{item.notes}</p>}
            </div>
            <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0',
              item.status === 'ready' ? 'bg-emerald-700 text-emerald-200' :
              item.status === 'preparing' ? 'bg-blue-700 text-blue-200' : 'bg-slate-600 text-slate-300')}>
              {item.status === 'ready' ? '✓ Pronto' : item.status === 'preparing' ? 'Fazendo' : 'Aguardando'}
            </span>
          </div>
        ))}
      </div>

      {/* Mark all ready */}
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
