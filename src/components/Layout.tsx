import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, User, LogOut, ShoppingBag, Menu, X } from 'lucide-react'
import { useAuthSelector } from '@/state/auth/selectors'
import { useCartItemCount } from '@/state/cart/selectors'
import { logout } from '@/state/auth/slice'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '@/state/store'
import { Button } from '@/src/components/ui/button'
import { cn } from '@/src/lib/utils'

function Header() {
  const isAuthenticated = useAuthSelector(s => s.isAuthenticated)
  const firstName = useAuthSelector(s => s.firstName)
  const cartCount = useCartItemCount()
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/sign-in')
  }

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <ShoppingBag className="h-7 w-7 text-coffee-accent" />
          <span className="font-display text-xl font-bold text-foreground">Tradly</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link to="/" className="text-sm text-foreground hover:text-coffee-accent transition-colors">Home</Link>
          {isAuthenticated && (
            <Link to="/orders" className="text-sm text-foreground hover:text-coffee-accent transition-colors">My Orders</Link>
          )}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && (
            <Link to="/cart">
              <Button variant="outline" size="sm" className="btn-secondary relative">
                <ShoppingCart className="h-4 w-4 mr-1.5" />
                Cart
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-coffee-accent text-coffee-accent-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Button>
            </Link>
          )}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5 inline mr-1" />
                {firstName || 'Account'}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive gap-1.5">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/sign-in">
                <Button variant="ghost" size="sm" className="text-sm">Sign in</Button>
              </Link>
              <Link to="/sign-up">
                <Button size="sm" className="btn-hero text-sm px-4">Sign up</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-md text-foreground"
          onClick={() => setMobileOpen(o => !o)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-4 flex flex-col gap-3">
          <Link to="/" className="text-sm" onClick={() => setMobileOpen(false)}>Home</Link>
          {isAuthenticated && (
            <>
              <Link to="/orders" className="text-sm" onClick={() => setMobileOpen(false)}>My Orders</Link>
              <Link to="/cart" className="text-sm" onClick={() => setMobileOpen(false)}>Cart ({cartCount})</Link>
              <button onClick={handleLogout} className="text-sm text-left text-destructive">Sign out</button>
            </>
          )}
          {!isAuthenticated && (
            <>
              <Link to="/sign-in" className="text-sm" onClick={() => setMobileOpen(false)}>Sign in</Link>
              <Link to="/sign-up" className="text-sm" onClick={() => setMobileOpen(false)}>Sign up</Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="bg-coffee-primary text-coffee-primary-foreground py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <ShoppingBag className="h-5 w-5" />
              <span className="font-display text-lg font-bold">Tradly</span>
            </div>
            <p className="text-sm opacity-70 leading-relaxed">Your trusted marketplace for quality products.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-90">Quick Links</h4>
            <ul className="space-y-2 text-sm opacity-70">
              <li><Link to="/" className="hover:opacity-100 transition-opacity">Home</Link></li>
              <li><Link to="/orders" className="hover:opacity-100 transition-opacity">My Orders</Link></li>
              <li><Link to="/cart" className="hover:opacity-100 transition-opacity">Cart</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-90">Account</h4>
            <ul className="space-y-2 text-sm opacity-70">
              <li><Link to="/sign-in" className="hover:opacity-100 transition-opacity">Sign In</Link></li>
              <li><Link to="/sign-up" className="hover:opacity-100 transition-opacity">Create Account</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-coffee-primary-foreground/20 mt-8 pt-6 text-center text-sm opacity-50">
          <p>&copy; {new Date().getFullYear()} Tradly. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default function Layout({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className={cn('flex-1 container mx-auto px-4 py-8', className)}>
        {children}
      </main>
      <Footer />
    </div>
  )
}
