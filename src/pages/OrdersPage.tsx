import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGetOrdersQuery } from '@/state/orders/api'
import Layout from '../components/Layout'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { Package, ChevronRight } from 'lucide-react'
import type { Order } from '@/types/order.types'

const STATUS_VARIANT: Record<number, string> = {
  1: 'bg-yellow-100 text-yellow-800',
  2: 'bg-blue-100 text-blue-800',
  3: 'bg-sky-100 text-sky-800',
  4: 'bg-purple-100 text-purple-800',
  5: 'bg-purple-100 text-purple-800',
  6: 'bg-green-100 text-green-800',
  7: 'bg-green-100 text-green-800',
  8: 'bg-red-100 text-red-800',
  9: 'bg-muted text-muted-foreground',
  10: 'bg-red-100 text-red-800',
}
const STATUS_LABEL: Record<number, string> = {
  1: 'Pending', 2: 'Confirmed', 3: 'Processing', 4: 'Ready to ship',
  5: 'Shipped', 6: 'Delivered', 7: 'Completed', 8: 'Cancelled',
  9: 'Refunded', 10: 'Failed',
}

function StatusBadge({ status }: { status: number }) {
  const cls = STATUS_VARIANT[status] ?? 'bg-muted text-muted-foreground'
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {STATUS_LABEL[status] ?? `Status ${status}`}
    </span>
  )
}

function OrderCard({ order }: { order: any }) {
  const items: any[] = order.order_details ?? []
  const firstItem = items[0]
  const extraCount = Math.max(0, items.length - 1)
  const grandTotal = order.grand_total ?? order.offer_total

  return (
    <Link to={`/orders/${order.id}`} className="bg-card border border-border rounded-xl p-4 flex gap-4 items-center hover:shadow-md transition-shadow">
      <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-coffee-secondary/20">
        {firstItem?.listing?.images?.[0]
          ? <img src={firstItem.listing.images[0]} alt={firstItem.listing.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-muted" />
        }
        {extraCount > 0 && (
          <div className="absolute bottom-1 right-1 bg-foreground/70 text-background text-[9px] rounded px-1 font-bold">
            +{extraCount}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-bold text-foreground">#{order.order_reference}</span>
          <StatusBadge status={order.order_status} />
        </div>
        <p className="text-sm text-muted-foreground truncate mb-2">
          {firstItem?.listing?.title ?? `Order #${order.reference_number}`}
          {extraCount > 0 ? ` + ${extraCount} more` : ''}
        </p>
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-muted-foreground">
            {new Date(order.created_at * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
          <span className="text-sm font-bold text-foreground">{grandTotal?.formatted ?? '—'}</span>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </Link>
  )
}

export default function OrdersPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, isFetching } = useGetOrdersQuery({ page, limit: 20 })

  const orders = data?.orders ?? []
  const totalPages = Math.ceil((data?.total_records ?? 0) / 20)

  if (isLoading) return <Layout><div className="text-center py-20 text-muted-foreground text-sm">Loading orders…</div></Layout>
  if (isError) return <Layout><div className="text-center py-20 text-destructive text-sm">Failed to load orders.</div></Layout>

  return (
    <Layout>
      <div className="flex justify-between items-center mb-7">
        <h1 className="font-display text-2xl font-bold text-foreground">My orders</h1>
        {isFetching && <span className="text-xs text-muted-foreground">Refreshing…</span>}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center gap-4">
          <div className="bg-coffee-secondary/40 rounded-full p-6">
            <Package className="h-10 w-10 text-coffee-accent" />
          </div>
          <p className="text-muted-foreground">No orders yet.</p>
          <Link to="/">
            <Button className="btn-hero">Browse listings</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {orders.map(order => <OrderCard key={order.id} order={order} />)}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-10">
              <Button variant="outline" className="btn-secondary" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>← Prev</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" className="btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next →</Button>
            </div>
          )}
        </>
      )}
    </Layout>
  )
}
