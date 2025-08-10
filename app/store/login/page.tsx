'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StoreLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/store/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Login failed')
        setLoading(false)
        return
      }
      document.cookie = `store_username=${encodeURIComponent(json?.email || email)}; Path=/; Max-Age=${60*60*24*14}; SameSite=Lax`
      router.push('/store/dashboard')
    } catch {
      setError('Network error')
      setLoading(false)
    }
  }
  return (
    <div className="container-fluid min-vh-100" style={{ background: '#333333' }}>
      <div className="row min-vh-100">
        {/* Left: Login form */}
        <div className="col-12 col-lg-5 d-flex align-items-center justify-content-center py-5">
          <div className="card shadow-sm border-0 p-4 w-100" style={{ maxWidth: 420 }}>
            <h2 className="mb-1">Store Login</h2>
            <p className="text-muted mb-4">Sign in to manage your store.</p>

            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email address</label>
                <input
                  id="email"
                  type="email"
                  className="form-control"
                  placeholder="you@store.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  id="password"
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && <div className="alert alert-danger py-2 text-center">{error}</div>}

              <div className="d-grid">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Video (hidden on mobile) */}
        <div className="col-lg-7 d-none d-lg-block p-0 bg-white position-relative h-100 overflow-hidden" style={{ minHeight: '100vh' }}>
            <video
                src="/videos/0_Cooking_Food_1080x1920.mp4"
                autoPlay
                muted
                loop
                playsInline
                style={{
                    position: 'absolute',
                    inset: 0,           // top:0 right:0 bottom:0 left:0
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                }}
            />
        </div>
      </div>
    </div>
  )
}
