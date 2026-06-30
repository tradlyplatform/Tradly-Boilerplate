import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSetPasswordMutation } from '@/state/auth/api'
import { Button } from '@/src/components/ui/button'
import { Input } from '@/src/components/ui/input'
import { Label } from '@/src/components/ui/label'
import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [setPassword, { isLoading }] = useSetPasswordMutation()

  const [code, setCode] = useState('')
  const [password, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const verifyId = sessionStorage.getItem('reset_verify_id') ?? ''

  useEffect(() => {
    if (!verifyId) navigate('/forgot-password', { replace: true })
  }, [verifyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = await setPassword({ verify_id: verifyId, code, password })
    if ('error' in result) {
      setError((result.error as { error: string }).error ?? 'Reset failed')
      return
    }

    sessionStorage.removeItem('reset_verify_id')
    navigate('/sign-in')
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
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">Reset password</h1>
          <p className="text-sm text-muted-foreground mb-6">Enter the code from your email and choose a new password.</p>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Reset code</Label>
              <Input id="code" value={code} onChange={e => setCode(e.target.value)} placeholder="Enter code" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" value={password} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8} />
            </div>

            <Button type="submit" disabled={isLoading} className="btn-hero w-full">
              {isLoading ? 'Resetting…' : 'Set new password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
