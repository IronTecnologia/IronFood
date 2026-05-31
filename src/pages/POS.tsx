import { useEffect, useState, useCallback } from 'react'
import { DollarSign, Lock, Unlock, TrendingDown, TrendingUp, CreditCard, Smartphone, Banknote, Receipt, ArrowDownLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Card, Button, Input, Textarea, Badge, Modal, Spinner } from '../components/ui'
import { formatCurrency, formatDateTime, PAYMENT_LABEL } from '../utils/format'
import type { CashRegister, CashTransaction, Order, PaymentMethod } from '../types'

export default function POS() {
  const tenant = useAuthStore(s => s.tenant)
  const profile = useAuthStore(s => s.profile)
  const [register, setRegister] = useState<CashRegister | null>(null)
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [unpaidOrders, setUnpaidOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [showSangriaModal, setShowSangriaModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const load = useCallback(async () => {
    if (!tenant) return
    const [{ data: reg }, { data: orders }] = await Promise.all([
      supabase.from('cash_registers').select('*, opener:profiles!cash_registers_opened_by_fkey(full_name)')
        .eq('tenant_id', tenant.id).eq('status', 'open').single(),
      supabase.from('orders').select('*, items:order_items(*), table:restaurant_tables(number)')
        .eq('tenant_id', tenant.id).in('status', ['delivered', 'ready'])
        .order('created_at', { ascending: true }),
    ])
    setRegister(reg as CashRegister | null)
    setUnpaidOrders((orders ?? []) as Order[])

    if (reg) {
      const { data: txns } = await supabase.from('cash_transactions')
        .select('*').eq('register_id', reg.id).order('created_at', { ascending: false })
      setTransactions((txns ?? []) as CashTransaction[])
    }
    setLoading(false)
  }, [tenant])

  useEffect(() => {
    load()
  }, [load])

  const totalSales = transactions.filter(t => t.transaction_type === 'sale').reduce((s, t) => s + Number(t.amount), 0)
  const totalSangrias = transactions.filter(t => t.transaction_type === 'sangria').reduce((s, t) => s + Number(t.amount), 0)
  const totalSuprimentos = transactions.filter(t => t.transaction_type === 'suprimento').reduce((s, t) => s + Number(t.amount), 0)
  const expectedBalance = (register?.opening_balance ?? 0) + totalSales + totalSuprimentos - totalSangrias

  if (loading) return <div className="flex justify-center pt-20"><Spinner size={32} /></div>

  return (
    <div className="space-y-6">
      {/* Register Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${register ? 'bg-emerald-50' : 'bg-slate-100'}`}>
              {register ? <Unlock size={24} className="text-emerald-600" /> : <Lock size={24} className="text-slate-500" />}
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg">
                {register ? 'Caixa Aberto' : 'Caixa Fechado'}
              </h2>
              {register ? (
                <p className="text-sm text-slate-500">
                  Aberto em {formatDateTime(register.opened_at)}
                  {register.opener && ` por ${(register.opener as { full_name: string }).full_name}`}
                </p>
              ) : (
                <p className="text-sm text-slate-500">Abra o caixa para iniciar as operações</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!register ? (
              <Button leftIcon={<Unlock size={16} />} onClick={() => setShowOpenModal(true)}>
                Abrir Caixa
              </Button>
            ) : (
              <>
                <Button variant="outline" leftIcon={<ArrowDownLeft size={16} />} onClick={() => setShowSangriaModal(true)}>
                  Sangria
                </Button>
                <Button variant="danger" leftIcon={<Lock size={16} />} onClick={() => setShowCloseModal(true)}>
                  Fechar Caixa
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {register && (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-xs text-slate-500">Saldo Inicial</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(register.opening_balance)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Total Vendas</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(totalSales)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Total Sangrias</p>
              <p className="text-xl font-bold text-rose-500 mt-1">{formatCurrency(totalSangrias)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Saldo Esperado</p>
              <p className="text-xl font-bold text-indigo-600 mt-1">{formatCurrency(expectedBalance)}</p>
            </Card>
          </div>

          {/* Unpaid Orders */}
          {unpaidOrders.length > 0 && (
            <Card>
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-700">Pedidos para Pagar ({unpaidOrders.length})</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {unpaidOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-slate-500">#{order.order_number}</span>
                        <span className="text-sm font-medium text-slate-700">
                          {order.table ? `Mesa ${(order.table as { number: string }).number}` : order.customer_name ?? 'Balcão'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{order.items?.length ?? 0} itens</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800">{formatCurrency(order.total)}</span>
                      <Button size="sm" leftIcon={<Receipt size={13} />}
                        onClick={() => { setSelectedOrder(order); setShowPayModal(true) }}>
                        Cobrar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Transaction History */}
          <Card>
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700">Movimentações do Caixa</h3>
            </div>
            <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto scrollbar-thin">
              {transactions.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-6">Nenhuma movimentação</p>
              ) : (
                transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      {tx.transaction_type === 'sale' ? (
                        <TrendingUp size={16} className="text-emerald-500" />
                      ) : tx.transaction_type === 'sangria' ? (
                        <TrendingDown size={16} className="text-rose-500" />
                      ) : (
                        <DollarSign size={16} className="text-blue-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-700">{tx.description ?? tx.transaction_type}</p>
                        <p className="text-xs text-slate-400">{formatDateTime(tx.created_at)}</p>
                      </div>
                    </div>
                    <span className={`font-semibold ${tx.transaction_type === 'sangria' ? 'text-rose-500' : 'text-emerald-600'}`}>
                      {tx.transaction_type === 'sangria' ? '-' : '+'}{formatCurrency(Math.abs(Number(tx.amount)))}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}

      {/* Modals */}
      <OpenRegisterModal
        open={showOpenModal}
        onClose={() => setShowOpenModal(false)}
        tenantId={tenant?.id ?? ''}
        userId={profile?.id ?? ''}
        onOpened={load}
      />

      <SangriaModal
        open={showSangriaModal}
        onClose={() => setShowSangriaModal(false)}
        register={register}
        userId={profile?.id ?? ''}
        tenantId={tenant?.id ?? ''}
        onDone={load}
      />

      <CloseRegisterModal
        open={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        register={register}
        expectedBalance={expectedBalance}
        userId={profile?.id ?? ''}
        onClosed={load}
      />

      <PayOrderModal
        open={showPayModal}
        onClose={() => setShowPayModal(false)}
        order={selectedOrder}
        register={register}
        tenantId={tenant?.id ?? ''}
        userId={profile?.id ?? ''}
        onPaid={load}
      />
    </div>
  )
}

// ──────────────────────────────────────────
function OpenRegisterModal({ open, onClose, tenantId, userId, onOpened }: {
  open: boolean; onClose: () => void; tenantId: string; userId: string; onOpened: () => void
}) {
  const [balance, setBalance] = useState('0')
  const [saving, setSaving] = useState(false)

  async function openRegister() {
    setSaving(true)
    await supabase.from('cash_registers').insert({
      tenant_id: tenantId, opened_by: userId, opening_balance: parseFloat(balance) || 0,
    })
    setSaving(false)
    onOpened()
    onClose()
    setBalance('0')
  }

  return (
    <Modal open={open} onClose={onClose} title="Abrir Caixa">
      <div className="space-y-4">
        <Input label="Saldo inicial (R$)" type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0,00" />
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" loading={saving} onClick={openRegister}>Abrir Caixa</Button>
        </div>
      </div>
    </Modal>
  )
}

// ──────────────────────────────────────────
function SangriaModal({ open, onClose, register, userId, tenantId, onDone }: {
  open: boolean; onClose: () => void; register: CashRegister | null
  userId: string; tenantId: string; onDone: () => void
}) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!register || !amount) return
    setSaving(true)
    await supabase.from('cash_transactions').insert({
      register_id: register.id, tenant_id: tenantId, user_id: userId,
      transaction_type: 'sangria', amount: parseFloat(amount),
      description: description || 'Sangria de caixa',
    })
    setSaving(false)
    onDone()
    onClose()
    setAmount(''); setDescription('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Sangria de Caixa">
      <div className="space-y-4">
        <Input label="Valor (R$)" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
        <Textarea label="Motivo" value={description} onChange={e => setDescription(e.target.value)} placeholder="Motivo da sangria…" rows={2} />
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={saving} onClick={save}>Confirmar Sangria</Button>
        </div>
      </div>
    </Modal>
  )
}

// ──────────────────────────────────────────
function CloseRegisterModal({ open, onClose, register, expectedBalance, userId, onClosed }: {
  open: boolean; onClose: () => void; register: CashRegister | null
  expectedBalance: number; userId: string; onClosed: () => void
}) {
  const [actualBalance, setActualBalance] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const actual = parseFloat(actualBalance) || 0
  const difference = actual - expectedBalance

  async function closeRegister() {
    if (!register) return
    setSaving(true)
    await supabase.from('cash_registers').update({
      closed_by: userId, closing_balance: actual,
      expected_balance: expectedBalance, difference,
      status: 'closed', closed_at: new Date().toISOString(), notes,
    }).eq('id', register.id)
    setSaving(false)
    onClosed()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Fechar Caixa">
      <div className="space-y-4">
        <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Saldo esperado</span>
            <span className="font-semibold">{formatCurrency(expectedBalance)}</span>
          </div>
        </div>

        <Input label="Saldo real em caixa (R$)" type="number" step="0.01"
          value={actualBalance} onChange={e => setActualBalance(e.target.value)} placeholder="0,00" />

        {actualBalance && (
          <div className={`flex justify-between text-sm font-semibold px-3 py-2 rounded-lg ${difference >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            <span>Diferença</span>
            <span>{difference >= 0 ? '+' : ''}{formatCurrency(difference)}</span>
          </div>
        )}

        <Textarea label="Observações" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={saving} onClick={closeRegister}>
            Fechar Caixa
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ──────────────────────────────────────────
function PayOrderModal({ open, onClose, order, register, tenantId, userId, onPaid }: {
  open: boolean; onClose: () => void; order: Order | null; register: CashRegister | null
  tenantId: string; userId: string; onPaid: () => void
}) {
  const [method, setMethod] = useState<PaymentMethod>('pix')
  const [paidAmount, setPaidAmount] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (order) setPaidAmount(order.total.toString())
  }, [order])

  const change = Math.max(0, (parseFloat(paidAmount) || 0) - (order?.total ?? 0))

  async function pay() {
    if (!order || !register) return
    setSaving(true)

    await supabase.from('orders').update({
      status: 'paid', payment_method: method,
      paid_amount: parseFloat(paidAmount) || order.total,
      change_amount: change, paid_at: new Date().toISOString(),
    }).eq('id', order.id)

    if (order.table_id) {
      await supabase.from('restaurant_tables').update({ status: 'cleaning' }).eq('id', order.table_id)
    }

    await supabase.from('cash_transactions').insert({
      register_id: register.id, tenant_id: tenantId, user_id: userId,
      transaction_type: 'sale', amount: order.total,
      order_id: order.id, payment_method: method,
      description: `Pagamento pedido #${order.order_number}`,
    })

    setSaving(false)
    onPaid()
    onClose()
  }

  if (!order) return null

  const paymentMethods = [
    { value: 'pix', label: 'PIX', icon: Smartphone },
    { value: 'credit_card', label: 'Crédito', icon: CreditCard },
    { value: 'debit_card', label: 'Débito', icon: CreditCard },
    { value: 'cash', label: 'Dinheiro', icon: Banknote },
  ]

  return (
    <Modal open={open} onClose={onClose} title={`Cobrar Pedido #${order.order_number}`}>
      <div className="space-y-4">
        {/* Items summary */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 max-h-32 overflow-y-auto">
          {(order.items ?? []).map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-slate-600">{item.quantity}x {item.product_name}</span>
              <span className="font-medium">{formatCurrency(item.total_price)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold border-t pt-1.5">
            <span>Total</span>
            <span className="text-indigo-600">{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Payment method */}
        <div>
          <p className="text-sm font-medium text-slate-600 mb-2">Forma de pagamento</p>
          <div className="grid grid-cols-4 gap-2">
            {paymentMethods.map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => setMethod(value as PaymentMethod)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all text-xs font-medium
                  ${method === value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {method === 'cash' && (
          <>
            <Input label="Valor recebido (R$)" type="number" step="0.01"
              value={paidAmount} onChange={e => setPaidAmount(e.target.value)} />
            {change > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 flex justify-between text-sm font-semibold text-emerald-700">
                <span>Troco</span>
                <span>{formatCurrency(change)}</span>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" loading={saving} onClick={pay}>
            Confirmar Pagamento
          </Button>
        </div>
      </div>
    </Modal>
  )
}
