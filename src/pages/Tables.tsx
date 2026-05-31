import { useEffect, useState } from 'react'
import { Plus, Users, Clock, ChefHat, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Card, Button, Badge, Modal, Input, Select, Spinner, EmptyState } from '../components/ui'
import { cn } from '../utils/cn'
import { TABLE_STATUS_LABEL, formatCurrency, formatTime } from '../utils/format'
import type { RestaurantTable, Order, TableStatus } from '../types'

const STATUS_STYLE: Record<TableStatus, { badge: string; card: string; dot: string }> = {
  available: { badge: 'success', card: 'border-emerald-200 bg-emerald-50/30', dot: 'bg-emerald-500' },
  occupied:  { badge: 'danger',  card: 'border-rose-200 bg-rose-50/30',     dot: 'bg-rose-500' },
  reserved:  { badge: 'warning', card: 'border-amber-200 bg-amber-50/30',   dot: 'bg-amber-500' },
  cleaning:  { badge: 'info',    card: 'border-sky-200 bg-sky-50/30',       dot: 'bg-sky-500' },
} as const

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info'

export default function Tables() {
  const tenant = useAuthStore(s => s.tenant)
  const profile = useAuthStore(s => s.profile)
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [orders, setOrders] = useState<Record<string, Order>>({})
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState('Todos')
  const [selected, setSelected] = useState<RestaurantTable | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const isAdmin = profile?.role === 'admin'

  const sections = ['Todos', ...Array.from(new Set(tables.map(t => t.section).filter(Boolean)))]

  useEffect(() => {
    if (!tenant) return
    loadTables()

    const channel = supabase.channel('tables-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables', filter: `tenant_id=eq.${tenant.id}` }, () => loadTables())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenant.id}` }, () => loadTables())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tenant])

  async function loadTables() {
    if (!tenant) return
    const { data: tablesData } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('number')

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('tenant_id', tenant.id)
      .in('status', ['pending','confirmed','preparing','ready'])

    const orderMap: Record<string, Order> = {}
    for (const o of ordersData ?? []) {
      if (o.table_id) orderMap[o.table_id] = o as Order
    }

    setTables((tablesData ?? []) as RestaurantTable[])
    setOrders(orderMap)
    setLoading(false)
  }

  async function changeStatus(tableId: string, status: TableStatus) {
    await supabase.from('restaurant_tables').update({ status }).eq('id', tableId)
    setSelected(null)
    loadTables()
  }

  async function deleteTable(tableId: string) {
    if (!confirm('Desativar esta mesa? Ela não aparecerá mais no mapa.')) return
    await supabase.from('restaurant_tables').update({ active: false }).eq('id', tableId)
    setShowOrderModal(false)
    setSelected(null)
    loadTables()
  }

  const filtered = section === 'Todos' ? tables : tables.filter(t => t.section === section)
  const canManage = ['admin','waiter'].includes(profile?.role ?? '')

  if (loading) return <div className="flex justify-center pt-20"><Spinner size={32} /></div>

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {sections.map(s => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                section === s ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 mr-2">
            {Object.entries(TABLE_STATUS_LABEL).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${STATUS_STYLE[k as TableStatus].dot}`} />
                {v}
              </span>
            ))}
          </div>
          {canManage && (
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowAddModal(true)}>
              Nova Mesa
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={<ChefHat size={40} />} title="Nenhuma mesa cadastrada" description="Adicione mesas pelo botão Nova Mesa" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map(table => {
            const order = orders[table.id]
            const style = STATUS_STYLE[table.status]
            return (
              <button
                key={table.id}
                onClick={() => { setSelected(table); setShowOrderModal(true) }}
                className={cn(
                  'relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-md active:scale-95',
                  style.card
                )}
              >
                <div className={cn('absolute top-3 right-3 w-2.5 h-2.5 rounded-full', style.dot, 'ring-2 ring-white')} />
                <p className="text-2xl font-bold text-slate-700">{table.number}</p>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <Users size={11} /> {table.capacity} lugares
                </p>
                {order && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60">
                    <p className="text-xs font-medium text-slate-600">{formatCurrency(order.total)}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock size={10} /> {formatTime(order.created_at)}
                    </p>
                  </div>
                )}
                <div className="mt-2">
                  <Badge variant={style.badge as BadgeVariant} className="text-[10px]">
                    {TABLE_STATUS_LABEL[table.status]}
                  </Badge>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Table Detail Modal */}
      <Modal open={showOrderModal} onClose={() => setShowOrderModal(false)}
        title={selected ? `Mesa ${selected.number}` : ''}>
        {selected && (
          <TableDetailPanel
            table={selected}
            order={orders[selected.id]}
            canManage={canManage}
            isAdmin={isAdmin}
            onChangeStatus={(status) => changeStatus(selected.id, status)}
            onEdit={() => { setShowOrderModal(false); setShowEditModal(true) }}
            onDelete={() => deleteTable(selected.id)}
            onClose={() => setShowOrderModal(false)}
          />
        )}
      </Modal>

      {/* Edit Table Modal */}
      <EditTableModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        table={selected}
        onSaved={() => { loadTables(); setSelected(null) }}
      />

      {/* Add Table Modal */}
      <AddTableModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        tenantId={tenant?.id ?? ''}
        onSaved={loadTables}
      />
    </div>
  )
}

