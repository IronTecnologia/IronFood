import { useEffect, useState } from 'react'
import { Plus, Trash2, DollarSign, TrendingUp, TrendingDown, Filter, X } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { formatCurrency } from '../utils/format'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description?: string
  date: string
  created_at: string
}

interface Category {
  id: string
  name: string
}

const COLORS = ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#f97316']

export default function Financial() {
  const { tenant } = useAuthStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([])
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState<'income' | 'expense'>('income')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().split('-').slice(0, 2).join('-'))
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  useEffect(() => {
    if (tenant) {
      fetchCategories()
      fetchTransactions()
    }
  }, [tenant, filterMonth])

  const fetchCategories = async () => {
    if (!tenant) return
    const [{ data: income }, { data: expense }] = await Promise.all([
      supabase.from('income_categories').select('*').eq('tenant_id', tenant.id).order('name'),
      supabase.from('expense_categories').select('*').eq('tenant_id', tenant.id).order('name'),
    ])
    setIncomeCategories((income || []) as Category[])
    setExpenseCategories((expense || []) as Category[])
  }

  const fetchTransactions = async () => {
    if (!tenant) return
    try {
      setLoading(true)
      const startDate = `${filterMonth}-01`
      const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1))
        .toISOString().split('T')[0]

      const { data } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('tenant_id', tenant.id)
        .gte('date', startDate)
        .lt('date', endDate)
        .order('date', { ascending: false })

      setTransactions((data || []) as Transaction[])
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant || !newCategoryName.trim()) return

    const table = type === 'income' ? 'income_categories' : 'expense_categories'
    await supabase.from(table).insert({
      tenant_id: tenant.id,
      name: newCategoryName.trim(),
    })

    setNewCategoryName('')
    setShowNewCategory(false)
    fetchCategories()
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Deletar essa categoria?')) return
    const table = type === 'income' ? 'income_categories' : 'expense_categories'
    await supabase.from(table).delete().eq('id', categoryId)
    setCategory('')
    fetchCategories()
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant || !amount || !category || !date) return

    try {
      await supabase.from('financial_transactions').insert({
        tenant_id: tenant.id,
        type,
        category,
        amount: parseFloat(amount),
        description: description || null,
        date,
      })

      setAmount('')
      setCategory('')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
      fetchTransactions()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar essa transação?')) return
    await supabase.from('financial_transactions').delete().eq('id', id)
    fetchTransactions()
  }

  const categories = type === 'income' ? incomeCategories : expenseCategories
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const profit = income - expense

  const monthlyData = Array.from({ length: 31 }, (_, i) => {
    const day = String(i + 1).padStart(2, '0')
    const dayDate = `${filterMonth}-${day}`
    const dayIncome = transactions
      .filter(t => t.type === 'income' && t.date === dayDate)
      .reduce((s, t) => s + t.amount, 0)
    const dayExpense = transactions
      .filter(t => t.type === 'expense' && t.date === dayDate)
      .reduce((s, t) => s + t.amount, 0)

    return {
      day: String(i + 1),
      Receita: dayIncome,
      Despesa: dayExpense,
    }
  }).filter(d => d.Receita > 0 || d.Despesa > 0)

  const categoryData = Array.from(
    new Map(
      transactions.map(t => [
        t.category,
        {
          name: t.category,
          value: transactions
            .filter(x => x.category === t.category)
            .reduce((s, x) => s + x.amount, 0),
        },
      ])
    ).values()
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Financeiro</h1>
        <p className="text-slate-600 mt-1">Gestão de receitas e despesas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Receita</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{formatCurrency(income)}</p>
            </div>
            <TrendingUp size={32} className="text-emerald-400 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Despesa</p>
              <p className="text-3xl font-bold text-rose-600 mt-2">{formatCurrency(expense)}</p>
            </div>
            <TrendingDown size={32} className="text-rose-400 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Lucro</p>
              <p className={`text-3xl font-bold mt-2 ${profit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                {formatCurrency(profit)}
              </p>
            </div>
            <DollarSign size={32} className="text-indigo-400 opacity-20" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Registrar Transação</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-2">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                {(['income', 'expense'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setType(t); setCategory('') }}
                    className={`py-2 rounded-lg font-medium transition-all ${
                      type === t
                        ? t === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {t === 'income' ? 'Receita' : 'Despesa'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-600">Categoria</label>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(!showNewCategory)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Plus size={14} /> Nova
                </button>
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Selecione...</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {showNewCategory && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nome da categoria"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Criar
              </button>
              <button
                type="button"
                onClick={() => { setShowNewCategory(false); setNewCategoryName('') }}
                className="px-3 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <div key={c.id} className="flex items-center gap-1 bg-slate-100 rounded-lg px-2.5 py-1.5 text-sm">
                  <span className="text-slate-700">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(c.id)}
                    className="text-slate-400 hover:text-rose-600 transition-colors flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-2">Valor</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600 block mb-2">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600 block mb-2">Descrição (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Compra de ingredientes"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Registrar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {monthlyData.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Receita vs Despesa</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Receita" fill="#10b981" />
                <Bar dataKey="Despesa" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {categoryData.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Por Categoria</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Transações</h3>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400">Carregando...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-slate-400">Nenhuma transação neste período</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {t.category}
                    </span>
                    <span className="text-sm text-slate-600">{t.description || '-'}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-lg font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1 hover:bg-rose-100 text-rose-600 rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
