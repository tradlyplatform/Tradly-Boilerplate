import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGetCartQuery } from '@/state/cart/api'
import { useDeleteCartItemMutation, useClearCartMutation } from '@/state/cart/api'
import Layout from '../components/Layout'

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

  if (isLoading) return <Layout><div style={s.center}>Loading cart…</div></Layout>
  if (isError) return <Layout><div style={s.error}>Failed to load cart.</div></Layout>

  return (
    <Layout>
      {toast && <div style={s.toast}>{toast}</div>}

      <h1 style={s.pageTitle}>Your cart</h1>

      {items.length === 0 ? (
        <div style={s.emptyState}>
          <p style={{ fontSize: 16, color: '#888', marginBottom: 20 }}>Your cart is empty.</p>
          <button onClick={() => navigate('/')} style={s.shopBtn}>Browse listings</button>
        </div>
      ) : (
        <div style={s.layout}>
          {/* Items */}
          <div style={s.itemsCol}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 14, color: '#888' }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
              <button onClick={handleClear} disabled={isClearing} style={s.clearBtn}>
                {isClearing ? 'Clearing…' : 'Clear cart'}
              </button>
            </div>

            <div style={s.itemList}>
              {items.map(item => (
                <div key={item.id} style={s.itemCard}>
                  {/* Image */}
                  <div style={s.itemImgWrap}>
                    {item.listing.images[0]
                      ? <img src={item.listing.images[0]} alt={item.listing.title} style={s.itemImg} />
                      : <div style={s.imgPlaceholder} />
                    }
                  </div>

                  {/* Info */}
                  <div style={s.itemInfo}>
                    <p style={s.itemSeller}>{item.listing.account?.name ?? 'Unknown seller'}</p>
                    <p style={s.itemTitle}>{item.listing.title}</p>
                    {item.variant && <p style={s.itemVariant}>{item.variant.name}</p>}
                    <div style={s.itemPriceRow}>
                      <span style={s.itemUnitPrice}>{item.listing.offer_price.formatted}</span>
                      <span style={s.itemQty}>× {item.quantity}</span>
                      <span style={s.itemTotal}>{item.quantity_total_offer_price.formatted}</span>
                    </div>
                  </div>

                  {/* Remove */}
                  <button onClick={() => handleDelete(item.listing.id)} disabled={isDeleting} style={s.removeBtn} title="Remove">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <div style={s.summaryCard}>
              <h2 style={s.summaryTitle}>Order summary</h2>

              {priceRows.map((row, i) => (
                <div key={i} style={s.priceRow}>
                  <span style={s.priceLabel}>{row.name}</span>
                  <span style={s.priceValue}>{row.buying.formatted}</span>
                </div>
              ))}

              <div style={s.divider} />

              <div style={{ ...s.priceRow, fontWeight: 700 }}>
                <span style={{ fontSize: 16 }}>Total</span>
                <span style={{ fontSize: 18, color: '#111' }}>{summary.grand_total.formatted}</span>
              </div>

              <button style={s.checkoutBtn}>
                Proceed to checkout
              </button>

              <button onClick={() => navigate('/')} style={s.continueBtn}>
                Continue shopping
              </button>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}

const s: Record<string, React.CSSProperties> = {
  center: { textAlign: 'center', padding: 80, color: '#888', fontSize: 15 },
  error: { textAlign: 'center', padding: 80, color: '#b91c1c', fontSize: 14 },
  toast: { position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 24px', borderRadius: 24, fontSize: 14, zIndex: 1000 },
  pageTitle: { fontSize: 26, fontWeight: 700, color: '#111', marginBottom: 28 },
  emptyState: { textAlign: 'center', padding: '60px 0' },
  shopBtn: { padding: '12px 28px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  layout: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' },
  itemsCol: {},
  clearBtn: { background: 'none', border: '1px solid #fecaca', color: '#ef4444', borderRadius: 6, padding: '4px 14px', cursor: 'pointer', fontSize: 13 },
  itemList: { display: 'flex', flexDirection: 'column', gap: 12 },
  itemCard: { background: '#fff', borderRadius: 10, padding: '16px', display: 'flex', gap: 14, alignItems: 'flex-start', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  itemImgWrap: { width: 80, height: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#f0f0f0' },
  itemImg: { width: '100%', height: '100%', objectFit: 'cover' },
  imgPlaceholder: { width: '100%', height: '100%', background: '#e5e5e5' },
  itemInfo: { flex: 1 },
  itemSeller: { margin: '0 0 2px', fontSize: 11, color: '#888' },
  itemTitle: { margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#111' },
  itemVariant: { margin: '0 0 8px', fontSize: 12, color: '#888' },
  itemPriceRow: { display: 'flex', alignItems: 'center', gap: 8 },
  itemUnitPrice: { fontSize: 13, color: '#555' },
  itemQty: { fontSize: 13, color: '#888' },
  itemTotal: { fontSize: 14, fontWeight: 700, color: '#111', marginLeft: 'auto' },
  removeBtn: { background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, padding: 4, flexShrink: 0 },
  summaryCard: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', position: 'sticky', top: 24 },
  summaryTitle: { fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 20 },
  priceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  priceLabel: { fontSize: 14, color: '#555' },
  priceValue: { fontSize: 14, color: '#111' },
  divider: { height: 1, background: '#e5e5e5', margin: '16px 0' },
  checkoutBtn: { width: '100%', marginTop: 20, padding: '13px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  continueBtn: { width: '100%', marginTop: 10, padding: '11px', background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
}
