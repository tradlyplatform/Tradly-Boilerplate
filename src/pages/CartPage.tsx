import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGetCartQuery, useDeleteCartItemMutation, useClearCartMutation } from '@/state/cart/api'
import Layout from '../components/Layout'
import { Button } from '@/src/components/ui/button'
import { Separator } from '@/src/components/ui/separator'
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react'

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-full text-sm font-medium shadow-xl z-50">
      {msg}
    </div>
  )
}

export default function CartPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useGetCartQuery()
  const [deleteCartItem, { isLoading: isDeleting }] = useDeleteCartItemMutation()
  const [clearCart, { isLoading: isClearing }] = useClearCartMutation()

  const [toast, setToast] = useState('')
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const items = data?.cart_details ?? []
  const summary = data?.cart ?? null
  const priceRows = summary?.pricing_items?.filter(p => p.display) ?? []

  const handleDelete = async (listingId: number) => {
    const result = await deleteCartItem({ listing_id: listingId })
    if ('error' in result) showToast('Failed to remove item')
  }

  const handleClear = async () => {
    const result = await clearCart()
    if ('error' in result) showToast('Failed to clear cart')
  }

  if (isLoading) return <Layout><div className="text-center py-20 text-muted-foreground text-sm">Loading cart…</div></Layout>
  if (isError) return <Layout><div className="text-center py-20 text-destructive text-sm">Failed to load cart.</div></Layout>

  return (
    <Layout>
      {toast && <Toast msg={toast} />}

      <h1 className="font-display text-2xl font-bold text-foreground mb-7">Your cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center gap-4">
          <div className="bg-coffee-secondary/40 rounded-full p-6">
            <ShoppingBag className="h-10 w-10 text-coffee-accent" />
          </div>
          <p className="text-muted-foreground">Your cart is empty.</p>
          <Button onClick={() => navigate('/')} className="btn-hero">Browse listings</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
          {/* Items */}
          <div>
            <div className="flex justify-between items-center mb-5">
              <span className="text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</span>
              <Button variant="outline" size="sm" onClick={handleClear} disabled={isClearing} className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs h-7">
                {isClearing ? 'Clearing…' : 'Clear cart'}
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {items.map(item => (
                <div key={item.id} className="bg-card border border-border rounded-xl p-4 flex gap-4 items-start">
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-coffee-secondary/20">
                    {item.listing.images[0]
                      ? <img src={item.listing.images[0]} alt={item.listing.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-muted" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground mb-0.5">{item.listing.account?.name ?? 'Unknown seller'}</p>
                    <p className="text-sm font-semibold text-foreground mb-1 line-clamp-2">{item.listing.title}</p>
                    {item.variant && <p className="text-xs text-muted-foreground mb-2">{item.variant.name}</p>}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">{item.listing.offer_price.formatted}</span>
                      <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                      <span className="text-sm font-bold text-foreground ml-auto">{item.quantity_total_offer_price.formatted}</span>
                    </div>
                  </div>

                  <button onClick={() => handleDelete(item.listing.id)} disabled={isDeleting} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
              <h2 className="font-display text-lg font-bold text-foreground mb-5">Order summary</h2>

              <div className="space-y-3">
                {priceRows.map((row, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{row.name}</span>
                    <span className="text-foreground">{row.buying.formatted}</span>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between items-center font-bold">
                <span className="text-base">Total</span>
                <span className="font-display text-lg text-coffee-accent">{summary.grand_total.formatted}</span>
              </div>

              <Button onClick={() => navigate("/checkout")} className="btn-hero w-full mt-5">
                Proceed to checkout <ArrowRight className="h-4 w-4 ml-1" />
              </Button>

              <Button variant="outline" onClick={() => navigate('/')} className="btn-secondary w-full mt-3">
                Continue shopping
              </Button>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
