import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Search, ShoppingCart, Utensils } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../utils/format'
import type { Tenant, Category, Product } from '../types'

export default function Menu() {
  const { slug } = useParams<{ slug: string }>()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!slug) return
    const load = async () => {
      const { data: t } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .eq('active', true)
        .single()

      if (!t) { setNotFound(true); setLoading(false); return }
      setTenant(t as Tenant)

      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from('categories').select('*').eq('tenant_id', t.id).eq('active', true).order('sort_order'),
        supabase.from('products').select('*, category:categories(*)')
          .eq('tenant_id', t.id).eq('available', true).order('sort_order').order('name'),
      ])

      setCategories((cats ?? []) as Category[])
      setProducts((prods ?? []) as Product[])
      setLoading(false)
    }
    load()
  }, [slug])

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

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
        <span className="text-slate-500 text-sm">Carregando cardápio…</span>
      </div>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <Utensils size={48} className="text-slate-300 mb-4" />
      <h1 className="text-2xl font-bold text-slate-700">Cardápio não encontrado</h1>
      <p className="text-slate-500 mt-2">Verifique o QR Code ou link e tente novamente.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
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
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-8">
        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar no cardápio…"
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white shadow-lg border-0 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
          />
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-thin mb-6">
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeCategory === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 shadow-sm'}`}>
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeCategory === cat.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 shadow-sm'}`}>
                <span>{cat.icon}</span>
                {cat.name}
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
                  {prods.map(product => (
                    <div key={product.id} className="bg-white rounded-2xl shadow-sm overflow-hidden flex">
                      <div className="flex-1 p-4">
                        <h3 className="font-semibold text-slate-800">{product.name}</h3>
                        {product.description && (
                          <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{product.description}</p>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-lg font-bold text-indigo-600">{formatCurrency(product.price)}</span>
                          {product.preparation_time > 0 && (
                            <span className="text-xs text-slate-400">{product.preparation_time} min</span>
                          )}
                        </div>
                      </div>
                      {product.image_url && (
                        <div className="w-28 flex-shrink-0">
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}

        <div className="text-center py-8 text-slate-400 text-xs">
          <p>Cardápio digital por <span className="font-semibold text-indigo-400">MesaFlow</span></p>
        </div>
      </div>
    </div>
  )
}
