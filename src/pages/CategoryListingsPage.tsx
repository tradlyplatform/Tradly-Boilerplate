import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useGetCategoryBySlugQuery, useGetCategoryListingsQuery } from '@/state/categories/api'
import { useLikeListingMutation, useUnlikeListingMutation } from '@/state/listing/api'
import { useAuthSelector } from '@/state/auth/selectors'
import Layout from '../components/Layout'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { Heart } from 'lucide-react'

function getCategorySlug(category: { id: string | number; name: string; slug?: string }): string {
  return category.slug ?? `${category.id}-${String(category.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-full text-sm font-medium shadow-xl z-50">
      {msg}
    </div>
  )
}

export default function CategoryListingsPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const isAuthenticated = useAuthSelector(s => s.isAuthenticated)

  const [page, setPage] = useState(1)
  const [toast, setToast] = useState('')
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => { setPage(1) }, [slug])

  const { data: catData, isLoading: catLoading, isError: catError } =
    useGetCategoryBySlugQuery(slug, { skip: !slug })

  const category = catData?.category

  useEffect(() => {
    if (!catLoading && catError) navigate('/', { replace: true })
  }, [catLoading, catError])

  const { data: listData, isLoading: listLoading, isFetching } =
    useGetCategoryListingsQuery(
      { category_id: category?.id ?? 0, page },
      { skip: !category?.id },
    )

  const [likeListing, { isLoading: isLiking }] = useLikeListingMutation()
  const [unlikeListing, { isLoading: isUnliking }] = useUnlikeListingMutation()

  const handleLike = async (listingId: number, liked: boolean) => {
    if (!isAuthenticated) { navigate('/sign-in'); return }
    if (isLiking || isUnliking) return
    const result = liked
      ? await unlikeListing({ id: listingId })
      : await likeListing({ id: listingId })
    if ('error' in result) showToast('Failed to update like')
  }

  const listings = listData?.listings ?? []
  const totalPages = Math.ceil((listData?.total_records ?? 0) / 30)
  const currentPage = listData?.page ?? page

  if (catLoading) return <Layout><div className="text-center py-20 text-muted-foreground text-sm">Loading…</div></Layout>
  if (!category) return null

  return (
    <Layout>
      {toast && <Toast msg={toast} />}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 flex-wrap mb-5 text-sm">
        <Link to="/" className="text-coffee-accent hover:underline">Home</Link>
        {category.hierarchy?.map(item => (
          <React.Fragment key={item.id}>
            <span className="text-muted-foreground">›</span>
            <Link to={`/lc/${getCategorySlug(item as { id: string | number; name: string; slug?: string })}`} className="text-coffee-accent hover:underline">
              {item.name}
            </Link>
          </React.Fragment>
        ))}
        <span className="text-muted-foreground">›</span>
        <span className="text-foreground font-medium">{category.name}</span>
      </div>

      {/* Category header */}
      <div className="flex items-center gap-4 mb-6">
        {category.image && (
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
            <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">{category.name}</h1>
          {category.description && <p className="text-sm text-muted-foreground leading-relaxed">{category.description}</p>}
        </div>
      </div>

      {/* Subcategory chips */}
      {(category.sub_category?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {category.sub_category!.map(sub => (
            <Link
              key={sub.id}
              to={`/lc/${getCategorySlug(sub as { id: string | number; name: string; slug?: string })}`}
              className="px-4 py-1.5 rounded-full border border-border bg-card text-sm text-foreground font-medium hover:bg-coffee-secondary/40 transition-colors"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="flex justify-between items-center mb-5">
        {listData?.total_records != null && (
          <span className="text-sm text-muted-foreground">{listData.total_records} listing{listData.total_records !== 1 ? 's' : ''}</span>
        )}
        {isFetching && <span className="text-xs text-muted-foreground">Loading…</span>}
      </div>

      {/* Grid */}
      {listLoading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Loading listings…</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No listings in this category yet.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {listings.map(listing => (
            <Link key={listing.id} to={`/listing/${listing.slug}`} className="block group">
              <div className="card-product">
                <div className="aspect-square overflow-hidden bg-coffee-secondary/20 relative">
                  {listing.images[0]
                    ? <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    : <div className="w-full h-full bg-muted" />
                  }
                  {listing.offer_percent > 0 && (
                    <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px]">
                      {listing.offer_percent}% off
                    </Badge>
                  )}
                  {listing.stock === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-foreground/60 text-background text-[11px] text-center py-1">
                      Out of stock
                    </div>
                  )}
                  <button
                    className="absolute top-2 right-2 bg-background/80 rounded-full w-7 h-7 flex items-center justify-center text-destructive transition-opacity"
                    onClick={e => { e.preventDefault(); handleLike(listing.id, listing.liked) }}
                    disabled={isLiking || isUnliking}
                  >
                    <Heart className={`h-3.5 w-3.5 ${listing.liked ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="p-3">
                  <p className="text-[11px] text-muted-foreground mb-0.5">{listing.account.name}</p>
                  <p className="text-xs font-semibold text-foreground mb-1.5 line-clamp-2 leading-snug">{listing.title}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-display text-sm font-bold text-coffee-accent">{listing.offer_price.formatted}</span>
                    {listing.offer_percent > 0 && (
                      <span className="text-[11px] text-muted-foreground line-through">{listing.list_price.formatted}</span>
                    )}
                  </div>
                  {listing.rating_data?.rating_average > 0 && (
                    <p className="text-[11px] text-yellow-500 font-semibold mt-1">
                      ★ {listing.rating_data.rating_average.toFixed(1)}
                      <span className="text-muted-foreground font-normal"> ({listing.rating_data.review_count})</span>
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-10">
          <Button variant="outline" className="btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>← Prev</Button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" className="btn-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>Next →</Button>
        </div>
      )}
    </Layout>
  )
}
