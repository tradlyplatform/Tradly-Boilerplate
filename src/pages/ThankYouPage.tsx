import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useGetOrderDetailQuery } from "@/state/orders/api";
import Layout from "../components/Layout";
import { Button } from "@/src/components/ui/button";
import { Separator } from "@/src/components/ui/separator";
import { CheckCircle2 } from "lucide-react";

export default function ThankYouPage() {
  const { reference = "" } = useParams<{ reference: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useGetOrderDetailQuery(reference, {
    skip: !reference,
  });
  const order = (data as any)?.order;

  const items: any[] = order?.order_details ?? [];
  const grandTotal = order?.customer_pricing?.grand_total ?? order?.grand_total;
  const shippingAddress = order?.shipping_address;
  const paymentMethod = order?.payment_method;
  const orderType: string = order?.type ?? "";
  const isScheduled = orderType === "events" || orderType === "appointments";

  return (
    <Layout>
      <div className="flex justify-center py-8">
        <div className="w-full max-w-lg">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-lg text-center">
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>

            <h1 className="font-display text-2xl font-bold text-foreground mb-2">Order placed!</h1>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Thank you for your order. We'll send you a confirmation soon.
            </p>

            {reference && (
              <div className="bg-muted rounded-xl px-5 py-3 mb-6 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Order reference</p>
                <p className="font-mono text-sm font-bold text-foreground">{reference}</p>
              </div>
            )}

            {/* Items */}
            {!isLoading && items.length > 0 && (
              <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Your items</p>
                <div className="space-y-3">
                  {items.map((item: any) => (
                    <div key={item.id} className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-coffee-secondary/20">
                        {item.listing?.images?.[0]
                          ? <img src={item.listing.images[0]} alt={item.listing?.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-muted" />
                        }
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-xs font-semibold text-foreground mb-0.5">{item.listing?.title ?? `Item #${item.listing_id}`}</p>
                        <p className="text-[11px] text-muted-foreground">{item.offer_price?.formatted} × {item.quantity}</p>
                        {isScheduled && item.schedule_start_at && (
                          <p className="text-[11px] text-coffee-accent font-medium mt-0.5">
                            📅 {new Date(item.schedule_start_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                            {" · "}
                            {new Date(item.schedule_start_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                            {item.schedule_end_at && <> – {new Date(item.schedule_end_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</>}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {grandTotal && (
                  <>
                    <Separator className="my-3" />
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-muted-foreground">Total paid</span>
                      <span className="font-display text-foreground">{grandTotal.formatted}</span>
                    </div>
                  </>
                )}

                {shippingAddress?.address_line_1 && (
                  <>
                    <Separator className="my-3" />
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Delivering to</p>
                    <p className="text-xs text-foreground">{shippingAddress.name}</p>
                    <p className="text-xs text-muted-foreground">{shippingAddress.address_line_1}</p>
                    {shippingAddress.address_line_2 && <p className="text-xs text-muted-foreground">{shippingAddress.address_line_2}</p>}
                    <p className="text-xs text-muted-foreground">{[shippingAddress.city, shippingAddress.state, shippingAddress.post_code].filter(Boolean).join(", ")}</p>
                    <p className="text-xs text-muted-foreground">{shippingAddress.country}</p>
                  </>
                )}

                {paymentMethod && (
                  <>
                    <Separator className="my-3" />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Paid via</span>
                      <span className="font-medium text-foreground">{paymentMethod.name}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Link to={`/orders/${reference}`}>
                <Button className="btn-hero w-full">View order details</Button>
              </Link>
              <Button variant="outline" className="btn-secondary w-full" onClick={() => navigate("/")}>
                Continue shopping
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
