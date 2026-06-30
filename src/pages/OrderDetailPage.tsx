import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetOrderDetailQuery } from "@/state/orders/api";
import Layout from "../components/Layout";
import { Button } from "@/src/components/ui/button";
import { Separator } from "@/src/components/ui/separator";
import { ArrowLeft } from "lucide-react";

const STATUS_LABEL: Record<number, string> = {
  1: "Pending", 2: "Confirmed", 3: "Processing", 4: "Ready to ship",
  5: "Shipped", 6: "Delivered", 7: "Completed", 8: "Cancelled",
  9: "Refunded", 10: "Failed",
};
const STATUS_CLS: Record<number, string> = {
  1: "bg-yellow-100 text-yellow-800",
  2: "bg-blue-100 text-blue-800",
  3: "bg-sky-100 text-sky-800",
  4: "bg-purple-100 text-purple-800",
  5: "bg-purple-100 text-purple-800",
  6: "bg-green-100 text-green-800",
  7: "bg-green-100 text-green-800",
  8: "bg-red-100 text-red-800",
  9: "bg-muted text-muted-foreground",
  10: "bg-red-100 text-red-800",
};
const SHIPMENT_STATUS: Record<number, string> = {
  1: "Pending", 2: "Picked up", 3: "In transit", 4: "Delivered", 5: "Returned",
};

function StatusBadge({ status }: { status: number }) {
  const cls = STATUS_CLS[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {STATUS_LABEL[status] ?? `Status ${status}`}
    </span>
  );
}

export default function OrderDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useGetOrderDetailQuery(id, { skip: !id });

  if (isLoading) return <Layout><div className="text-center py-20 text-muted-foreground text-sm">Loading order…</div></Layout>;
  if (isError || !data) return <Layout><div className="text-center py-20 text-destructive text-sm">Order not found.</div></Layout>;

  const { order } = data;
  const items: any[] = (order as any).order_details ?? [];
  const shipments: any[] = (order as any).shipments ?? [];
  const shippingAddress = (order as any).shipping_address;
  const grandTotal = (order as any).customer_pricing?.grand_total;
  const offerTotal = (order as any).offer_total;
  const shippingTotal = (order as any).shipping_total;
  const taxTotal = (order as any).tax_total;
  const paymentMethod = (order as any).payment_method;
  const customerPricing: any[] = (order as any).customer_pricing?.items ?? [];
  const orderType: string = (order as any).type ?? "";
  const isScheduled = orderType === "events" || orderType === "appointments";

  return (
    <Layout>
      {/* Header */}
      <div className="flex justify-between items-center mb-7">
        <Button variant="ghost" size="sm" onClick={() => navigate("/orders")} className="text-coffee-accent gap-1.5 pl-0 hover:bg-transparent hover:text-coffee-primary">
          <ArrowLeft className="h-4 w-4" />
          Orders
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-foreground">#{(order as any).order_reference}</span>
          <StatusBadge status={(order as any).order_status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        {/* Main column */}
        <div className="flex flex-col gap-5">
          {/* Items */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-display text-base font-bold text-foreground mb-5">Items</h2>
            <div className="flex flex-col gap-5">
              {items.map((item: any) => (
                <div key={item.id} className="flex gap-4 items-start">
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-coffee-secondary/20">
                    {item.listing?.images?.[0]
                      ? <img src={item.listing.images[0]} alt={item.listing.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-muted" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground mb-1">{item.listing?.title ?? `Item #${item.listing_id}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.offer_price?.formatted ?? item.list_price?.formatted} × {item.quantity}
                    </p>
                    {isScheduled && item.schedule_start_at && (
                      <p className="text-[11px] text-coffee-accent font-medium mt-1">
                        📅 {new Date(item.schedule_start_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        {" · "}
                        {new Date(item.schedule_start_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        {item.schedule_end_at && <> – {new Date(item.schedule_end_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</>}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-foreground flex-shrink-0">
                    {item.offer_price?.formatted ?? item.list_price?.formatted}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Shipments */}
          {shipments.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-display text-base font-bold text-foreground mb-4">Shipments</h2>
              {shipments.map((shipment: any) => (
                <div key={shipment.id} className="flex flex-col gap-2 mb-4 last:mb-0">
                  {[
                    ['Seller', shipment.account?.name],
                    ['Status', SHIPMENT_STATUS[shipment.status] ?? `Status ${shipment.status}`],
                    ['Method', shipment.shipping_method?.name ?? '—'],
                    ...(shipment.tracking?.tracking_number ? [['Tracking', shipment.tracking.tracking_number]] : []),
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-foreground font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Delivery address */}
          {shippingAddress?.address_line_1 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-display text-base font-bold text-foreground mb-4">Delivery address</h2>
              <div className="text-sm text-foreground space-y-0.5">
                {shippingAddress.name && <p className="font-medium">{shippingAddress.name}</p>}
                <p className="text-muted-foreground">{shippingAddress.address_line_1}</p>
                {shippingAddress.address_line_2 && <p className="text-muted-foreground">{shippingAddress.address_line_2}</p>}
                <p className="text-muted-foreground">{[shippingAddress.city, shippingAddress.state, shippingAddress.post_code].filter(Boolean).join(", ")}</p>
                <p className="text-muted-foreground">{shippingAddress.country}</p>
                {shippingAddress.phone_number && <p className="text-muted-foreground">{shippingAddress.phone_number}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Summary sidebar */}
        <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
          <h2 className="font-display text-base font-bold text-foreground mb-5">Summary</h2>

          <div className="space-y-2">
            {customerPricing.length > 0
              ? customerPricing.map((line: any) => (
                  <div key={line.type} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{line.name}</span>
                    <span className="text-foreground">{line.amount?.formatted}</span>
                  </div>
                ))
              : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">{offerTotal?.formatted}</span>
                  </div>
                  {shippingTotal?.amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="text-foreground">{shippingTotal.formatted}</span>
                    </div>
                  )}
                  {taxTotal?.amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="text-foreground">{taxTotal.formatted}</span>
                    </div>
                  )}
                </>
              )
            }
          </div>

          <Separator className="my-4" />

          <div className="flex justify-between items-center font-bold">
            <span className="text-base">Total</span>
            <span className="font-display text-lg text-coffee-accent">{grandTotal?.formatted}</span>
          </div>

          {/* Meta */}
          {(order as any).account && (
            <>
              <Separator className="my-4" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Seller</p>
              <p className="text-sm font-medium text-foreground">{(order as any).account.name}</p>
            </>
          )}

          <Separator className="my-4" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Ordered on</p>
          <p className="text-sm font-medium text-foreground">
            {new Date((order as any).created_at * 1000).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </p>

          {paymentMethod && (
            <>
              <Separator className="my-4" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Payment</p>
              <p className="text-sm font-medium text-foreground">{paymentMethod.name}</p>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
