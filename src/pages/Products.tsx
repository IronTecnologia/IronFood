import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, ImageIcon, Tag, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Card, Button, Badge, Modal, Input, Select, Textarea, Spinner, EmptyState } from '../components/ui'
import { formatCurrency } from '../utils/format'
import type { Product, Category, ProductType, Addon } from '../types'

const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  food: 'Comida', beverage: 'Bebida', combo: 'Combo', other: 'Outro',
}

export default function Products() {
  const tenant = useAuthStore(s => s.tenant)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [editing, setEditing] = useState<Product | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [showAddonModal, setShowAddonModal] = useState(false)

  useEffect(() => {
    if (!tenant) return
    loadData()
  }, [tenant])

  async function loadData() {
    if (!tenant) return
    try {
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase.from('products').select('*, category:categories(*)').eq('tenant_id', tenant.id).order('sort_order').order('name'),
        supabase.from('categories').select('*').eq('tenant_id', tenant.id).eq('active', true).order('sort_order'),
      ])
      setProducts((prods ?? []) as Product[])
      setCategories((cats ?? []) as Category[])
    } finally {
      setLoading(false)
    }
  }

  async function toggleAvailable(id: string, current: boolean) {
    await supabase.from('products').update({ available: !current }).eq('id', id)
    setProducts(p => p.map(x => x.id === id ? { ...x, available: !current } : x))
  }

  async function deleteProduct(id: string) {
    if (!confirm('Excluir este produto?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(p => p.filter(x => x.id !== id))
  }

  const filtered = products
    .filter(p => catFilter === 'all' || p.category_id === catFilter)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="flex justify-center pt-20"><Spinner size={32} /></div>

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar produto…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="all">Todas Categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<Tag size={14} />} onClick={() => setShowAddonModal(true)}>
            Adicionais
          </Button>
          <Button variant="outline" size="sm" leftIcon={<Tag size={14} />} onClick={() => setShowCatModal(true)}>
            Categorias
          </Button>
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => { setEditing(null); setShowModal(true) }}>
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <EmptyState icon={<ImageIcon size={40} />} title="Nenhum produto encontrado" description="Crie seu primeiro produto pelo botão acima" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(product => (
            <Card key={product.id} className="overflow-hidden">
              {/* Image */}
              <div className="relative h-40 bg-slate-100">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ImageIcon size={32} />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => toggleAvailable(product.id, product.available)}
                    className="p-1.5 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                    title={product.available ? 'Disponível — clique para ocultar' : 'Indisponível — clique para ativar'}
                  >
                    {product.available
                      ? <ToggleRight size={16} className="text-emerald-500" />
                      : <ToggleLeft size={16} className="text-slate-400" />
                    }
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-slate-800 text-sm leading-tight">{product.name}</h3>
                  <span className="text-base font-bold text-indigo-600 flex-shrink-0">
                    {formatCurrency(product.price)}
                  </span>
                </div>

                {product.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-2">{product.description}</p>
                )}

                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  {product.category && (
                    <Badge variant="default" className="text-[10px]" style={{ backgroundColor: `${product.category.color}20`, color: product.category.color }}>
                      {product.category.icon} {product.category.name}
                    </Badge>
                  )}
                  <Badge variant={product.product_type === 'beverage' ? 'info' : 'default'} className="text-[10px]">
                    {PRODUCT_TYPE_LABEL[product.product_type]}
                  </Badge>
                  {!product.available && <Badge variant="danger" className="text-[10px]">Indisponível</Badge>}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" leftIcon={<Pencil size={12} />}
                    onClick={() => { setEditing(product); setShowModal(true) }}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteProduct(product.id)}>
                    <Trash2 size={14} className="text-rose-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ProductModal
        open={showModal}
        onClose={() => setShowModal(false)}
        product={editing}
        categories={categories}
        tenantId={tenant?.id ?? ''}
        onSaved={loadData}
      />

      <CategoryModal
        open={showCatModal}
        onClose={() => setShowCatModal(false)}
        categories={categories}
        tenantId={tenant?.id ?? ''}
        onSaved={loadData}
      />

      <AddonManagerModal
        open={showAddonModal}
        onClose={() => setShowAddonModal(false)}
        categories={categories}
        tenantId={tenant?.id ?? ''}
      />
    </div>
  )
}

