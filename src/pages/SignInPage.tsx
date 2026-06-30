import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSignInMutation } from '@/state/auth/api'
import { Button } from '@/src/components/ui/button'
import { Input } from '@/src/components/ui/input'
import { Label } from '@/src/components/ui/label'
import { ShoppingBag } from 'lucide-react'

export default function SignInPage() {
  const navigate = useNavigate()
  const [signIn, { isLoading }] = useSignInMutation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const result = await signIn({ email, password, type: 'customer' })
    if ('error' in result) {
      setError((result.error as { error: string }).error ?? 'Sign in failed')
      return
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 justify-center">
            <ShoppingBag className="h-8 w-8 text-coffee-accent" />
            <span className="font-display text-2xl font-bold text-foreground">Tradly</span>
          </Link>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-6">Sign in to your account</p>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>

            <div className="text-right">
              <Link to="/forgot-password" className="text-xs text-coffee-accent hover:underline">Forgot password?</Link>
            </div>

            <Button type="submit" disabled={isLoading} className="btn-hero w-full">
              {isLoading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/sign-up" className="text-coffee-accent hover:underline font-medium">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
