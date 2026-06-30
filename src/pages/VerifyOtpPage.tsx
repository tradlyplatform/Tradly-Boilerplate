import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVerifyOtpMutation, useResendOtpMutation } from '@/state/auth/api'
import { useAuthSelector } from '@/state/auth/selectors'
import { Button } from '@/src/components/ui/button'
import { Input } from '@/src/components/ui/input'
import { Label } from '@/src/components/ui/label'
import { ShoppingBag, MailCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ResendOtpInput } from '@/types/auth.types'

export default function VerifyOtpPage() {
  const navigate = useNavigate()
  const verifyId = useAuthSelector(s => s.verifyId)
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation()
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation()

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (!verifyId) navigate('/sign-up', { replace: true })
  }, [verifyId])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verifyId) return
    setError('')

    const result = await verifyOtp({ verify_id: verifyId, code })
    if ('error' in result) {
      setError((result.error as { error: string }).error ?? 'Invalid code')
      return
    }

    sessionStorage.removeItem('signup_input')
    navigate('/')
  }

  const handleResend = async () => {
    setError('')
    setSuccessMsg('')
    const raw = sessionStorage.getItem('signup_input')
    if (!raw) { navigate('/sign-up', { replace: true }); return }

    const input = JSON.parse(raw) as ResendOtpInput
    const result = await resendOtp(input)
    if ('error' in result) {
      setError((result.error as { error: string }).error ?? 'Resend failed')
      return
    }
    setSuccessMsg('New code sent — check your inbox.')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 justify-center">
            <ShoppingBag className="h-8 w-8 text-coffee-accent" />
            <span className="font-display text-2xl font-bold text-foreground">Tradly</span>
          </Link>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <div className="flex justify-center mb-4">
            <div className="bg-coffee-secondary/50 rounded-full p-3">
              <MailCheck className="h-7 w-7 text-coffee-accent" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground text-center mb-1">Verify your email</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">Enter the 6-digit code we sent you.</p>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm mb-5">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm mb-5">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                className="text-center tracking-[0.5em] text-xl"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>

            <Button type="submit" disabled={isVerifying || code.length < 6} className="btn-hero w-full">
              {isVerifying ? 'Verifying…' : 'Verify'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Didn't receive it?{' '}
            <button onClick={handleResend} disabled={isResending} className="text-coffee-accent hover:underline font-medium bg-transparent border-none cursor-pointer text-sm p-0">
              {isResending ? 'Sending…' : 'Resend code'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
