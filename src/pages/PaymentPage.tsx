import React, { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/src/components/ui/button'
import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'

// Stripe.js is loaded via CDN — declare minimal types needed
declare global {
  interface Window {
    Stripe?: (key: string) => StripeInstance
  }
}
interface StripeInstance {
  elements: (opts?: Record<string, unknown>) => StripeElements
  confirmPayment: (opts: Record<string, unknown>) => Promise<{ error?: { message: string } }>
}
interface StripeElements {
  create: (type: string, opts?: Record<string, unknown>) => StripeElement
  submit: () => Promise<{ error?: { message: string } }>
}
interface StripeElement {
  mount: (el: HTMLElement) => void
  destroy: () => void
}

interface LocationState {
  client_secret: string
  order_reference: string
}

const STRIPE_PK = String(import.meta.env.VITE_STRIPE_PK ?? '')

export default function PaymentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [stripeReady, setStripeReady] = useState(false)

  const stripeRef = useRef<StripeInstance | null>(null)
  const elementsRef = useRef<StripeElements | null>(null)
  const paymentElRef = useRef<StripeElement | null>(null)
  const mountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!state?.client_secret) {
      navigate('/', { replace: true })
      return
    }

    if (!STRIPE_PK) {
      setError('Stripe public key is not configured (VITE_STRIPE_PK).')
      return
    }

    const loadStripe = async () => {
      if (!window.Stripe) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://js.stripe.com/v3/'
          s.onload = () => resolve()
          s.onerror = () => reject(new Error('Failed to load Stripe.js'))
          document.head.appendChild(s)
        })
      }

      stripeRef.current = window.Stripe!(STRIPE_PK)
      elementsRef.current = stripeRef.current.elements({
        clientSecret: state!.client_secret,
        appearance: { theme: 'stripe' },
      })

      paymentElRef.current = elementsRef.current.create('payment')
      if (mountRef.current) {
        paymentElRef.current.mount(mountRef.current)
        setStripeReady(true)
      }
    }

    loadStripe().catch(err => setError(err.message))

    return () => {
      paymentElRef.current?.destroy()
    }
  }, [])

  const handlePay = async () => {
    if (!stripeRef.current || !elementsRef.current) return
    setLoading(true)
    setError('')

    const submitResult = await elementsRef.current.submit()
    if (submitResult.error) {
      setError(submitResult.error.message ?? 'Validation error')
      setLoading(false)
      return
    }

    const result = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      confirmParams: {
        return_url: `${window.location.origin}/checkouts/${state!.order_reference}/thank-you`,
      },
      redirect: 'if_required',
    })

    if (result.error) {
      setError(result.error.message ?? 'Payment failed')
      setLoading(false)
    } else {
      navigate(`/checkouts/${state!.order_reference}/thank-you`)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 justify-center">
            <ShoppingBag className="h-8 w-8 text-coffee-accent" />
            <span className="font-display text-2xl font-bold text-foreground">Tradly</span>
          </Link>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <h1 className="font-display text-2xl font-bold text-foreground mb-6">Complete payment</h1>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm mb-5">
              {error}
            </div>
          )}

          <div ref={mountRef} className="min-h-[160px] mb-6" />

          <Button
            className="btn-hero w-full mb-3"
            disabled={loading || !stripeReady}
            onClick={handlePay}
          >
            {loading ? 'Processing…' : 'Pay now'}
          </Button>

          <Button variant="outline" className="btn-secondary w-full" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </div>
      </div>
    </div>
  )
}
