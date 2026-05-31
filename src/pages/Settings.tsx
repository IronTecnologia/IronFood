import { useEffect, useState } from 'react'
import { QrCode, Building2, Copy, Check, ExternalLink } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Card, Button, Input, Select, Spinner } from '../components/ui'
import type { TenantType } from '../types'

export default function Settings() {
  const { tenant, refreshProfile } = useAuthStore()
  const [name, setName] = useState('')
  const [type, setType] = useState<TenantType>('restaurant')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (tenant) {
      setName(tenant.name)
      setType(tenant.type)
      setPhone(tenant.phone ?? '')
      setEmail(tenant.email ?? '')
      setAddress(tenant.address ?? '')
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

  return (
    <div className="max-w-2xl space-y-6">
      {/* Company Info */}
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
              { value: 'burger', label: 'Hamburgueria' },
              { value: 'pizzeria', label: 'Pizzaria' },
              { value: 'bar', label: 'Bar / Boteco' },
            ]} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Telefone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
            <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <Input label="Endereço" value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua, número, bairro, cidade" />
          <Button loading={saving} onClick={saveSettings}>Salvar Configurações</Button>
        </div>
      </Card>

      {/* QR Code */}
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

      {/* Plan Info */}
      <Card className="p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Plano Atual</h2>
        <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl">
          <div>
            <p className="font-bold text-indigo-700 capitalize">{tenant.plan}</p>
            <p className="text-xs text-indigo-500 mt-0.5">
              {tenant.plan === 'free' ? 'Plano gratuito com recursos básicos' : 'Plano com todos os recursos'}
            </p>
          </div>
          {tenant.plan === 'free' && (
            <Button size="sm">Fazer Upgrade</Button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-slate-500 mb-3">Integrações futuras</p>
          {[
            { name: 'Asaas', desc: 'Cobrança e pagamentos online', soon: true },
            { name: 'WhatsApp', desc: 'Envio de pedidos e notificações', soon: true },
            { name: 'Impressora Térmica', desc: 'Impressão de comandas e recibos', soon: true },
          ].map(i => (
            <div key={i.name} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-slate-600">{i.name}</span>
                <span className="text-xs text-slate-400 block">{i.desc}</span>
              </div>
              <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">Em breve</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
