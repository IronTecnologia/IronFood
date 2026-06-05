import { useEffect, useState } from 'react'
import { QrCode, Building2, Copy, Check, ExternalLink, MapPin, Bike, Plus, Trash2, Pencil, ToggleRight, ToggleLeft, Printer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Card, Button, Input, Select, Spinner, Modal } from '../components/ui'
import { formatCurrency } from '../utils/format'
import type { TenantType, DeliveryArea, Motoboy, PrinterConfig } from '../types'

type Tab = 'general' | 'delivery' | 'motoboys' | 'devices'

export default function Settings() {
  const { tenant, refreshProfile } = useAuthStore()
  const [tab, setTab] = useState<Tab>('general')
  const [name, setName] = useState('')
  const [type, setType] = useState<TenantType>('restaurant')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (tenant) {
      setName(tenant.name); setType(tenant.type)
      setPhone(tenant.phone ?? ''); setEmail(tenant.email ?? ''); setAddress(tenant.address ?? '')
    }
  }, [tenant])

  async function saveSettings() {
    if (!tenant) return
    setSaving(true)
    await supabase.from('tenants').update({ name, type, phone, email, address }).eq('id', tenant.id)
    await refreshProfile()
    setSaving(false)
  }

  const menuUrl = tenant ? `${window.location.origin}/menu/${tenant.slug}` : ''

  function copyUrl() {
    navigator.clipboard.writeText(menuUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!tenant) return <div className="flex justify-center pt-20"><Spinner size={32} /></div>

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'general',  label: 'Estabelecimento', icon: Building2 },
    { id: 'delivery', label: 'Áreas de Entrega', icon: MapPin },
    { id: 'motoboys', label: 'Motoboys',          icon: Bike },
    { id: 'devices',  label: 'Dispositivos',      icon: Printer },
  ]

  return (
    <div className="max-w-3xl space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Estabelecimento ── */}
      {tab === 'general' && (
        <>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Building2 size={20} className="text-indigo-600" />
              <h2 className="font-semibold text-slate-800">Dados da Empresa</h2>
            </div>
            <div className="space-y-4">
              <Input label="Nome do estabelecimento" value={name} onChange={e => setName(e.target.value)} />
              <Select label="Tipo" value={type} onChange={e => setType(e.target.value as TenantType)}
                options={[
                  { value: 'restaurant', label: 'Restaurante' },
                  { value: 'burger',     label: 'Hamburgueria' },
                  { value: 'pizzeria',   label: 'Pizzaria' },
                  { value: 'bar',        label: 'Bar / Boteco' },
                ]} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Telefone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
                <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <Input label="Endereço" value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, número, bairro, cidade" />
              <Button loading={saving} onClick={saveSettings}>Salvar Configurações</Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <QrCode size={20} className="text-indigo-600" />
              <h2 className="font-semibold text-slate-800">Cardápio Digital</h2>
            </div>
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="flex-shrink-0 p-3 bg-white border-2 border-slate-200 rounded-xl">
                <QRCodeSVG value={menuUrl} size={140} level="H" includeMargin={false} />
              </div>
              <div className="space-y-3 flex-1">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Link do cardápio</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 break-all">
                      {menuUrl}
                    </code>
                    <button onClick={copyUrl}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex-shrink-0">
                      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-slate-500" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" leftIcon={<ExternalLink size={14} />}
                    onClick={() => window.open(menuUrl, '_blank')}>
                    Abrir Cardápio
                  </Button>
                  <Button variant="secondary" size="sm" leftIcon={<QrCode size={14} />}
                    onClick={() => window.print()}>
                    Imprimir QR
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  Imprima o QR Code e coloque nas mesas para que seus clientes acessem o cardápio digital sem precisar de app.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* ── Áreas de Entrega ── */}
      {tab === 'delivery' && <DeliveryAreasTab tenantId={tenant.id} />}

      {/* ── Motoboys ── */}
      {tab === 'motoboys' && <MotoboysTab tenantId={tenant.id} />}

      {/* ── Dispositivos ── */}
      {tab === 'devices' && <PrinterConfigTab tenantId={tenant.id} />}
    </div>
  )
}

