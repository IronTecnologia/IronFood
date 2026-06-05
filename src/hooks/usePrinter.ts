import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Order, Tenant } from '../types'

export function usePrinter() {
  const [printing, setPrinting] = useState(false)
  const [printers, setPrinters] = useState<string[]>([])

  async function getPrinterConfig(tenantId: string) {
    const { data } = await supabase
      .from('printer_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()
    return data
  }

  async function detectPrinters() {
    if (!navigator.permissions || !('query' in navigator.permissions)) {
      console.log('Printer detection not available')
      return []
    }
    try {
      const devices = await (navigator.mediaDevices as any)?.enumerateDevices?.() || []
      const printerDevices = devices
        .filter((d: any) => d.kind === 'printer')
        .map((d: any) => d.label || d.deviceId)
      setPrinters(printerDevices)
      return printerDevices
    } catch (err) {
      console.log('Printer detection skipped:', err)
      return []
    }
  }

  function formatOrderReceipt(order: Order, tenant: Tenant): string {
    const lines: string[] = []
    const width = 32

    lines.push('='.repeat(width))
    lines.push(center(tenant.name || 'ESTABELECIMENTO', width))
    if (tenant.address) lines.push(center(tenant.address, width))
    if (tenant.phone) lines.push(center(tenant.phone, width))
    lines.push('='.repeat(width))

    lines.push('')
    lines.push(`PEDIDO #${order.order_number}`)
    lines.push(`${new Date(order.created_at).toLocaleString('pt-BR')}`)

    if (order.order_type === 'dine_in' && order.table?.number) {
      lines.push(`Mesa: ${order.table.number}`)
    } else if (order.order_type === 'delivery' || order.order_type === 'takeout') {
      lines.push(`${order.order_type === 'delivery' ? 'ENTREGA' : 'RETIRADA'}`)
      if (order.customer_name) lines.push(`Cliente: ${order.customer_name}`)
      if (order.delivery_address) {
        lines.push(`End: ${order.delivery_address}`)
        if (order.delivery_area?.name) lines.push(`Bairro: ${order.delivery_area.name}`)
      }
    }

    lines.push('-'.repeat(width))
    lines.push('ITENS')
    lines.push('-'.repeat(width))

    order.items?.forEach(item => {
      const itemLine = `${item.quantity}x ${item.product_name}`
      lines.push(itemLine.substring(0, width))
      lines.push(`${formatCurrency(item.total_price).padStart(width)}`)

      if (item.addons && item.addons.length > 0) {
        item.addons.forEach(addon => {
          lines.push(`  + ${addon.name}`)
        })
      }
    })

    lines.push('-'.repeat(width))
    lines.push(`Subtotal: ${formatCurrency(order.subtotal).padStart(width - 10)}`)
    if (order.discount > 0) {
      lines.push(`Desconto: -${formatCurrency(order.discount).padStart(width - 11)}`)
    }
    if (order.tax > 0) {
      lines.push(`Taxa: ${formatCurrency(order.tax).padStart(width - 7)}`)
    }
    lines.push('='.repeat(width))
    lines.push(`TOTAL: ${formatCurrency(order.total).padStart(width - 8)}`)
    lines.push('='.repeat(width))

    if (order.notes) {
      lines.push('OBSERVAÇÕES:')
      lines.push(order.notes.substring(0, width))
    }

    lines.push('')
    lines.push(center('Obrigado!', width))
    lines.push('')

    return lines.join('\n')
  }

  async function printOrder(order: Order, tenant: Tenant) {
    setPrinting(true)
    try {
      const config = await getPrinterConfig(tenant.id)

      if (!config || config.method === 'kds') {
        console.log('Using KDS - order will appear on Kitchen Display System')
      } else if (config.method === 'printer') {
        const receipt = formatOrderReceipt(order, tenant)

        const printWindow = window.open('', '', 'width=800,height=600')
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Pedido #${order.order_number}</title>
                <style>
                  body { font-family: 'Courier New', monospace; margin: 0; padding: 10px; }
                  pre { white-space: pre-wrap; word-wrap: break-word; margin: 0; }
                </style>
              </head>
              <body>
                <pre>${escapeHtml(receipt)}</pre>
              </body>
            </html>
          `)
          printWindow.document.close()
          setTimeout(() => {
            printWindow.print()
            printWindow.close()
          }, 100)
        }
      }
    } catch (err) {
      console.error('Print error:', err)
    } finally {
      setPrinting(false)
    }
  }

  return { printing, printers, detectPrinters, getPrinterConfig, printOrder }
}

function center(text: string, width: number): string {
  const padding = Math.max(0, width - text.length)
  const left = Math.floor(padding / 2)
  const right = padding - left
  return ' '.repeat(left) + text + ' '.repeat(right)
}

function formatCurrency(value: number): string {
  return `R$ ${(value / 100).toFixed(2)}`.replace('.', ',')
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
