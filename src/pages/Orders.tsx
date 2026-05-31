import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, ChevronDown, ShoppingBag, Clock, Trash2, Minus, ChefHat } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Card, Button, Badge, Modal, Input, Select, Textarea, Spinner, EmptyState } from '../components/ui'
import { cn } from '../utils/cn'
import { formatCurrency, formatTime, ORDER_TYPE_LABEL, ORDER_STATUS_LABEL, PAYMENT_LABEL } from '../utils/format'
import type { Order, OrderType, OrderStatus, RestaurantTable, Product, Category } from '../types'

const STATUS_BADGE: Record<OrderStatus, string> = {
  pending: 'warning', confirmed: 'info', preparing: 'purple',
  ready: 'success', delivered: 'success', paid: 'success', cancelled: 'danger',
} as const

type BadgeVariant = 'warning' | 'info' | 'purple' | 'success' | 'danger'

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Preparando', value: 'preparing' },
  { label: 'Prontos', value: 'ready' },
  { label: 'Pagos', value: 'paid' },
  { label: 'Cancelados', value: 'cancelled' },
]

export default function Orders() {
  const tenant = useAuthStore(s => s.tenant)
  const profile = useAuthStore(s => s.profile)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    if (!tenant) return
    const q = supabase.from('orders')
      .select('*, items:order_items(*), table:restaurant_tables(number,section), user:profiles(full_name)')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(100)
    const { data } = await q
    setOrders((data ?? []) as Order[])
    setLoading(false)
  }, [tenant])

  useEffect(() => {
    if (!tenant) return
    loadOrders()
    const ch = supabase.channel('orders-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenant.id}` }, loadOrders)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [tenant, loadOrders])

  async function updateStatus(id: string, status: OrderStatus) {
    const update: Record<string, unknown> = { status }
    if (status === 'paid') update.paid_at = new Date().toISOString()
    await supabase.from('orders').update(update).eq('id', id)
    loadOrders()
  }

  async function sendToKitchen(orderId: string) {
    await supabase.from('order_items')
      .update({ sent_to_station: true })
      .eq('order_id', orderId)
      .eq('sent_to_station', false)
    await supabase.from('orders').update({ status: 'confirmed' }).eq('id', orderId).eq('status', 'pending')
    loadOrders()
  }

  const filtered = orders
    .filter(o => statusFilter === 'all' || o.status === statusFilter)
    .filter(o => typeFilter === 'all' || o.order_type === typeFilter)
    .filter(o => !search || o.order_number?.includes(search) || o.customer_name?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="flex justify-center pt-20"><Spinner size={32} /></div>

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                statusFilter === f.value ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="all">Todos os tipos</option>
            <option value="dine_in">Salão</option>
            <option value="delivery">Delivery</option>
            <option value="takeout">Retirada</option>
          </select>
          {['admin','waiter'].includes(profile?.role ?? '') && (
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowNewOrder(true)}>
              Novo Pedido
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar pedido…"
          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
      </div>

      {/* Orders */}
      {filtered.length === 0 ? (
        <EmptyState icon={<ShoppingBag size={40} />} title="Nenhum pedido encontrado" />
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <Card key={order.id} className="overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 font-mono">#{order.order_number}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700">
                        {ORDER_TYPE_LABEL[order.order_type]}
                        {order.table && ` — Mesa ${order.table.number}`}
                        {order.customer_name && ` — ${order.customer_name}`}
                      </span>
                      <Badge variant={STATUS_BADGE[order.status] as BadgeVariant} className="text-[10px]">
                        {ORDER_STATUS_LABEL[order.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={10} /> {formatTime(order.created_at)}
                      </span>
                      <span className="text-xs text-slate-400">{order.items?.length ?? 0} itens</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-800">{formatCurrency(order.total)}</span>
                  <ChevronDown size={16} className={cn('text-slate-400 transition-transform', expandedId === order.id && 'rotate-180')} />
                </div>
              </div>

              {expandedId === order.id && (
                <div className="border-t border-slate-100 px-4 py-4 space-y-4">
                  {/* Items */}
                  <div className="space-y-1.5">
                    {(order.items ?? []).map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          <span className="font-medium">{item.quantity}x</span> {item.product_name}
                          {item.notes && <span className="text-xs text-slate-400 block ml-4">— {item.notes}</span>}
                        </span>
                        <span className="text-slate-700 font-medium">{formatCurrency(item.total_price)}</span>
                      </div>
                    ))}
                    {order.discount > 0 && (
                      <div className="flex justify-between text-sm border-t pt-1.5">
                        <span className="text-emerald-600">Desconto</span>
                        <span className="text-emerald-600">-{formatCurrency(order.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t pt-1.5">
                      <span>Total</span>
                      <span className="text-indigo-600">{formatCurrency(order.total)}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <p className="text-xs text-slate-500 bg-amber-50 px-3 py-2 rounded-lg">
                      Obs: {order.notes}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {order.status === 'pending' && (
                      <Button size="sm" leftIcon={<ChefHat size={14} />} onClick={() => sendToKitchen(order.id)}>
                        Enviar para Cozinha/Bar
                      </Button>
                    )}
                    {order.status === 'preparing' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'ready')}>
                        Marcar Pronto
                      </Button>
                    )}
                    {order.status === 'ready' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'delivered')}>
                        Marcar Entregue
                      </Button>
                    )}
                    {['pending','confirmed','preparing','ready','delivered'].includes(order.status) && (
                      <Button size="sm" variant="danger" onClick={() => updateStatus(order.id, 'cancelled')}>
                        Cancelar
                      </Button>
                    )}
                    {order.payment_method && (
                      <span className="text-xs text-slate-500 self-center">
                        Pagamento: {PAYMENT_LABEL[order.payment_method]}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <NewOrderModal
        open={showNewOrder}
        onClose={() => setShowNewOrder(false)}
        tenantId={tenant?.id ?? ''}
        userId={profile?.id ?? ''}
        onSaved={loadOrders}
      />
    </div>
  )
}

// ──────────────────────────────────────────
// New Order Modal
// ──────────────────────────────────────────
interface CartItem { product: Product; quantity: number; notes: string }

function NewOrderModal({ open, onClose, tenantId, userId, onSaved }: {
  open: boolean; onClose: () => void; tenantId: string; userId: string; onSaved: () => void
}) {
  const [orderType, setOrderType] = useState<OrderType>('dine_in')
  const [tableId, setTableId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [catFilter, setCatFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const load = async () => {
      const [{ data: prods }, { data: cats }, { data: tbls }] = await Promise.all([
        supabase.from('products').select('*, category:categories(*)').eq('tenant_id', tenantId).eq('available', true).order('name'),
        supabase.from('categories').select('*').eq('tenant_id', tenantId).eq('active', true).order('sort_order'),
        supabase.from('restaurant_tables').select('*').eq('tenant_id', tenantId).eq('active', true).order('number'),
      ])
      setProducts((prods ?? []) as Product[])
      setCategories((cats ?? []) as Category[])
      setTables((tbls ?? []) as RestaurantTable[])
    }
    load()
    setCart([])
  }, [open, tenantId])

  function addToCart(product: Product) {
    setCart(prev => {
      const exists = prev.find(c => c.product.id === product.id)
      if (exists) return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { product, quantity: 1, notes: '' }]
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

  const total = cart.reduce((s, c) => s + c.product.price * c.quantity, 0)

  const filteredProducts = products
    .filter(p => catFilter === 'all' || p.category_id === catFilter)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))

  async function saveOrder() {
    if (cart.length === 0) return
    setSaving(true)
    const { data: order } = await supabase.from('orders').insert({
      tenant_id: tenantId, user_id: userId,
      order_type: orderType,
      table_id: orderType === 'dine_in' ? tableId || null : null,
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      delivery_address: orderType === 'delivery' ? deliveryAddress : null,
      notes: notes || null,
    }).select().single()

    if (order) {
      const items = cart.map(c => ({
        order_id: order.id,
        product_id: c.product.id,
        product_name: c.product.name,
        quantity: c.quantity,
        unit_price: c.product.price,
        total_price: c.product.price * c.quantity,
        notes: c.notes || null,
        station: c.product.product_type === 'beverage' ? 'bar' : 'kitchen',
      }))
      await supabase.from('order_items').insert(items)
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo Pedido" maxWidth="max-w-4xl">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Product selection */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…"
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none">
              <option value="all">Tudo</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
            {filteredProducts.map(p => {
              const qty = cart.find(c => c.product.id === p.id)?.quantity ?? 0
              return (
                <button key={p.id} onClick={() => addToCart(p)}
                  className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all relative">
                  {qty > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {qty}
                    </span>
                  )}
                  <p className="text-xs font-medium text-slate-700 leading-tight pr-4">{p.name}</p>
                  <p className="text-xs text-indigo-600 font-semibold mt-1">{formatCurrency(p.price)}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Order details */}
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['dine_in','delivery','takeout'] as OrderType[]).map(t => (
              <button key={t} onClick={() => setOrderType(t)}
                className={cn('flex-1 py-2 rounded-lg text-xs font-semibold transition-colors',
                  orderType === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                {ORDER_TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          {orderType === 'dine_in' && (
            <Select label="Mesa" value={tableId} onChange={e => setTableId(e.target.value)}
              options={[{ value:'',label:'Sem mesa' }, ...tables.map(t => ({ value:t.id, label:`Mesa ${t.number} (${t.section})` }))]} />
          )}
          {orderType !== 'dine_in' && (
            <>
              <Input label="Nome do cliente" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              <Input label="Telefone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              {orderType === 'delivery' && (
                <Input label="Endereço de entrega" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} />
              )}
            </>
          )}

          {/* Cart */}
          <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin">
            {cart.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">Adicione produtos ao pedido</p>
            ) : (
              cart.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-700 flex-1 truncate">{product.name}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => removeFromCart(product.id)} className="p-0.5 hover:bg-slate-100 rounded">
                      <Minus size={12} className="text-slate-500" />
                    </button>
                    <span className="text-sm font-medium w-5 text-center">{quantity}</span>
                    <button onClick={() => addToCart(product)} className="p-0.5 hover:bg-slate-100 rounded">
                      <Plus size={12} className="text-slate-500" />
                    </button>
                  </div>
                  <span className="text-sm font-medium text-slate-700 w-16 text-right">
                    {formatCurrency(product.price * quantity)}
                  </span>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="flex justify-between font-bold text-sm pt-2 border-t">
              <span>Total</span>
              <span className="text-indigo-600">{formatCurrency(total)}</span>
            </div>
          )}

          <Textarea label="Observações" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observações gerais…" />

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" loading={saving} disabled={cart.length === 0} onClick={saveOrder}>
              Criar Pedido
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