// ──────────────────────────────────────────
function DeliveryAreasTab({ tenantId }: { tenantId: string }) {
  const [areas, setAreas] = useState<DeliveryArea[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<DeliveryArea | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('delivery_areas').select('*').eq('tenant_id', tenantId).order('sort_order').order('name')
    setAreas((data ?? []) as DeliveryArea[])
    setLoading(false)
  }

  async function toggle(id: string, active: boolean) {
    await supabase.from('delivery_areas').update({ active: !active }).eq('id', id)
    setAreas(prev => prev.map(a => a.id === id ? { ...a, active: !active } : a))
  }

  async function remove(id: string) {
    if (!confirm('Excluir esta área de entrega?')) return
    await supabase.from('delivery_areas').delete().eq('id', id)
    setAreas(prev => prev.filter(a => a.id !== id))
  }

  if (loading) return <div className="flex justify-center pt-10"><Spinner size={28} /></div>

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <MapPin size={20} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-800">Áreas de Entrega</h2>
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => { setEditing(null); setShowModal(true) }}>
          Nova Área
        </Button>
      </div>

      <div className="space-y-2">
        {areas.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">Nenhuma área cadastrada</p>
        )}
        {areas.map(area => (
          <div key={area.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl">
            <div>
              <p className="font-medium text-slate-800 text-sm">{area.name}</p>
              <p className="text-xs text-indigo-600 font-semibold mt-0.5">Taxa: {formatCurrency(area.fee)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggle(area.id, area.active)}>
                {area.active
                  ? <ToggleRight size={20} className="text-emerald-500" />
                  : <ToggleLeft size={20} className="text-slate-400" />}
              </button>
              <button onClick={() => { setEditing(area); setShowModal(true) }}
                className="p-1.5 hover:bg-slate-200 rounded-lg">
                <Pencil size={14} className="text-slate-500" />
              </button>
              <button onClick={() => remove(area.id)} className="p-1.5 hover:bg-rose-50 rounded-lg">
                <Trash2 size={14} className="text-rose-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <DeliveryAreaModal
        open={showModal}
        onClose={() => setShowModal(false)}
        area={editing}
        tenantId={tenantId}
        onSaved={load}
      />
    </Card>
  )
}

function DeliveryAreaModal({ open, onClose, area, tenantId, onSaved }: {
  open: boolean; onClose: () => void; area: DeliveryArea | null; tenantId: string; onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [fee, setFee] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (area) { setName(area.name); setFee(String(area.fee)) }
    else { setName(''); setFee('') }
  }, [area, open])

  async function save() {
    if (!name || !fee) return
    setSaving(true)
    const payload = { tenant_id: tenantId, name, fee: parseFloat(fee), active: true }
    if (area) await supabase.from('delivery_areas').update(payload).eq('id', area.id)
    else await supabase.from('delivery_areas').insert(payload)
    setSaving(false)
    onSaved(); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={area ? 'Editar Área' : 'Nova Área de Entrega'}>
      <div className="space-y-4">
        <Input label="Bairro / Área" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Centro, Vila Madalena…" />
        <Input label="Taxa de entrega (R$)" type="number" step="0.50" min="0" value={fee} onChange={e => setFee(e.target.value)} placeholder="0,00" />
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" loading={saving} onClick={save}>{area ? 'Salvar' : 'Adicionar'}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ──────────────────────────────────────────
function MotoboysTab({ tenantId }: { tenantId: string }) {
  const [motoboys, setMotoboys] = useState<Motoboy[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Motoboy | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('motoboys').select('*').eq('tenant_id', tenantId).order('name')
    setMotoboys((data ?? []) as Motoboy[])
    setLoading(false)
  }

  async function toggle(id: string, active: boolean) {
    await supabase.from('motoboys').update({ active: !active }).eq('id', id)
    setMotoboys(prev => prev.map(m => m.id === id ? { ...m, active: !active } : m))
  }

  async function remove(id: string) {
    if (!confirm('Excluir este motoboy?')) return
    await supabase.from('motoboys').delete().eq('id', id)
    setMotoboys(prev => prev.filter(m => m.id !== id))
  }

  if (loading) return <div className="flex justify-center pt-10"><Spinner size={28} /></div>

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Bike size={20} className="text-indigo-600" />
          <h2 className="font-semibold text-slate-800">Motoboys</h2>
        </div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => { setEditing(null); setShowModal(true) }}>
          Novo Motoboy
        </Button>
      </div>

      <div className="space-y-2">
        {motoboys.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">Nenhum motoboy cadastrado</p>
        )}
        {motoboys.map(m => (
          <div key={m.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl">
            <div>
              <p className="font-medium text-slate-800 text-sm">{m.name}</p>
              {m.whatsapp && (
                <a href={`https://wa.me/55${m.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-emerald-600 hover:underline mt-0.5 flex items-center gap-1">
                  📱 {m.whatsapp}
                </a>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggle(m.id, m.active)}>
                {m.active
                  ? <ToggleRight size={20} className="text-emerald-500" />
                  : <ToggleLeft size={20} className="text-slate-400" />}
              </button>
              <button onClick={() => { setEditing(m); setShowModal(true) }}
                className="p-1.5 hover:bg-slate-200 rounded-lg">
                <Pencil size={14} className="text-slate-500" />
              </button>
              <button onClick={() => remove(m.id)} className="p-1.5 hover:bg-rose-50 rounded-lg">
                <Trash2 size={14} className="text-rose-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <MotoboyModal
        open={showModal}
        onClose={() => setShowModal(false)}
        motoboy={editing}
        tenantId={tenantId}
        onSaved={load}
      />
    </Card>
  )
}

function MotoboyModal({ open, onClose, motoboy, tenantId, onSaved }: {
  open: boolean; onClose: () => void; motoboy: Motoboy | null; tenantId: string; onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (motoboy) { setName(motoboy.name); setWhatsapp(motoboy.whatsapp ?? '') }
    else { setName(''); setWhatsapp('') }
  }, [motoboy, open])

  async function save() {
    if (!name) return
    setSaving(true)
    const payload = { tenant_id: tenantId, name, whatsapp: whatsapp || null, active: true }
    if (motoboy) await supabase.from('motoboys').update(payload).eq('id', motoboy.id)
    else await supabase.from('motoboys').insert(payload)
    setSaving(false)
    onSaved(); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={motoboy ? 'Editar Motoboy' : 'Novo Motoboy'}>
      <div className="space-y-4">
        <Input label="Nome" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do motoboy" />
        <Input label="WhatsApp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
          placeholder="(11) 99999-9999"
          hint="Será usado para envio de rotas via WhatsApp no futuro" />
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" loading={saving} onClick={save}>{motoboy ? 'Salvar' : 'Adicionar'}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ──────────────────────────────────────────
function PrinterConfigTab({ tenantId }: { tenantId: string }) {
  const [config, setConfig] = useState<PrinterConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [method, setMethod] = useState<'kds' | 'printer'>('kds')
  const [printerName, setPrinterName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('printer_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (data) {
      setConfig(data)
      setMethod(data.method)
      setPrinterName(data.printer_name || '')
    } else {
      setMethod('kds')
      setPrinterName('')
    }
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    const payload = { tenant_id: tenantId, method, printer_name: printerName || null }

    if (config) {
      await supabase.from('printer_config').update(payload).eq('id', config.id)
    } else {
      await supabase.from('printer_config').insert(payload)
    }

    setSaving(false)
    load()
  }

  if (loading) return <div className="flex justify-center pt-10"><Spinner size={28} /></div>

  return (
    <Card className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Printer size={20} className="text-indigo-600" />
        <h2 className="font-semibold text-slate-800">Dispositivos de Impressão</h2>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Método de Entrega de Pedidos
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
              onClick={() => setMethod('kds')}>
              <input type="radio" checked={method === 'kds'} onChange={() => {}} className="w-4 h-4" />
              <div>
                <p className="font-medium text-slate-700">Kitchen Display System (KDS)</p>
                <p className="text-xs text-slate-500">Pedidos aparecem em tempo real na tela da cozinha</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50"
              onClick={() => setMethod('printer')}>
              <input type="radio" checked={method === 'printer'} onChange={() => {}} className="w-4 h-4" />
              <div>
                <p className="font-medium text-slate-700">Impressora Térmica</p>
                <p className="text-xs text-slate-500">Pedidos são impressos automaticamente na cozinha</p>
              </div>
            </label>
          </div>
        </div>

        {method === 'printer' && (
          <div>
            <Input
              label="Nome da Impressora (opcional)"
              value={printerName}
              onChange={e => setPrinterName(e.target.value)}
              placeholder="Ex: Impressora Cozinha"
              hint="Nome para identificação da impressora padrão"
            />
          </div>
        )}

        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <p className="text-sm font-medium text-slate-700 mb-2">💡 Como funciona:</p>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>• <strong>KDS:</strong> Todos os pedidos aparecem em tempo real no Kitchen Display System</li>
            <li>• <strong>Impressora:</strong> Pedidos são impressos automaticamente assim que criados</li>
            <li>• A alteração se aplica a todos os pedidos: Salão, Delivery e Retirada</li>
            <li>• Você pode mudar de método a qualquer momento</li>
          </ul>
        </div>

        <Button loading={saving} onClick={save} className="w-full">
          {config ? 'Atualizar Configuração' : 'Salvar Configuração'}
        </Button>
      </div>
    </Card>
  )
}
