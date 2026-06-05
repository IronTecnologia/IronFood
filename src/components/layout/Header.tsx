import { useEffect, useState } from 'react'
import { Menu, Bell, BellRing, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { cn } from '../../utils/cn'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tables': 'Mapa de Mesas',
  '/orders': 'Pedidos',
  '/kds/kitchen': 'KDS — Cozinha',
  '/kds/bar': 'KDS — Bar',
  '/pos': 'Caixa',
  '/products': 'Produtos',
  '/reports': 'Relatórios',
  '/users': 'Usuários',
  '/settings': 'Configurações',
}

interface WaiterCall {
  id: string
  tableNumber: string
  tableId: string
  at: Date
}

function playAlertSound() {
  try {
    const ctx = new AudioContext()
    const freqs = [880, 1100, 880]
    freqs.forEach((freq, i) => {
      const delay = i * 0.22
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, ctx.currentTime + delay)
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + delay + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.22)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + 0.22)
    })
  } catch {}
}

interface Props {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: Props) {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] ?? 'MesaFlow'
  const tenant = useAuthStore(s => s.tenant)
  const [calls, setCalls] = useState<WaiterCall[]>([])
  const [showCalls, setShowCalls] = useState(false)

  useEffect(() => {
    if (!tenant) return

    const ch = supabase.channel(`waiter-calls-${tenant.id}`)
      .on('broadcast', { event: 'call' }, ({ payload }) => {
        const call: WaiterCall = {
          id: `${payload.tableId}-${Date.now()}`,
          tableNumber: payload.tableNumber,
          tableId: payload.tableId,
          at: new Date(),
        }
        setCalls(prev => [call, ...prev])
        setShowCalls(true)
        playAlertSound()
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [tenant])

  function dismissCall(id: string) {
    setCalls(prev => prev.filter(c => c.id !== id))
  }

  function dismissAll() {
    setCalls([])
    setShowCalls(false)
  }

  const pendingCalls = calls.length

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 gap-4 sticky top-0 z-10">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Menu size={20} className="text-slate-600" />
        </button>

        <h1 className="font-semibold text-slate-800 text-lg flex-1">{title}</h1>

        <div className="flex items-center gap-2">
          {/* Bell com contador de chamadas */}
          <button
            onClick={() => setShowCalls(v => !v)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors relative"
          >
            {pendingCalls > 0
              ? <BellRing size={18} className="text-amber-500 animate-bounce" />
              : <Bell size={18} className="text-slate-500" />
            }
            {pendingCalls > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingCalls}
              </span>
            )}
          </button>

          {tenant && (
            <span className="hidden sm:block text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
              {tenant.name}
            </span>
          )}
        </div>
      </header>

      {/* Pop-up de chamadas */}
      {showCalls && calls.length > 0 && (
        <div className="fixed top-20 right-4 z-50 w-80 space-y-2">
          {calls.map(call => (
            <div key={call.id}
              className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 shadow-xl flex items-start gap-3 animate-slide-in">
              <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
                <BellRing size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-amber-900 text-sm">Mesa {call.tableNumber} chamando!</p>
                <p className="text-amber-700 text-xs mt-0.5">
                  {call.at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={() => dismissCall(call.id)}
                className="p-1 hover:bg-amber-200 rounded-lg transition-colors flex-shrink-0">
                <X size={14} className="text-amber-700" />
              </button>
            </div>
          ))}
          <button onClick={dismissAll}
            className="w-full text-xs text-slate-500 hover:text-slate-700 py-1 transition-colors">
            Dispensar todas
          </button>
        </div>
      )}
    </>
  )
}
