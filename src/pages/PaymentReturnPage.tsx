import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGetOrderDetailQuery } from '@/state/orders/api'
import Layout from '../components/Layout'
import { Button } from '@/src/components/ui/button'
import { Loader2, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'

type Status = 'checking' | 'success' | 'failed' | 'timeout' | 'unknown'

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 30_000

export default function PaymentReturnPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const orderRef =
    searchParams.get('order_reference') ??
    localStorage.getItem('pending_order_reference') ??
    ''

  const [status, setStatus] = useState<Status>(orderRef ? 'checking' : 'unknown')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isChecking = status === 'checking'

  const { data, isError } = useGetOrderDetailQuery(orderRef, {
    skip: !orderRef || !isChecking,
    pollingInterval: isChecking ? POLL_INTERVAL_MS : 0,
    refetchOnMountOrArgChange: true,
  })

  useEffect(() => {
    if (!isChecking) return
    timeoutRef.current = setTimeout(() => setStatus('timeout'), POLL_TIMEOUT_MS)
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [isChecking])

  useEffect(() => {
    if (!data || !isChecking) return
    const order = (data as any).order
    const paymentStatus: number = order?.payment_status ?? 1
    if (paymentStatus === 2) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      localStorage.removeItem('pending_order_reference')
      setStatus('success')
    } else if (paymentStatus === 3 || paymentStatus === 4) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setStatus('failed')
    }
  }, [data, isChecking])

  useEffect(() => {
    if (isError) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setStatus('unknown')
    }
  }, [isError])

  useEffect(() => {
    if (status === 'success' && orderRef) {
      navigate(`/checkouts/${orderRef}/thank-you`, { replace: true })
    }
  }, [status, orderRef])

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-card border border-border rounded-2xl p-10 max-w-sm w-full text-center shadow-lg">
          {status === 'checking' && (
            <>
              <Loader2 className="h-14 w-14 text-coffee-accent animate-spin mx-auto mb-5" />
              <h2 className="font-display text-xl font-bold text-foreground mb-2">Verifying your payment…</h2>
              <p className="text-sm text-muted-foreground">Please wait while we confirm your payment with the provider.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-5" />
              <h2 className="font-display text-xl font-bold text-foreground mb-2">Payment confirmed!</h2>
              <p className="text-sm text-muted-foreground">Redirecting you to your order…</p>
            </>
          )}

          {status === 'failed' && (
            <>
              <XCircle className="h-14 w-14 text-destructive mx-auto mb-5" />
              <h2 className="font-display text-xl font-bold text-foreground mb-2">Payment failed</h2>
              <p className="text-sm text-muted-foreground mb-6">Your payment was not completed. You can try again or choose a different payment method.</p>
              <div className="flex flex-col gap-3">
                <Button className="btn-hero w-full" onClick={() => navigate('/checkout')}>Try again</Button>
                <Button variant="outline" className="btn-secondary w-full" onClick={() => navigate('/')}>Back to home</Button>
              </div>
            </>
          )}

          {status === 'timeout' && (
            <>
              <Clock className="h-14 w-14 text-yellow-500 mx-auto mb-5" />
              <h2 className="font-display text-xl font-bold text-foreground mb-2">Taking longer than expected</h2>
              <p className="text-sm text-muted-foreground mb-6">We couldn't confirm your payment yet. Check your orders page — if it appears there, your payment went through.</p>
              <div className="flex flex-col gap-3">
                <Button className="btn-hero w-full" onClick={() => navigate('/orders')}>View my orders</Button>
                <Button variant="outline" className="btn-secondary w-full" onClick={() => setStatus('checking')}>Check again</Button>
              </div>
            </>
          )}

          {status === 'unknown' && (
            <>
              <AlertTriangle className="h-14 w-14 text-yellow-500 mx-auto mb-5" />
              <h2 className="font-display text-xl font-bold text-foreground mb-2">Payment status unknown</h2>
              <p className="text-sm text-muted-foreground mb-3">We could not verify your payment. Check your orders page or contact support.</p>
              {orderRef && <p className="text-xs text-muted-foreground font-mono mb-6">Ref: {orderRef}</p>}
              <div className="flex flex-col gap-3">
                <Button className="btn-hero w-full" onClick={() => navigate('/orders')}>View my orders</Button>
                <Button variant="outline" className="btn-secondary w-full" onClick={() => navigate('/')}>Back to home</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
