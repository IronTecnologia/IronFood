import { useEffect, useState, useCallback } from 'react'
import { Plus, Phone, MapPin, Clock, ChevronDown, ChevronUp, Bike, Receipt, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Badge, Button, Modal, Input, Select, Textarea, Spinner, EmptyState } from '../components/ui'
import { cn } from '../utils/cn'
import { formatCurrency, formatTime, ORDER_STATUS_LABEL } from '../utils/format'
import { usePrinter } from '../hooks/usePrinter'
import type { Order, OrderStatus, Motoboy, DeliveryArea, OrderType, Product, Category, RestaurantTable } from '../types'
import type { AddonSelection } from '../types'

const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-amber-100 border-amber-300',
  confirmed: 'bg-blue-100 border-blue-300',
  preparing: 'bg-purple-100 border-purple-300',
  ready:     'bg-emerald-100 border-emerald-300',
  delivered: 'bg-slate-100 border-slate-300',
  paid:      'bg-slate-100 border-slate-200',
  cancelled: 'bg-red-100 border-red-300',
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'warning', confirmed: 'info', preparing: 'purple',
  ready: 'success', delivered: 'success', paid: 'success', cancelled: 'danger',
}

const STATUS_FLOW: Partial<Record<OrderStatus, OrderStatus>> = {
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
}