// ──────────────────────────────────────────
function TableDetailPanel({ table, order, canManage, isAdmin, onChangeStatus, onEdit, onDelete, onClose }: {
  table: RestaurantTable
  order?: Order
  canManage: boolean
  isAdmin: boolean
  onChangeStatus: (s: TableStatus) => void
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const statuses: TableStatus[] = ['available', 'occupied', 'reserved', 'cleaning']

  return (
    <div className="space-y-4">
      {/* Info + ações admin */}
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <p className="text-sm text-slate-500">Seção: <span className="font-medium text-slate-700">{table.section}</span></p>
          <p className="text-sm text-slate-500">{table.capacity} lugares — {table.shape === 'square' ? 'Quadrada' : table.shape === 'round' ? 'Redonda' : 'Retangular'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_STYLE[table.status].badge as BadgeVariant}>
            {TABLE_STATUS_LABEL[table.status]}
          </Badge>
          {isAdmin && (
            <>
              <button onClick={onEdit} title="Editar mesa"
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <Pencil size={15} className="text-slate-500" />
              </button>
              <button onClick={onDelete} title="Desativar mesa"
                className="p-1.5 rounded-lg hover:bg-rose-50 transition-colors">
                <Trash2 size={15} className="text-rose-400" />
              </button>
            </>
          )}
        </div>
      </div>

      {order ? (
        <div className="bg-slate-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Pedido #{order.order_number}</span>
            <span className="font-semibold text-slate-700">{formatCurrency(order.total)}</span>
          </div>
          <div className="space-y-1">
            {(order.items ?? []).map(item => (
              <div key={item.id} className="flex justify-between text-xs text-slate-600">
                <span>{item.quantity}x {item.product_name}</span>
                <span>{formatCurrency(item.total_price)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400 text-center py-2">Mesa sem pedido ativo</p>
      )}

      {canManage && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Alterar status</p>
          <div className="grid grid-cols-2 gap-2">
            {statuses.filter(s => s !== table.status).map(s => (
              <Button key={s} variant="outline" size="sm" onClick={() => { onChangeStatus(s); onClose() }}>
                {TABLE_STATUS_LABEL[s]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────
function EditTableModal({ open, onClose, table, onSaved }: {
  open: boolean; onClose: () => void; table: RestaurantTable | null; onSaved: () => void
}) {
  const [number, setNumber] = useState('')
  const [capacity, setCapacity] = useState('4')
  const [section, setSection] = useState('Salão')
  const [shape, setShape] = useState('square')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (table) {
      setNumber(table.number)
      setCapacity(String(table.capacity))
      setSection(table.section)
      setShape(table.shape)
    }
  }, [table])

  async function save() {
    if (!table || !number) return
    setSaving(true)
    await supabase.from('restaurant_tables').update({
      number,
      capacity: Number(capacity),
      section,
      shape,
    }).eq('id', table.id)
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Editar Mesa ${table?.number ?? ''}`}>
      <div className="space-y-4">
        <Input label="Número / Nome" value={number} onChange={e => setNumber(e.target.value)} placeholder="01" />
        <Input label="Capacidade (pessoas)" type="number" min="1" value={capacity} onChange={e => setCapacity(e.target.value)} />
        <Input label="Seção" value={section} onChange={e => setSection(e.target.value)} placeholder="Salão" />
        <Select label="Formato" value={shape} onChange={e => setShape(e.target.value)}
          options={[
            { value: 'square',    label: 'Quadrada' },
            { value: 'round',     label: 'Redonda' },
            { value: 'rectangle', label: 'Retangular' },
          ]} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={saving} onClick={save}>Salvar Alterações</Button>
        </div>
      </div>
    </Modal>
  )
}

// ──────────────────────────────────────────
function AddTableModal({ open, onClose, tenantId, onSaved }: {
  open: boolean; onClose: () => void; tenantId: string; onSaved: () => void
}) {
  const [number, setNumber] = useState('')
  const [capacity, setCapacity] = useState('4')
  const [section, setSection] = useState('Salão')
  const [shape, setShape] = useState('square')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!number) return
    setSaving(true)
    await supabase.from('restaurant_tables').insert({
      tenant_id: tenantId, number, capacity: Number(capacity), section, shape,
    })
    setSaving(false)
    onSaved()
    onClose()
    setNumber('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Mesa">
      <div className="space-y-4">
        <Input label="Número / Nome" value={number} onChange={e => setNumber(e.target.value)} placeholder="01" />
        <Input label="Capacidade (pessoas)" type="number" value={capacity} onChange={e => setCapacity(e.target.value)} />
        <Input label="Seção" value={section} onChange={e => setSection(e.target.value)} placeholder="Salão" />
        <Select label="Formato" value={shape} onChange={e => setShape(e.target.value)}
          options={[{ value:'square',label:'Quadrada' },{ value:'round',label:'Redonda' },{ value:'rectangle',label:'Retangular' }]} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={saving} onClick={save}>Salvar</Button>
        </div>
      </div>
    </Modal>
  )
}
