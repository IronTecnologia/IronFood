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
    try {
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
    } finally {
      setLoading(false)
    }
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

  const [show, setShow] = useState({ pending: true, preparing: true, ready: true })

  const pending  = orders.filter(o => o.barItems.every(i => i.status === 'pending'))
  const preparing = orders.filter(o => o.barItems.some(i => i.status === 'preparing') || (o.barItems.some(i => i.status === 'pending') && o.barItems.some(i => i.status !== 'pending')))
  const ready    = orders.filter(o => o.barItems.every(i => i.status === 'ready'))

  const gridTemplate = (() => {
    const cols: string[] = []
    if (show.pending)   cols.push('1fr')
    if (show.preparing) cols.push('3fr')
    if (show.ready)     cols.push('1fr')
    return cols.join(' ')
  })()

  const ColToggle = ({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) => (
    <button onClick={onClick}
      className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all', active
        ? `${color} border-current bg-white/10`
        : 'text-slate-500 border-slate-600 hover:border-slate-400')}>
      {label}
    </button>
  )

  if (loading) return (
    <div className="flex justify-center pt-20">
      <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="min-h-full bg-slate-900">
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700 flex-wrap">
        <div className="flex items-center gap-2 flex-1">
          <GlassWater size={20} className="text-blue-400" />
          <span className="text-white font-bold text-lg">KDS — Bar</span>
        </div>
        <div className="flex items-center gap-2">
          <ColToggle label="Aguardando" active={show.pending}   color="text-amber-400"   onClick={() => setShow(s => ({ ...s, pending:   !s.pending }))} />
          <ColToggle label="Preparando" active={show.preparing} color="text-blue-400"    onClick={() => setShow(s => ({ ...s, preparing: !s.preparing }))} />
          <ColToggle label="Prontos"    active={show.ready}     color="text-emerald-400" onClick={() => setShow(s => ({ ...s, ready:     !s.ready }))} />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-blue-400 font-semibold">{pending.length + preparing.length} ativos</span>
          <span className="text-slate-400 text-xs">{new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}</span>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80">
          <GlassWater size={48} className="text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">Nenhum pedido para o bar</p>
        </div>
      ) : (
        <div className="grid gap-0 divide-x divide-slate-700" style={{ gridTemplateColumns: gridTemplate }}>
          {show.pending && (
            <KDSColumn title="Aguardando" count={pending.length} color="text-amber-400" bg="bg-amber-400/10" compact>
              {pending.map(o => <BarCard key={o.id} order={o} onAdvance={advanceItem} onAdvanceAll={() => advanceAll(o.id)} />)}
            </KDSColumn>
          )}
          {show.preparing && (
            <KDSColumn title="Preparando" count={preparing.length} color="text-blue-400" bg="bg-blue-400/10">
              {preparing.map(o => <BarCard key={o.id} order={o} onAdvance={advanceItem} onAdvanceAll={() => advanceAll(o.id)} />)}
            </KDSColumn>
          )}
          {show.ready && (
            <KDSColumn title="Prontos" count={ready.length} color="text-emerald-400" bg="bg-emerald-400/10" compact>
              {ready.map(o => <BarCard key={o.id} order={o} onAdvance={advanceItem} onAdvanceAll={() => advanceAll(o.id)} done />)}
            </KDSColumn>
          )}
        </div>
      )}
    </div>
  )
}

const ITEM_STATUS_NEXT_BAR: Partial<Record<ItemStatus, ItemStatus>> = {
  pending: 'preparing',
  preparing: 'ready',
}

function KDSColumn({ title, count, color, bg, children, compact }: {
  title: string; count: number; color: string; bg: string; children: React.ReactNode; compact?: boolean
}) {
  return (
    <div className="flex flex-col min-h-0">
      <div className={cn('flex items-center justify-between px-4 py-2.5', bg)}>
        <span className={cn('font-bold text-sm', color)}>{title}</span>
        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full bg-slate-700', color)}>{count}</span>
      </div>
      <div className="flex-1 p-3 overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 140px)' }}>
        <div className={compact ? 'space-y-3' : 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3'}>
          {children}
        </div>
      </div>
    </div>
  )
}

function BarCard({ order, onAdvance, onAdvanceAll, done }: {
  order: KDSOrder; onAdvance: (id: string, status: ItemStatus) => void; onAdvanceAll: () => void; done?: boolean
}) {
  const isOld = Date.now() - new Date(order.created_at).getTime() > 10 * 60000
  return (
    <div className={cn('bg-slate-800 rounded-xl border overflow-hidden flex flex-col',
      done ? 'border-emerald-700/50' : isOld ? 'border-rose-600/60' : 'border-slate-700')}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 bg-slate-900/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white font-bold text-sm">#{order.order_number}</span>
          <span className="text-xs text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded truncate">
            {ORDER_TYPE_LABEL[order.order_type]}
            {order.table && ` — Mesa ${(order.table as { number: string }).number}`}
          </span>
        </div>
        <span className={cn('text-xs flex items-center gap-1 flex-shrink-0 ml-2', isOld ? 'text-rose-400 font-bold' : 'text-slate-400')}>
          {isOld && <AlertCircle size={11} />}
          <Clock size={11} /> {timeElapsed(order.created_at)}
        </span>
      </div>
      <div className="p-2 space-y-1.5 flex-1">
        {order.barItems.map(item => (
          <div key={item.id} className={cn(
            'rounded-lg p-2 transition-all',
            item.status === 'ready' ? 'bg-emerald-900/20 opacity-60' :
            item.status === 'preparing' ? 'bg-blue-900/20' : 'bg-slate-700/40'
          )}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm font-medium leading-tight', item.status === 'ready' && 'line-through')}>
                  <span className="text-blue-300 font-bold">{item.quantity}x </span>
                  <span className="text-white">{item.product_name}</span>
                </p>
                {item.addons && item.addons.length > 0 && (
                  <p className="text-xs text-blue-300/80 mt-0.5">{item.addons.map(a => `+ ${a.name}`).join(' · ')}</p>
                )}
              </div>
              {!done && ITEM_STATUS_NEXT_BAR[item.status] && (
                <button
                  onClick={() => onAdvance(item.id, item.status)}
                  className={cn(
                    'flex-shrink-0 text-xs px-2 py-1 rounded-lg font-semibold transition-all active:scale-95',
                    item.status === 'preparing'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  )}>
                  {item.status === 'pending' ? '▶ Fazer' : '✓ Pronto'}
                </button>
              )}
              {(done || item.status === 'ready') && (
                <span className="flex-shrink-0 text-xs px-2 py-1 rounded-lg bg-emerald-700/50 text-emerald-300 font-semibold">✓</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {!done && (
        <div className="px-2 pb-2 pt-1">
          <button onClick={onAdvanceAll}
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors active:scale-[0.98]">
            <CheckCheck size={13} /> Tudo Pronto
          </button>
        </div>
      )}
    </div>
  )
}
