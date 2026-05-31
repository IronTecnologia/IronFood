export type UserRole = 'admin' | 'waiter' | 'kitchen' | 'bar' | 'cashier'
export type TenantType = 'restaurant' | 'burger' | 'pizzeria' | 'bar'
export type OrderType = 'dine_in' | 'delivery' | 'takeout'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'paid' | 'cancelled'
export type ItemStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning'
export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'other'
export type ProductType = 'food' | 'beverage' | 'combo' | 'other'
export type ItemStation = 'kitchen' | 'bar'

export interface Tenant {
  id: string
  name: string
  slug: string
  type: TenantType
  logo_url?: string
  address?: string
  phone?: string
  email?: string
  plan: string
  settings: Record<string, unknown>
  active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  tenant_id: string
  full_name: string
  role: UserRole
  avatar_url?: string
  active: boolean
  created_at: string
}

export interface Category {
  id: string
  tenant_id: string
  name: string
  description?: string
  icon: string
  color: string
  sort_order: number
  active: boolean
}

export interface Product {
  id: string
  tenant_id: string
  category_id?: string
  name: string
  description?: string
  price: number
  image_url?: string
  available: boolean
  product_type: ProductType
  preparation_time: number
  sort_order: number
  created_at: string
  category?: Category
}

export interface RestaurantTable {
  id: string
  tenant_id: string
  number: string
  capacity: number
  status: TableStatus
  position_x: number
  position_y: number
  shape: 'square' | 'round' | 'rectangle'
  section: string
  active: boolean
  current_order?: Order
}

export interface Order {
  id: string
  tenant_id: string
  table_id?: string
  user_id?: string
  order_number: string
  order_type: OrderType
  status: OrderStatus
  customer_name?: string
  customer_phone?: string
  delivery_address?: string
  notes?: string
  subtotal: number
  discount: number
  tax: number
  total: number
  payment_method?: PaymentMethod
  paid_amount?: number
  change_amount?: number
  paid_at?: string
  created_at: string
  updated_at: string
  table?: RestaurantTable
  user?: Profile
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  product_id?: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  notes?: string
  status: ItemStatus
  sent_to_station: boolean
  station: ItemStation
  created_at: string
  product?: Product
}

export interface CashRegister {
  id: string
  tenant_id: string
  opened_by?: string
  closed_by?: string
  opening_balance: number
  closing_balance?: number
  expected_balance?: number
  total_sales: number
  total_sangrias: number
  total_suprimentos: number
  difference?: number
  status: 'open' | 'closed'
  opened_at: string
  closed_at?: string
  notes?: string
  opener?: Profile
}

export interface CashTransaction {
  id: string
  register_id: string
  tenant_id: string
  transaction_type: 'sale' | 'sangria' | 'suprimento' | 'adjustment'
  amount: number
  description?: string
  order_id?: string
  user_id?: string
  payment_method?: string
  created_at: string
}
