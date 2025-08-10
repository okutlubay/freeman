'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function AdminLogin() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.user_metadata?.is_super_admin) {
      await supabase.auth.signOut()
      setError('You are not authorized to access the admin panel.')
      setLoading(false)
      return
    }

    document.cookie = `admin_username=${encodeURIComponent(user.email)}; Path=/; Max-Age=${60*60*24*14}; SameSite=Lax`
    
    router.push('/admin/customers')
  }

  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100 bg-light">
      <div className="card shadow-sm border-0 p-4" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 className="text-center mb-4">Admin Login</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email address</label>
            <input
              type="email"
              className="form-control"
              id="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="alert alert-danger py-1 text-center">{error}</div>}
          <div className="d-grid">
            <button type="submit" className="btn btn-primary">Sign In</button>
          </div>
        </form>
      </div>
    </div>
  )
}