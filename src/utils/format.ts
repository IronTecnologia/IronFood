export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function timeElapsed(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return 'Agora'
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  return `${hours}h${minutes % 60 > 0 ? `${minutes % 60}min` : ''}`
}

export const ORDER_TYPE_LABEL: Record<string, string> = {
  dine_in: 'Salão',
  delivery: 'Delivery',
  takeout: 'Retirada',
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Pronto',
  delivered: 'Entregue',
  paid: 'Pago',
  cancelled: 'Cancelado',
}

export const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Dinheiro',
  credit_card: 'Cartão Crédito',
  debit_card: 'Cartão Débito',
  pix: 'PIX',
  other: 'Outro',
}

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  waiter: 'Garçom',
  kitchen: 'Cozinha',
  bar: 'Bar',
  cashier: 'Caixa',
}

export const TABLE_STATUS_LABEL: Record<string, string> = {
  available: 'Disponível',
  occupied: 'Ocupada',
  reserved: 'Reservada',
  cleaning: 'Limpeza',
}