export default function DeliveryOrders() {
  const tenant = useAuthStore(s => s.tenant)
  const profile = useAuthStore(s => s.profile)
  const [orders, setOrders] = useState<Order[]>([])
  const [motoboys, setMotoboys] = useState<Motoboy[]>([])
  const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all' | 'delivery' | 'takeout'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showNewOrder, setShowNewOrder] = useState(false)

  const loadOrders = useCallback(async () => {
    if (!tenant) return
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, items:order_items(*), motoboy:motoboys(id,name,whatsapp), delivery_area:delivery_areas(id,name,fee)')
        .eq('tenant_id', tenant.id)
        .in('order_type', ['delivery', 'takeout'])
        .order('created_at', { ascending: false })
        .limit(100)
      setOrders((data ?? []) as Order[])
    } finally {
      setLoading(false)
    }
  }, [tenant])

  useEffect(() => {
    if (!tenant) return
    const loadAll = async () => {
      const [{ data: mb }, { data: da }] = await Promise.all([
        supabase.from('motoboys').select('*').eq('tenant_id', tenant.id).eq('active', true).order('name'),
        supabase.from('delivery_areas').select('*').eq('tenant_id', tenant.id).eq('active', true).order('sort_order'),
      ])
      setMotoboys((mb ?? []) as Motoboy[])
      setDeliveryAreas((da ?? []) as DeliveryArea[])
    }
    loadAll()
    loadOrders()
    const ch = supabase.channel('delivery-orders-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenant.id}` }, loadOrders)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [tenant, loadOrders])

  async function advanceStatus(order: Order) {
    const next = STATUS_FLOW[order.status]
    if (!next) return
    const update: Record<string, unknown> = { status: next }
    if (next === 'delivered') update.paid_at = new Date().toISOString()
    await supabase.from('orders').update(update).eq('id', order.id)
    loadOrders()
  }

  async function cancelOrder(id: string) {
    if (!confirm('Cancelar este pedido?')) return
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', id)
    loadOrders()
  }

  async function assignMotoboy(orderId: string, motoboyId: string) {
    await supabase.from('orders').update({ motoboy_id: motoboyId || null }).eq('id', orderId)
    loadOrders()
  }

  const filtered = orders
    .filter(o => typeFilter === 'all' || o.order_type === typeFilter)
    .filter(o => {
      if (statusFilter === 'active') return !['paid', 'cancelled', 'delivered'].includes(o.status)
      if (statusFilter === 'done')   return ['paid', 'delivered'].includes(o.status)
      return true
    })

  if (loading) return <div className="flex justify-center pt-20"><Spinner size={32} /></div>

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-2 flex-wrap">
          {[
            { v: 'active', l: 'Ativos' },
            { v: 'all', l: 'Todos' },
            { v: 'done', l: 'Concluídos' },
          ].map(f => (
            <button key={f.v} onClick={() => setStatusFilter(f.v)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                statusFilter === f.v ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
              {f.l}
            </button>
          ))}
          <div className="w-px bg-slate-200 mx-1" />
          {[
            { v: 'all', l: 'Todos' },
            { v: 'delivery', l: '🛵 Delivery' },
            { v: 'takeout', l: '🥡 Retirada' },
          ].map(f => (
            <button key={f.v} onClick={() => setTypeFilter(f.v as typeof typeFilter)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                typeFilter === f.v ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
              {f.l}
            </button>
          ))}
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowNewOrder(true)}>
          Novo Pedido
        </Button>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <EmptyState icon={<Bike size={40} />} title="Nenhum pedido encontrado" description="Pedidos de delivery e retirada aparecerão aqui" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(order => {
            const expanded = expandedId === order.id
            const nextStatus = STATUS_FLOW[order.status]
            const mb = order.motoboy as Motoboy | null
            const da = order.delivery_area as DeliveryArea | null

            return (
              <div key={order.id}
                className={cn('bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all', STATUS_COLOR[order.status] ?? 'border-slate-200')}>
                {/* Header */}
                <div className="flex items-start justify-between p-4 pb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-800">#{order.order_number}</span>
                      <Badge variant={STATUS_BADGE[order.status] as 'warning' | 'info' | 'purple' | 'success' | 'danger' | 'default'} className="text-xs">
                        {ORDER_STATUS_LABEL[order.status] ?? order.status}
                      </Badge>
                      <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                        {order.order_type === 'delivery' ? '🛵 Delivery' : '🥡 Retirada'}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-700">{order.customer_name ?? 'Cliente'}</p>
                    {order.customer_phone && (
                      <a href={`tel:${order.customer_phone}`}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-0.5">
                        <Phone size={11} /> {order.customer_phone}
                      </a>
                    )}
                    {order.order_type === 'delivery' && order.delivery_address && (
                      <p className="flex items-start gap-1 text-xs text-slate-500 mt-0.5">
                        <MapPin size={11} className="flex-shrink-0 mt-0.5" />
                        {da ? `${da.name} — ` : ''}{order.delivery_address}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-bold text-indigo-600">{formatCurrency(order.total)}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 justify-end mt-0.5">
                      <Clock size={10} /> {formatTime(order.created_at)}
                    </p>
                  </div>
                </div>

                {/* Motoboy (delivery only) */}
                {order.order_type === 'delivery' && !['cancelled', 'paid'].includes(order.status) && (
                  <div className="px-4 pb-3">
                    <select
                      value={mb?.id ?? ''}
                      onChange={e => assignMotoboy(order.id, e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                      <option value="">🛵 Atribuir motoboy...</option>
                      {motoboys.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    {mb && (
                      <p className="text-xs text-emerald-600 mt-1 font-medium">✓ {mb.name}</p>
                    )}
                  </div>
                )}

                {/* Items toggle */}
                <button onClick={() => setExpandedId(expanded ? null : order.id)}
                  className="w-full flex items-center justify-between px-4 py-2 bg-slate-50 text-xs text-slate-600 hover:bg-slate-100 transition-colors">
                  <span>{order.items?.length ?? 0} {(order.items?.length ?? 0) === 1 ? 'item' : 'itens'}</span>
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {expanded && (
                  <div className="px-4 py-3 space-y-1 border-t border-slate-100">
                    {(order.items ?? []).filter(i => i.status !== 'cancelled').map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-slate-700">{item.quantity}x {item.product_name}
                          {(item.addons as AddonSelection[] | undefined)?.length
                            ? <span className="text-xs text-slate-400 ml-1">({(item.addons as AddonSelection[]).map(a => a.name).join(', ')})</span>
                            : null}
                        </span>
                        <span className="font-medium text-slate-600">{formatCurrency(item.total_price)}</span>
                      </div>
                    ))}
                    {order.notes && (
                      <p className="text-xs text-amber-600 mt-1 italic">Obs: {order.notes}</p>
                    )}
                    {da && (
                      <p className="text-xs text-slate-500 mt-1">Taxa entrega: {formatCurrency(da.fee)}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                {!['paid', 'cancelled'].includes(order.status) && (
                  <div className="px-4 pb-4 pt-2 grid grid-cols-2 gap-2">
                    {nextStatus && (
                      <Button size="sm" onClick={() => advanceStatus(order)}
                        className={nextStatus === 'delivered' ? 'bg-emerald-600 hover:bg-emerald-500 col-span-2' : ''}>
                        {nextStatus === 'preparing' ? '▶ Preparar' :
                         nextStatus === 'ready'     ? '✓ Pronto' :
                         nextStatus === 'delivered' ? '🛵 Entregue / Retirado' : nextStatus}
                      </Button>
                    )}
                    <Button size="sm" variant="outline"
                      className="border-rose-200 text-rose-500 hover:bg-rose-50"
                      leftIcon={<XCircle size={12} />}
                      onClick={() => cancelOrder(order.id)}>
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <NewDeliveryOrderModal
        open={showNewOrder}
        onClose={() => setShowNewOrder(false)}
        tenantId={tenant?.id ?? ''}
        userId={profile?.id ?? ''}
        motoboys={motoboys}
        deliveryAreas={deliveryAreas}
        onSaved={loadOrders}
      />
    </div>
  )
}

// ──────────────────────────────────────────
interface CartItem { product: Product; quantity: number; addons: AddonSelection[]; notes: string }
function itemTotal(item: CartItem) {
  return (item.product.price + item.addons.reduce((s, a) => s + a.price, 0)) * item.quantity
}

function NewDeliveryOrderModal({ open, onClose, tenantId, userId, motoboys, deliveryAreas, onSaved }: {
  open: boolean; onClose: () => void; tenantId: string; userId: string
  motoboys: Motoboy[]; deliveryAreas: DeliveryArea[]; onSaved: () => void
}) {
  const [orderType, setOrderType] = useState<'delivery' | 'takeout'>('delivery')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryAreaId, setDeliveryAreaId] = useState('')
  const [motoboyId, setMotoboyId] = useState('')
  const [notes, setNotes] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [catFilter, setCatFilter] = useState('all')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const load = async () => {
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase.from('products').select('*, category:categories(*)').eq('tenant_id', tenantId).eq('available', true).order('name'),
        supabase.from('categories').select('*').eq('tenant_id', tenantId).eq('active', true).order('sort_order'),
      ])
      setProducts((prods ?? []) as Product[])
      setCategories((cats ?? []) as Category[])
    }
    load()
    setCart([])
    setCustomerName(''); setCustomerPhone(''); setDeliveryAddress('')
    setDeliveryAreaId(''); setMotoboyId(''); setNotes('')
  }, [open, tenantId])

  function addToCart(product: Product) {
    setCart(prev => {
      const exists = prev.find(c => c.product.id === product.id)
      if (exists) return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { product, quantity: 1, addons: [], notes: '' }]
    })
  }

  function removeFromCart(productId: string) {
    setCart(prev => {
      const item = prev.find(c => c.product.id === productId)
      if (!item) return prev
      if (item.quantity > 1) return prev.map(c => c.product.id === productId ? { ...c, quantity: c.quantity - 1 } : c)
      return prev.filter(c => c.product.id !== productId)
    })
  }

  const { printOrder } = usePrinter()
  const tenant = useAuthStore(s => s.tenant)
  const area = deliveryAreas.find(a => a.id === deliveryAreaId)
  const subtotal = cart.reduce((s, c) => s + itemTotal(c), 0)
  const total = subtotal + (orderType === 'delivery' && area ? area.fee : 0)
  const filteredProducts = products.filter(p => catFilter === 'all' || p.category_id === catFilter)

  async function save() {
    if (cart.length === 0 || !tenant) return
    setSaving(true)
    try {
      const { data: order } = await supabase.from('orders').insert({
        tenant_id: tenantId, user_id: userId,
        order_type: orderType,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        delivery_address: orderType === 'delivery' ? deliveryAddress : null,
        delivery_area_id: orderType === 'delivery' && deliveryAreaId ? deliveryAreaId : null,
        motoboy_id: orderType === 'delivery' && motoboyId ? motoboyId : null,
        notes: notes || null,
        status: 'confirmed',
      }).select('*, delivery_area:delivery_areas(id,name,fee), motoboy:motoboys(id,name)').single()

      if (order) {
        const items = cart.map(c => ({
          order_id: order.id,
          product_id: c.product.id,
          product_name: c.product.name,
          quantity: c.quantity,
          unit_price: c.product.price,
          total_price: itemTotal(c),
          addons: c.addons,
          sent_to_station: true,
          station: c.product.product_type === 'beverage' ? 'bar' : 'kitchen',
        }))
        await supabase.from('order_items').insert(items)

        const fullOrder = { ...order, items: items as any, subtotal, discount: 0, tax: 0, total } as Order
        await printOrder(fullOrder, tenant)
      }
      onSaved(); onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo Pedido Delivery/Retirada" maxWidth="max-w-4xl">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Produtos */}
        <div className="space-y-3">
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none">
            <option value="all">Todas as categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
            {filteredProducts.map(p => {
              const qty = cart.find(c => c.product.id === p.id)?.quantity ?? 0
              return (
                <button key={p.id} onClick={() => addToCart(p)}
                  className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all relative">
                  {qty > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center font-bold">{qty}</span>
                  )}
                  <p className="text-xs font-medium text-slate-700 leading-tight pr-4">{p.name}</p>
                  <p className="text-xs text-indigo-600 font-semibold mt-1">{formatCurrency(p.price)}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Dados do pedido */}
        <div className="space-y-3">
          <div className="flex gap-2">
            {(['delivery', 'takeout'] as const).map(t => (
              <button key={t} onClick={() => setOrderType(t)}
                className={cn('flex-1 py-2 rounded-lg text-xs font-semibold transition-colors',
                  orderType === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                {t === 'delivery' ? '🛵 Delivery' : '🥡 Retirada'}
              </button>
            ))}
          </div>

          <Input label="Nome do cliente" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          <Input label="Telefone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="(11) 99999-9999" />

          {orderType === 'delivery' && (
            <>
              <Input label="Endereço de entrega" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} />
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1.5">Área de entrega</label>
                <select value={deliveryAreaId} onChange={e => setDeliveryAreaId(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">Selecionar bairro...</option>
                  {deliveryAreas.map(a => <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.fee)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 block mb-1.5">Motoboy</label>
                <select value={motoboyId} onChange={e => setMotoboyId(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">Sem motoboy ainda</option>
                  {motoboys.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Carrinho */}
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">Adicione produtos</p>
            ) : cart.map(item => (
              <div key={item.product.id} className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-700 flex-1 truncate">{item.product.name}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => removeFromCart(item.product.id)} className="w-5 h-5 bg-slate-100 rounded text-slate-600 text-xs">−</button>
                  <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                  <button onClick={() => addToCart(item.product)} className="w-5 h-5 bg-slate-100 rounded text-slate-600 text-xs">+</button>
                </div>
                <span className="text-sm font-medium w-16 text-right">{formatCurrency(itemTotal(item))}</span>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <div className="space-y-1 pt-2 border-t text-sm">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {orderType === 'delivery' && area && (
                <div className="flex justify-between text-slate-500"><span>Taxa — {area.name}</span><span>{formatCurrency(area.fee)}</span></div>
              )}
              <div className="flex justify-between font-bold"><span>Total</span><span className="text-indigo-600">{formatCurrency(total)}</span></div>
            </div>
          )}

          <Textarea label="Observações" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observações do pedido…" />

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" loading={saving} disabled={cart.length === 0} onClick={save}>Criar Pedido</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
