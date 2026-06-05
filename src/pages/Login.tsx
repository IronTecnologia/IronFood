import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Utensils, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

interface LoginForm { email: string; password: string }
interface SignupForm { email: string; password: string; confirmPassword: string; restaurantName: string }
interface ResetForm { email: string }

export default function Login() {
  const { user, login, resetPassword } = useAuthStore()
  const [showPass, setShowPass] = useState(false)
  const [showPassConfirm, setShowPassConfirm] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'reset-sent'>('login')

  const loginForm = useForm<LoginForm>()
  const signupForm = useForm<SignupForm>()
  const resetForm = useForm<ResetForm>()

  if (user) return <Navigate to="/dashboard" replace />

  const onLogin = async (data: LoginForm) => {
    setError('')
    try {
      await login(data.email, data.password)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Credenciais inválidas. Tente novamente.')
    }
  }

  const onSignup = async (data: SignupForm) => {
    setError('')
    if (data.password !== data.confirmPassword) {
      setError('As senhas não coincidem')
      return
    }
    try {
      await login(data.email, data.password)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao criar conta. Tente novamente.')
    }
  }

  const onReset = async (data: ResetForm) => {
    setError('')
    try {
      await resetPassword(data.email)
      setMode('reset-sent')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar o e-mail. Tente novamente.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
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

          {/* ── Login ── */}
          {mode === 'login' && (
            <>
              <h2 className="text-lg font-semibold text-white mb-6">Entrar na sua conta</h2>

              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-300">E-mail</label>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="seuemail@empresa.com"
                    {...loginForm.register('email', { required: 'E-mail obrigatório' })}
                    className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-rose-400">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-300">Senha</label>
                    <button
                      type="button"
                      onClick={() => { setError(''); setMode('reset') }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      {...loginForm.register('password', { required: 'Senha obrigatória' })}
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
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-rose-400">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                {error && (
                  <div className="bg-rose-500/20 border border-rose-500/30 rounded-lg px-3 py-2">
                    <p className="text-xs text-rose-300">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginForm.formState.isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loginForm.formState.isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  Entrar
                </button>

                <div className="text-center mt-6">
                  <p className="text-sm text-slate-400">Não tem conta? <button type="button" onClick={() => { setError(''); setMode('signup') }} className="text-indigo-400 hover:text-indigo-300 transition-colors font-semibold">Criar conta</button></p>
                </div>
              </form>
            </>
          )}

          {/* ── Cadastro ── */}
          {mode === 'signup' && (
            <>
              <h2 className="text-lg font-semibold text-white mb-6">Criar nova conta</h2>

              <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-300">Nome do Restaurante</label>
                  <input
                    type="text"
                    placeholder="Seu restaurante"
                    {...signupForm.register('restaurantName', { required: 'Nome obrigatório' })}
                    className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                  />
                  {signupForm.formState.errors.restaurantName && (
                    <p className="text-xs text-rose-400">{signupForm.formState.errors.restaurantName.message}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-300">E-mail</label>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="seuemail@empresa.com"
                    {...signupForm.register('email', { required: 'E-mail obrigatório' })}
                    className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                  />
                  {signupForm.formState.errors.email && (
                    <p className="text-xs text-rose-400">{signupForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-300">Senha</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      {...signupForm.register('password', { required: 'Senha obrigatória' })}
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
                  {signupForm.formState.errors.password && (
                    <p className="text-xs text-rose-400">{signupForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-300">Confirmar Senha</label>
                  <div className="relative">
                    <input
                      type={showPassConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      {...signupForm.register('confirmPassword', { required: 'Confirmação obrigatória' })}
                      className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 pr-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassConfirm(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {signupForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-rose-400">{signupForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                {error && (
                  <div className="bg-rose-500/20 border border-rose-500/30 rounded-lg px-3 py-2">
                    <p className="text-xs text-rose-300">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={signupForm.formState.isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {signupForm.formState.isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  Criar Conta
                </button>

                <div className="text-center mt-6">
                  <p className="text-sm text-slate-400">Já tem conta? <button type="button" onClick={() => { setError(''); setMode('login') }} className="text-indigo-400 hover:text-indigo-300 transition-colors font-semibold">Entrar</button></p>
                </div>
              </form>
            </>
          )}

          {/* ── Recuperação de senha ── */}
          {mode === 'reset' && (
            <>
              <button
                type="button"
                onClick={() => { setError(''); setMode('login') }}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-5"
              >
                <ArrowLeft size={15} /> Voltar
              </button>

              <h2 className="text-lg font-semibold text-white mb-2">Recuperar senha</h2>
              <p className="text-sm text-slate-400 mb-6">
                Digite seu e-mail e enviaremos um link para você criar uma nova senha.
              </p>

              <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-300">E-mail</label>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="seuemail@empresa.com"
                    {...resetForm.register('email', { required: 'E-mail obrigatório' })}
                    className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                  />
                  {resetForm.formState.errors.email && (
                    <p className="text-xs text-rose-400">{resetForm.formState.errors.email.message}</p>
                  )}
                </div>

                {error && (
                  <div className="bg-rose-500/20 border border-rose-500/30 rounded-lg px-3 py-2">
                    <p className="text-xs text-rose-300">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetForm.formState.isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {resetForm.formState.isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  Enviar link de recuperação
                </button>
              </form>
            </>
          )}

          {/* ── Confirmação de envio ── */}
          {mode === 'reset-sent' && (
            <div className="text-center py-2">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">E-mail enviado!</h2>
              <p className="text-sm text-slate-400 mb-6">
                Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
              </p>
              <button
                type="button"
                onClick={() => { setError(''); setMode('login') }}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Voltar ao login
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          MesaFlow — Sistema de Gestão para Restaurantes
        </p>
      </div>
    </div>
  )
}
