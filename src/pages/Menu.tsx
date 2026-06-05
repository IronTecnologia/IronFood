import { useEffect, useState, useRef } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Search, Utensils, Plus, Minus, Trash2, ChevronRight, CheckCircle, BellRing, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { formatCurrency } from '../utils/format'
import { cn } from '../utils/cn'
import { usePrinter } from '../hooks/usePrinter'
import type { Tenant, Category, Product, RestaurantTable, Addon, AddonSelection, Order, OrderType, Customer } from '../types'

interface CartItem { product: Product; quantity: number; addons: AddonSelection[]; notes?: string }

function itemTotal(item: CartItem) {
  return (item.product.price + item.addons.reduce((s, a) => s + a.price, 0)) * item.quantity
}

function playBeep() {
  try {
    const ctx = new AudioContext()
    const times = [0, 0.25, 0.5]
    times.forEach(delay => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0, ctx.currentTime + delay)
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + delay + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + 0.25)
    })
  } catch {}
}

export default function Menu() {
  const { slug } = useParams<{ slug: string }>()
  const { user, profile } = useAuthStore()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [addons, setAddons] = useState<Addon[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const { printOrder } = usePrinter()

  // Fase: seleção de mesa → menu
  const [phase, setPhase] = useState<'select-table' | 'menu'>('select-table')
  const [preSelectedTable, setPreSelectedTable] = useState<RestaurantTable | null>(null)

  // Chamar garçom
  const [callSent, setCallSent] = useState(false)
  const callTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cart
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')

  // Addon modal
  const [addonProduct, setAddonProduct] = useState<Product | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<AddonSelection[]>([])

  // Checkout
  const [orderType, setOrderType] = useState<OrderType>('dine_in')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [selectedTableId, setSelectedTableId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Customer search
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        // If user is authenticated, use their tenant_id
        // Otherwise, try to load by slug for public access
        let tenantData: any = null

        if (user && profile) {
          // Authenticated user - fetch tenant by id
          const { data } = await supabase.from('tenants').select('*').eq('id', profile.tenant_id).single()
          tenantData = data
        } else if (slug) {
          // Public access via slug - fetch tenant by slug
          const { data } = await supabase.from('tenants').select('*').eq('slug', slug).single()
          tenantData = data
        }

        if (!tenantData) { setNotFound(true); return }

        setTenant(tenantData as Tenant)

        const [{ data: cats }, { data: prods }, { data: adns }, { data: tbls }] = await Promise.all([
          supabase.from('categories').select('*').eq('tenant_id', tenantData.id).eq('active', true).order('sort_order'),
          supabase.from('products').select('*, category:categories(*)').eq('tenant_id', tenantData.id).eq('available', true).order('sort_order').order('name'),
          supabase.from('addons').select('*').eq('tenant_id', tenantData.id).eq('available', true).order('sort_order'),
          supabase.from('restaurant_tables').select('*').eq('tenant_id', tenantData.id).eq('active', true).order('number'),
        ])

        setCategories((cats ?? []) as Category[])
        setProducts((prods ?? []) as Product[])
        setAddons((adns ?? []) as Addon[])
        setTables((tbls ?? []) as RestaurantTable[])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug, user, profile])

  function getAddonsForProduct(product: Product): Addon[] {
    return addons.filter(a => !a.category_id || a.category_id === product.category_id)
  }

  async function searchCustomers(query: string) {
    if (!tenant || !query.trim()) {
      setCustomerSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenant.id)
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(5)

      setCustomerSuggestions((data || []) as Customer[])
      setShowSuggestions(true)
    } catch (err) {
      setCustomerSuggestions([])
    }
  }

  function selectCustomer(customer: Customer) {
    setCustomerName(customer.name)
    setCustomerPhone(customer.phone)
    if (customer.address) setDeliveryAddress(customer.address)
    setShowSuggestions(false)
    setCustomerSuggestions([])
  }

  function handleCustomerNameChange(value: string) {
    setCustomerName(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => searchCustomers(value), 300)
  }

  function handleCustomerPhoneChange(value: string) {
    setCustomerPhone(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => searchCustomers(value), 300)
  }

  function handleProductClick(product: Product) {
    const productAddons = getAddonsForProduct(product)
    if (productAddons.length > 0) {
      setAddonProduct(product)
      setSelectedAddons([])
    } else {
      addToCart(product, [])
    }
  }

  function addToCart(product: Product, addonsSelected: AddonSelection[]) {
    setCart(prev => {
      const key = JSON.stringify(addonsSelected.map(a => a.id).sort())
      const exists = prev.find(c => c.product.id === product.id && JSON.stringify(c.addons.map(a => a.id).sort()) === key)
      if (exists) return prev.map(c =>
        c.product.id === product.id && JSON.stringify(c.addons.map(a => a.id).sort()) === key
          ? { ...c, quantity: c.quantity + 1 } : c
      )
      return [...prev, { product, quantity: 1, addons: addonsSelected }]
    })
  }

  function changeQty(idx: number, delta: number) {
    setCart(prev => {
      const item = prev[idx]
      if (!item) return prev
      const newQty = item.quantity + delta
      if (newQty <= 0) return prev.filter((_, i) => i !== idx)
      return prev.map((c, i) => i === idx ? { ...c, quantity: newQty } : c)
    })
  }

  function toggleAddon(addon: Addon) {
    setSelectedAddons(prev =>
      prev.find(a => a.id === addon.id)
        ? prev.filter(a => a.id !== addon.id)
        : [...prev, { id: addon.id, name: addon.name, price: addon.price }]
    )
  }

  function confirmAddon() {
    if (!addonProduct) return
    addToCart(addonProduct, selectedAddons)
    setAddonProduct(null)
    setSelectedAddons([])
  }

  const cartTotal = cart.reduce((s, c) => s + itemTotal(c), 0)
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0)

  async function callWaiter() {
    if (!tenant || !preSelectedTable || callSent) return
    const ch = supabase.channel(`waiter-calls-${tenant.id}`)
    await ch.subscribe()
    ch.send({
      type: 'broadcast',
      event: 'call',
      payload: { tableNumber: preSelectedTable.number, tableId: preSelectedTable.id, tenantId: tenant.id },
    })
    supabase.removeChannel(ch)
    setCallSent(true)
    if (callTimer.current) clearTimeout(callTimer.current)
    callTimer.current = setTimeout(() => setCallSent(false), 30000)
  }

  function selectTable(table: RestaurantTable) {
    setPreSelectedTable(table)
    setSelectedTableId(table.id)
    setPhase('menu')
  }

  async function submitOrder() {
    if (!tenant || cart.length === 0) return
    if (orderType === 'dine_in' && !preSelectedTable) return
    if ((orderType === 'delivery' || orderType === 'takeout') && !customerName.trim()) return
    if (orderType === 'delivery' && !customerPhone.trim()) return
    if (orderType === 'delivery' && !deliveryAddress.trim()) return

    setSubmitting(true)
    try {
      let customerId: string | null = null

      // For delivery and takeout, save customer
      if (orderType !== 'dine_in' && customerPhone.trim()) {
        const { data: customer } = await supabase.from('customers').insert({
          tenant_id: tenant.id,
          name: customerName.trim(),
          phone: customerPhone.trim(),
          address: orderType === 'delivery' ? deliveryAddress.trim() : undefined,
        }).select('id').single()

        if (customer) customerId = customer.id
      }

      const tableId = orderType === 'dine_in' ? preSelectedTable?.id : null
      const orderPayload: any = {
        tenant_id: tenant.id,
        order_type: orderType,
        customer_id: customerId,
        status: 'confirmed',
      }

      if (orderType === 'dine_in') {
        orderPayload.table_id = tableId
        orderPayload.customer_name = customerName || `Mesa ${preSelectedTable?.number ?? ''}`
      } else {
        orderPayload.customer_name = customerName.trim()
        orderPayload.customer_phone = customerPhone.trim()
        if (orderType === 'delivery') {
          orderPayload.delivery_address = deliveryAddress.trim()
        }
      }

      const { data: order } = await supabase.from('orders').insert(orderPayload).select('*, table:restaurant_tables(*)').single()

      if (order) {
        const items = cart.map(c => ({
          order_id: order.id,
          product_id: c.product.id,
          product_name: c.product.name,
          quantity: c.quantity,
          unit_price: c.product.price + c.addons.reduce((s, a) => s + a.price, 0),
          total_price: itemTotal(c),
          addons: c.addons,
          sent_to_station: true,
          station: c.product.product_type === 'beverage' ? 'bar' : 'kitchen',
        }))
        await supabase.from('order_items').insert(items)

        // Mark table as occupied for dine_in only
        if (orderType === 'dine_in' && tableId) {
          await supabase.from('restaurant_tables').update({ status: 'occupied' }).eq('id', tableId)
        }

        const fullOrder = { ...order, items: items as any, subtotal: 0, discount: 0, tax: 0, total: 0 } as Order
        await printOrder(fullOrder, tenant)

        setOrderNumber(order.order_number)
        setOrderPlaced(true)
        setCart([])
        setShowCheckout(false)
        setShowCart(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = products
    .filter(p => activeCategory === 'all' || p.category_id === activeCategory)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()))

  const groupedByCategory: Record<string, Product[]> = {}
  if (activeCategory === 'all') {
    for (const cat of categories) {
      const prods = filtered.filter(p => p.category_id === cat.id)
      if (prods.length > 0) groupedByCategory[cat.id] = prods
    }
    const uncategorized = filtered.filter(p => !p.category_id)
    if (uncategorized.length > 0) groupedByCategory['__none__'] = uncategorized
  } else {
    groupedByCategory[activeCategory] = filtered
  }

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
        <span className="text-slate-500 text-sm">Carregando cardápio…</span>
      </div>
    </div>
  )

  // ── Not found ──
  if (notFound) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <Utensils size={48} className="text-slate-300 mb-4" />
      <h1 className="text-2xl font-bold text-slate-700">Cardápio não encontrado</h1>
      <p className="text-slate-500 mt-2">Verifique o QR Code ou link e tente novamente.</p>
    </div>
  )

  // ── Selecionar mesa ──
  if (phase === 'select-table') return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white pt-10 pb-16 px-4">
        <div className="max-w-lg mx-auto text-center">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover" />
          ) : (
            <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto mb-3 flex items-center justify-center">
              <Utensils size={28} />
            </div>
          )}
          <h1 className="text-3xl font-bold">{tenant?.name}</h1>
          <p className="text-indigo-200 text-sm mt-1">{tenant?.address}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-8">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-slate-800 text-center mb-1">Qual é a sua mesa?</h2>
          <p className="text-sm text-slate-400 text-center mb-6">Selecione para começar seu pedido</p>

          <div className="grid grid-cols-4 gap-3">
            {tables.map(t => (
              <button key={t.id} onClick={() => selectTable(t)}
                className="py-4 rounded-2xl text-lg font-bold border-2 border-slate-200 text-slate-700 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 transition-all active:scale-95">
                {t.number}
              </button>
            ))}
          </div>

          {tables.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-4">Nenhuma mesa disponível</p>
          )}
        </div>

        <p className="text-center text-slate-400 text-xs mt-6">
          Cardápio digital por <span className="font-semibold text-indigo-400">MesaFlow</span>
        </p>
      </div>
    </div>
  )

  // ── Pedido enviado ──
  if (orderPlaced) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-5">
        <CheckCircle size={44} className="text-emerald-500" />
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Pedido enviado!</h1>
      <p className="text-slate-500 mb-1">Pedido <span className="font-bold text-indigo-600">#{orderNumber}</span></p>
      <p className="text-slate-400 text-sm">Acompanhe pelo número acima.<br />Sua comida está sendo preparada!</p>
      <button
        onClick={() => setOrderPlaced(false)}
        className="mt-8 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold text-sm"
      >
        Ver cardápio novamente
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white pt-10 pb-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover" />
          ) : (
            <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto mb-3 flex items-center justify-center">
              <Utensils size={28} />
            </div>
          )}
          <h1 className="text-3xl font-bold">{tenant?.name}</h1>
          {tenant?.address && <p className="text-indigo-200 text-sm mt-1">{tenant.address}</p>}
          {preSelectedTable && (
            <p className="text-indigo-200 text-sm mt-1 font-medium">Mesa {preSelectedTable.number}</p>
          )}
        </div>
      </div>

      {/* Chamar Garçom */}
      <div className="max-w-2xl mx-auto px-4 -mt-6 mb-2 flex justify-end">
        <button
          onClick={callWaiter}
          disabled={callSent}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold shadow-lg transition-all active:scale-95',
            callSent
              ? 'bg-emerald-100 text-emerald-700 cursor-default'
              : 'bg-white text-indigo-700 hover:bg-indigo-50'
          )}>
          <BellRing size={16} className={callSent ? 'text-emerald-500' : 'text-indigo-500'} />
          {callSent ? 'Garçom chamado!' : 'Chamar Garçom'}
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar no cardápio…"
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white shadow-lg border-0 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm" />
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-thin mb-6">
            <button onClick={() => setActiveCategory('all')}
              className={cn('flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                activeCategory === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 shadow-sm')}>
              Todos
            </button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className={cn('flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                  activeCategory === cat.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 shadow-sm')}>
                <span>{cat.icon}</span>{cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Products */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 font-medium">Nenhum produto encontrado</p>
          </div>
        ) : (
          Object.entries(groupedByCategory).map(([catId, prods]) => {
            const cat = categories.find(c => c.id === catId)
            return (
              <div key={catId} className="mb-8">
                {cat && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{cat.icon}</span>
                    <h2 className="font-bold text-slate-800 text-lg">{cat.name}</h2>
                  </div>
                )}
                <div className="space-y-3">
                  {prods.map(product => {
                    const qty = cart.filter(c => c.product.id === product.id).reduce((s, c) => s + c.quantity, 0)
                    const hasAddons = getAddonsForProduct(product).length > 0
                    return (
                      <button key={product.id} onClick={() => handleProductClick(product)}
                        className="w-full bg-white rounded-2xl shadow-sm overflow-hidden flex text-left active:scale-[0.98] transition-transform">
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-slate-800">{product.name}</h3>
                            {qty > 0 && (
                              <span className="w-6 h-6 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center font-bold flex-shrink-0">
                                {qty}
                              </span>
                            )}
                          </div>
                          {product.description && (
                            <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{product.description}</p>
                          )}
                          {hasAddons && <p className="text-xs text-indigo-400 mt-1">Personalizável</p>}
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-lg font-bold text-indigo-600">{formatCurrency(product.price)}</span>
                            <span className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                              <Plus size={16} className="text-white" />
                            </span>
                          </div>
                        </div>
                        {product.image_url && (
                          <div className="w-28 flex-shrink-0">
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}

        <div className="text-center py-8 text-slate-400 text-xs">
          <p>Cardápio digital por <span className="font-semibold text-indigo-400">MesaFlow</span></p>
        </div>
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-30">
          <button onClick={() => { setShowCart(true); setOrderType('dine_in'); setCustomerName(''); setCustomerPhone(''); setDeliveryAddress(''); setSelectedTableId('') }}
            className="flex items-center gap-3 bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-xl shadow-indigo-300 w-full max-w-sm">
            <span className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center font-bold text-sm">{cartCount}</span>
            <span className="font-semibold flex-1 text-left">Ver carrinho</span>
            <span className="font-bold">{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Addon modal */}
      {addonProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAddonProduct(null)} />
          <div className="relative bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-1">{addonProduct.name}</h2>
            <p className="text-sm text-slate-500 mb-4">Escolha os adicionais desejados:</p>
            <div className="space-y-2 mb-6">
              {getAddonsForProduct(addonProduct).map(addon => {
                const selected = !!selectedAddons.find(a => a.id === addon.id)
                return (
                  <button key={addon.id} onClick={() => toggleAddon(addon)}
                    className={cn('w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 transition-all',
                      selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-slate-50')}>
                    <div className="flex items-center gap-3">
                      <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center',
                        selected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300')}>
                        {selected && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-slate-800">{addon.name}</p>
                        {addon.description && <p className="text-xs text-slate-400">{addon.description}</p>}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-indigo-600">+{formatCurrency(addon.price)}</span>
                  </button>
                )
              })}
            </div>
            <button onClick={confirmAddon}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-base">
              Adicionar {selectedAddons.length > 0 ? `• +${formatCurrency(selectedAddons.reduce((s,a) => s+a.price, 0))}` : ''}
            </button>
          </div>
        </div>
      )}

      {/* Cart drawer */}
      {showCart && !showCheckout && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCart(false)} />
          <div className="relative bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Seu pedido</h2>
            <div className="space-y-3 mb-6">
              {cart.map((item, idx) => (
                <div key={idx} className="bg-slate-50 rounded-2xl p-3 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm">{item.product.name}</p>
                      {item.addons.length > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5">{item.addons.map(a => a.name).join(', ')}</p>
                      )}
                      <p className="text-sm font-bold text-indigo-600 mt-1">{formatCurrency(itemTotal(item))}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => changeQty(idx, -1)}
                        className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center">
                        {item.quantity === 1 ? <Trash2 size={12} className="text-rose-400" /> : <Minus size={12} />}
                      </button>
                      <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => changeQty(idx, 1)}
                        className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center">
                        <Plus size={12} className="text-white" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: sem cebola, bem passado..."
                    value={item.notes || ''}
                    onChange={(e) => {
                      const newCart = [...cart]
                      newCart[idx].notes = e.target.value
                      setCart(newCart)
                    }}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-base mb-6 pt-2 border-t">
              <span>Total</span>
              <span className="text-indigo-600">{formatCurrency(cartTotal)}</span>
            </div>
            <button onClick={() => setShowCheckout(true)}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2">
              Continuar <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Checkout */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCheckout(false)} />
          <div className="relative bg-white rounded-t-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">Finalizar pedido</h2>

            {/* Tipo de pedido */}
            <div className="mb-6">
              <label className="text-sm font-medium text-slate-600 block mb-3">Tipo de pedido *</label>
              <div className="grid grid-cols-3 gap-2">
                {(['dine_in', 'takeout', 'delivery'] as const).map(type => (
                  <button key={type} onClick={() => { setOrderType(type); setSelectedTableId('') }}
                    className={cn('py-3 rounded-xl text-xs font-bold border-2 transition-all',
                      orderType === type
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600')}>
                    {type === 'dine_in' ? 'Mesa' : type === 'takeout' ? 'Retirada' : 'Entrega'}
                  </button>
                ))}
              </div>
            </div>

            {/* Nome */}
            <div className="mb-4 relative">
              <label className="text-sm font-medium text-slate-600 block mb-1.5">
                Seu nome {orderType !== 'dine_in' && '*'}
              </label>
              <input value={customerName} onChange={e => handleCustomerNameChange(e.target.value)}
                onFocus={() => customerName && setShowSuggestions(true)}
                placeholder="Ex: João"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              {showSuggestions && customerSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10">
                  {customerSuggestions.map(customer => (
                    <button key={customer.id} onClick={() => selectCustomer(customer)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 text-sm">
                      <p className="font-medium text-slate-800">{customer.name}</p>
                      <p className="text-xs text-slate-500">{customer.phone}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Telefone (delivery e takeout) */}
            {orderType !== 'dine_in' && (
              <div className="mb-4 relative">
                <label className="text-sm font-medium text-slate-600 block mb-1.5">Telefone *</label>
                <input value={customerPhone} onChange={e => handleCustomerPhoneChange(e.target.value)}
                  onFocus={() => customerPhone && setShowSuggestions(true)}
                  placeholder="(11) 99999-9999"
                  type="tel"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                {showSuggestions && customerSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10">
                    {customerSuggestions.map(customer => (
                      <button key={customer.id} onClick={() => selectCustomer(customer)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 text-sm">
                        <p className="font-medium text-slate-800">{customer.name}</p>
                        <p className="text-xs text-slate-500">{customer.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Endereço (apenas delivery) */}
            {orderType === 'delivery' && (
              <div className="mb-6">
                <label className="text-sm font-medium text-slate-600 block mb-1.5">Endereço de entrega *</label>
                <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                  placeholder="Rua, número, bairro"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            )}


            {/* Resumo */}
            <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-1">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-slate-600">{item.quantity}x {item.product.name}</span>
                  <span className="font-medium">{formatCurrency(itemTotal(item))}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2 border-t mt-2">
                <span>Total</span>
                <span className="text-indigo-600">{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            <button onClick={submitOrder} disabled={!selectedTableId || submitting}
              className="w-full bg-indigo-600 disabled:opacity-50 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2">
              {submitting
                ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : 'Enviar pedido'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