// ──────────────────────────────────────────
// Product Modal
// ──────────────────────────────────────────
function ProductModal({ open, onClose, product, categories, tenantId, onSaved }: {
  open: boolean; onClose: () => void; product: Product | null
  categories: Category[]; tenantId: string; onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [productType, setProductType] = useState<ProductType>('food')
  const [prepTime, setPrepTime] = useState('15')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (product) {
      setName(product.name)
      setDescription(product.description ?? '')
      setPrice(product.price.toString())
      setCategoryId(product.category_id ?? '')
      setProductType(product.product_type)
      setPrepTime(product.preparation_time.toString())
      setImagePreview(product.image_url ?? '')
    } else {
      setName(''); setDescription(''); setPrice(''); setCategoryId('')
      setProductType('food'); setPrepTime('15'); setImagePreview('')
    }
    setImageFile(null)
  }, [product, open])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function save() {
    if (!name || !price) return
    setSaving(true)
    let imageUrl = product?.image_url

    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${tenantId}/${Date.now()}.${ext}`
      const { data } = await supabase.storage.from('product-images').upload(path, imageFile, { upsert: true })
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(data.path)
        imageUrl = publicUrl
      }
    }

    const payload = {
      tenant_id: tenantId, name, description, price: parseFloat(price),
      category_id: categoryId || null, product_type: productType,
      preparation_time: parseInt(prepTime), image_url: imageUrl,
    }

    if (product) {
      await supabase.from('products').update(payload).eq('id', product.id)
    } else {
      await supabase.from('products').insert(payload)
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={product ? 'Editar Produto' : 'Novo Produto'} maxWidth="max-w-xl">
      <div className="space-y-4">
        {/* Image */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
            {imagePreview ? (
              <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <ImageIcon size={24} />
              </div>
            )}
          </div>
          <label className="cursor-pointer">
            <span className="text-sm text-indigo-600 font-medium hover:underline">Escolher imagem</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Nome do produto" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Classic Burger" />
          </div>
          <Input label="Preço (R$)" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="29.90" />
          <Input label="Tempo preparo (min)" type="number" value={prepTime} onChange={e => setPrepTime(e.target.value)} />
          <Select label="Categoria" value={categoryId} onChange={e => setCategoryId(e.target.value)}
            options={[{ value:'',label:'Sem categoria' }, ...categories.map(c => ({ value:c.id, label:`${c.icon} ${c.name}` }))]} />
          <Select label="Tipo" value={productType} onChange={e => setProductType(e.target.value as ProductType)}
            options={[
              { value:'food', label:'Comida' },
              { value:'beverage', label:'Bebida' },
              { value:'combo', label:'Combo' },
              { value:'other', label:'Outro' },
            ]} />
          <div className="col-span-2">
            <Textarea label="Descrição" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição do produto…" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={saving} onClick={save}>{product ? 'Salvar' : 'Criar Produto'}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ──────────────────────────────────────────
// Category Modal
// ──────────────────────────────────────────
function CategoryModal({ open, onClose, categories, tenantId, onSaved }: {
  open: boolean; onClose: () => void; categories: Category[]; tenantId: string; onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🍽️')
  const [color, setColor] = useState('#6366f1')
  const [saving, setSaving] = useState(false)

  async function addCategory() {
    if (!name) return
    setSaving(true)
    await supabase.from('categories').insert({ tenant_id: tenantId, name, icon, color })
    setSaving(false)
    setName(''); onSaved()
  }

  async function deleteCategory(id: string) {
    await supabase.from('categories').update({ active: false }).eq('id', id)
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Gerenciar Categorias" >
      <div className="space-y-4">
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {categories.map(c => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium text-slate-700" style={{ color: c.color }}>
                {c.icon} {c.name}
              </span>
              <button onClick={() => deleteCategory(c.id)} className="text-rose-400 hover:text-rose-600">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 space-y-3">
          <p className="text-sm font-medium text-slate-600">Nova categoria</p>
          <div className="flex gap-2">
            <Input value={icon} onChange={e => setIcon(e.target.value)} className="w-14 text-center text-lg" />
            <Input className="flex-1" value={name} onChange={e => setName(e.target.value)} placeholder="Nome da categoria" />
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              className="w-10 h-9 rounded-lg cursor-pointer border border-slate-200" />
          </div>
          <Button loading={saving} onClick={addCategory} size="sm" className="w-full">
            Adicionar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ──────────────────────────────────────────
// Addon Manager Modal
// ──────────────────────────────────────────
function AddonManagerModal({ open, onClose, categories, tenantId }: {
  open: boolean; onClose: () => void; categories: Category[]; tenantId: string
}) {
  const [addons, setAddons] = useState<Addon[]>([])
  const [catFilter, setCatFilter] = useState('all')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Addon | null>(null)

  useEffect(() => {
    if (!open) return
    loadAddons()
    setCatFilter('all')
  }, [open, tenantId])

  async function loadAddons() {
    const { data } = await supabase.from('addons').select('*').eq('tenant_id', tenantId).order('sort_order').order('name')
    setAddons((data ?? []) as Addon[])
  }

  function startEdit(addon: Addon) {
    setEditing(addon)
    setName(addon.name)
    setDescription(addon.description ?? '')
    setPrice(String(addon.price))
    setCategoryId(addon.category_id ?? '')
  }

  function clearForm() {
    setEditing(null)
    setName('')
    setDescription('')
    setPrice('')
    setCategoryId('')
  }

  async function saveAddon() {
    if (!name || !price) return
    setSaving(true)
    const payload = {
      tenant_id: tenantId,
      name,
      description: description || null,
      price: parseFloat(price),
      category_id: categoryId || null,
      available: true,
    }
    if (editing) {
      await supabase.from('addons').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('addons').insert(payload)
    }
    setSaving(false)
    clearForm()
    loadAddons()
  }

  async function deleteAddon(id: string) {
    await supabase.from('addons').delete().eq('id', id)
    setAddons(prev => prev.filter(a => a.id !== id))
  }

  async function toggleAddon(id: string, current: boolean) {
    await supabase.from('addons').update({ available: !current }).eq('id', id)
    setAddons(prev => prev.map(a => a.id === id ? { ...a, available: !current } : a))
  }

  const filtered = addons.filter(a =>
    catFilter === 'all' || (catFilter === '__global__' ? !a.category_id : a.category_id === catFilter)
  )

  return (
    <Modal open={open} onClose={onClose} title="Gerenciar Adicionais" maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {[{ id: 'all', name: 'Todos', icon: '' }, { id: '__global__', name: 'Global', icon: '' }, ...categories].map(c => (
            <button key={c.id} onClick={() => setCatFilter(c.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                catFilter === c.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
              {'color' in c ? `${c.icon} ${c.name}` : c.name}
            </button>
          ))}
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Nenhum adicional cadastrado</p>
          )}
          {filtered.map(a => {
            const cat = categories.find(c => c.id === a.category_id)
            return (
              <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-800">{a.name}</span>
                  {cat && <span className="ml-2 text-xs text-slate-400">{cat.icon} {cat.name}</span>}
                  {!a.category_id && <span className="ml-2 text-xs text-slate-400">Global</span>}
                </div>
                <span className="text-sm font-semibold text-indigo-600 flex-shrink-0">+{formatCurrency(a.price)}</span>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => toggleAddon(a.id, a.available)} className="p-1 hover:bg-slate-200 rounded">
                    {a.available
                      ? <ToggleRight size={16} className="text-emerald-500" />
                      : <ToggleLeft size={16} className="text-slate-400" />}
                  </button>
                  <button onClick={() => startEdit(a)} className="p-1 hover:bg-slate-200 rounded">
                    <Pencil size={14} className="text-slate-500" />
                  </button>
                  <button onClick={() => deleteAddon(a.id)} className="p-1 hover:bg-rose-50 rounded">
                    <Trash2 size={14} className="text-rose-400" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t pt-4 space-y-3">
          <p className="text-sm font-medium text-slate-600">{editing ? 'Editar adicional' : 'Novo adicional'}</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nome" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Bacon extra" className="col-span-2" />
            <Input label="Descrição (opcional)" value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes…" className="col-span-2" />
            <Input label="Preço (R$)" type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="0,00" />
            <div>
              <label className="text-sm font-medium text-slate-600 block mb-1.5">Categoria</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">Global (todos os produtos)</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            {editing && <Button variant="secondary" size="sm" onClick={clearForm}>Cancelar</Button>}
            <Button loading={saving} size="sm" onClick={saveAddon} className="flex-1">
              {editing ? 'Salvar Alterações' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
