import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useGetListingsQuery } from "@/state/listing/api";
import { useGetCartQuery } from "@/state/cart/api";
import { useAuthSelector } from "@/state/auth/selectors";
import Layout from "../components/Layout";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Search, ShoppingCart, Heart, ArrowRight } from "lucide-react";
import type { Listing } from "@/types/listing.types";

function ListingCard({ listing }: { listing: Listing }) {
  const image = listing.images[0];

  return (
    <Link to={`/listing/${listing.slug}`} className="block group">
      <div className="card-product">
        {/* Image */}
        <div className="aspect-square overflow-hidden bg-coffee-secondary/20 relative">
          {image ? (
            <img
              src={image}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              No image
            </div>
          )}
          {listing.offer_percent > 0 && (
            <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs">
              {listing.offer_percent}% off
            </Badge>
          )}
          {listing.liked && (
            <span className="absolute top-2 right-2 text-destructive">
              <Heart className="h-4 w-4 fill-current" />
            </span>
          )}
          {listing.in_cart && (
            <div className="absolute bottom-2 right-2">
              <Badge className="bg-green-600 text-white text-[10px]">In cart</Badge>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-xs text-muted-foreground mb-1">{listing.account?.name}</p>
          <h3 className="font-display text-sm font-semibold text-foreground mb-2 line-clamp-2 leading-snug">
            {listing.title}
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-bold text-coffee-accent">
                {listing.offer_price?.formatted}
              </span>
              {listing.offer_percent > 0 && (
                <span className="text-xs text-muted-foreground line-through">
                  {listing.list_price?.formatted}
                </span>
              )}
            </div>
            <Button size="sm" className="btn-hero h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              <ShoppingCart className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ListingCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <Skeleton className="aspect-square w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const isAuthenticated = useAuthSelector(s => s.isAuthenticated);

  const { data, isLoading, isFetching, isError } = useGetListingsQuery({
    page,
    limit: 20,
    ...(search ? { search_key: search } : {}),
  });

  // Prefetch cart so header count is populated
  useGetCartQuery(undefined, { skip: !isAuthenticated });

  const listings = data?.listings ?? [];
  const totalRecords = data?.total_records ?? 0;
  const totalPages = Math.ceil(totalRecords / 20);

  return (
    <Layout className="py-8">
      {/* Hero strip */}
      <div className="gradient-warm rounded-2xl px-8 py-10 mb-10 text-center">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
          Discover Amazing Products
        </h1>
        <p className="text-subtitle mb-6 max-w-xl mx-auto">
          Browse our curated marketplace and find exactly what you're looking for.
        </p>
        {/* Search */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Search listings…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* States */}
      {isError && (
        <p className="text-center text-destructive py-12 text-sm">Failed to load listings.</p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => <ListingCardSkeleton key={i} />)
          : listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
      </div>

      {!isLoading && listings.length === 0 && !isError && (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-sm">No listings found.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-12">
          <Button
            variant="outline"
            className="btn-secondary"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            className="btn-secondary"
            disabled={page >= totalPages || isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </Layout>
  );
}
