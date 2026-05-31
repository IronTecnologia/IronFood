import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Utensils, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { Button, Input } from '../components/ui'

interface Form { email: string; password: string }

export default function Login() {
  const { user, login } = useAuthStore()
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>()

  if (user) return <Navigate to="/" replace />

  const onSubmit = async (data: Form) => {
    setError('')
    try {
      await login(data.email, data.password)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Credenciais inválidas. Tente novamente.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-10 table-map-grid pointer-events-none" />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/30">
            <Utensils size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">MesaFlow</h1>
          <p className="text-slate-400 text-sm mt-1">Gestão inteligente para seu negócio</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/10 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Entrar na sua conta</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">E-mail</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="seuemail@empresa.com"
                {...register('email', { required: 'E-mail obrigatório' })}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
              />
              {errors.email && <p className="text-xs text-rose-400">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password', { required: 'Senha obrigatória' })}
                  className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 pr-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-rose-400">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="bg-rose-500/20 border border-rose-500/30 rounded-lg px-3 py-2">
                <p className="text-xs text-rose-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : null}
              Entrar
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          MesaFlow — Sistema de Gestão para Restaurantes
        </p>
      </div>
    </div>
  )
}
