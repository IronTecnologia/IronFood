import { useEffect, useState } from 'react'
import { Plus, Pencil, Users2, UserCheck, UserX } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Card, Button, Badge, Modal, Input, Select, Spinner, EmptyState } from '../components/ui'
import { ROLE_LABEL } from '../utils/format'
import type { Profile, UserRole } from '../types'

const ROLE_BADGE: Record<UserRole, string> = {
  admin: 'danger', waiter: 'info', kitchen: 'warning', bar: 'purple', cashier: 'success', motoboy: 'default',
}

export default function Users() {
  const tenant = useAuthStore(s => s.tenant)
  const myId = useAuthStore(s => s.profile?.id)
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!tenant) return
    loadUsers()
  }, [tenant])

  async function loadUsers() {
    if (!tenant) return
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('full_name')
      setUsers((data ?? []) as Profile[])
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('profiles').update({ active: !current }).eq('id', id)
    setUsers(u => u.map(x => x.id === id ? { ...x, active: !current } : x))
  }

  if (loading) return <div className="flex justify-center pt-20"><Spinner size={32} /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}</p>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => { setEditing(null); setShowModal(true) }}>
          Novo Usuário
        </Button>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={<Users2 size={40} />} title="Nenhum usuário cadastrado" />
      ) : (
        <Card>
          <div className="divide-y divide-slate-50">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${user.active ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                    {user.full_name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 text-sm">{user.full_name}</span>
                      {user.id === myId && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded">Você</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={ROLE_BADGE[user.role] as 'danger' | 'info' | 'warning' | 'purple' | 'success'} className="text-[10px]">
                        {ROLE_LABEL[user.role]}
                      </Badge>
                      {!user.active && <Badge variant="default" className="text-[10px]">Inativo</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(user.id, user.active)}
                    disabled={user.id === myId}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
                    title={user.active ? 'Desativar' : 'Ativar'}
                  >
                    {user.active
                      ? <UserCheck size={16} className="text-emerald-500" />
                      : <UserX size={16} className="text-slate-400" />
                    }
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(user); setShowModal(true) }}>
                    <Pencil size={14} className="text-slate-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <UserModal
        open={showModal}
        onClose={() => setShowModal(false)}
        user={editing}
        tenantId={tenant?.id ?? ''}
        onSaved={loadUsers}
      />
    </div>
  )
}

// ──────────────────────────────────────────
function UserModal({ open, onClose, user, tenantId, onSaved }: {
  open: boolean; onClose: () => void; user: Profile | null
  tenantId: string; onSaved: () => void
}) {
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('waiter')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setFullName(user.full_name)
      setRole(user.role)
      setWhatsapp((user as Profile & { whatsapp?: string }).whatsapp ?? '')
    } else {
      setFullName(''); setRole('waiter'); setEmail(''); setPassword(''); setWhatsapp('')
    }
    setError('')
  }, [user, open])

  async function save() {
    setError('')
    setSaving(true)
    try {
      if (user) {
        await supabase.from('profiles').update({ full_name: fullName, role, whatsapp: whatsapp || null }).eq('id', user.id)
      } else {
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email, password, email_confirm: true,
        })
        if (authErr) throw authErr
        await supabase.from('profiles').insert({
          id: authData.user.id, tenant_id: tenantId, full_name: fullName, role,
          whatsapp: whatsapp || null,
        })
      }
      onSaved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar usuário')
    }
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title={user ? 'Editar Usuário' : 'Novo Usuário'}>
      <div className="space-y-4">
        <Input label="Nome completo" value={fullName} onChange={e => setFullName(e.target.value)} />
        <Select label="Perfil de acesso" value={role} onChange={e => setRole(e.target.value as UserRole)}
          options={[
            { value: 'admin',   label: 'Administrador' },
            { value: 'waiter',  label: 'Garçom' },
            { value: 'kitchen', label: 'Cozinha' },
            { value: 'bar',     label: 'Bar' },
            { value: 'cashier', label: 'Caixa' },
            { value: 'motoboy', label: 'Motoboy' },
          ]} />

        <Input label="WhatsApp (opcional)" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
          placeholder="(11) 99999-9999" />

        {!user && (
          <>
            <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <Input label="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)}
              hint="Mínimo 6 caracteres" />
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              O usuário receberá acesso com as credenciais informadas. Recomenda-se que troque a senha no primeiro acesso.
            </div>
          </>
        )}

        {error && <p className="text-xs text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" loading={saving} onClick={save}>{user ? 'Salvar' : 'Criar Usuário'}</Button>
        </div>
      </div>
    </Modal>
  )
}
