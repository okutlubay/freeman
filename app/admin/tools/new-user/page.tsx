'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminAddUserPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSuper, setIsSuper] = useState(false)
  const [customerId, setCustomerId] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const notify = (m?: string, e?: string) => {
    setMsg(m || null); setErr(e || null)
    if (m || e) setTimeout(() => { setMsg(null); setErr(null) }, 2500)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      notify(undefined, 'Email and password are required')
      return
    }
    if (!isSuper && !customerId) {
      notify(undefined, 'Customer ID is required for non-super admins')
      return
    }

    try {
      setLoading(true)
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          is_super_admin: isSuper,
          customer_id: isSuper ? null : customerId
        })
      })

      const raw = await r.text()
      let data: any
      try { data = JSON.parse(raw) } catch {
        data = { ok: r.ok, error: raw?.trim() || (r.ok ? null : 'No JSON body') }
      }

      if (!r.ok || data?.ok === false) {
        notify(undefined, data?.error || 'Failed to create user')
        return
      }

      notify('User created successfully')
      setEmail(''); setPassword(''); setIsSuper(false); setCustomerId('')
    } catch (e: any) {
      notify(undefined, e?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-4" style={{ maxWidth: 720 }}>
      <h2 className="mb-3">Admin Tools — Add User</h2>

      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {err && <div className="alert alert-danger py-2">{err}</div>}

      <form onSubmit={onSubmit} autoComplete="off">
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            type="email" className="form-control"
            value={email || '<Enter email>'} onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Password</label>
          <input
            type="password" className="form-control"
            value={password} onChange={e => setPassword(e.target.value)}
            required
            placeholder="Min 6 characters"
          />
        </div>

        <div className="form-check mb-3">
          <input
            id="isSuper" className="form-check-input" type="checkbox"
            checked={isSuper} onChange={e => setIsSuper(e.target.checked)}
          />
          <label htmlFor="isSuper" className="form-check-label">Is super admin?</label>
        </div>

        {!isSuper && (
          <div className="mb-3">
            <label className="form-label">Customer ID</label>
            <input
              type="text" className="form-control"
              value={customerId} onChange={e => setCustomerId(e.target.value)}
              placeholder="e.g. UUID of customer"
              required
            />
            <small className="text-muted">
              Required if the user is not a super admin.
            </small>
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving…' : 'Create User'}
        </button>
      </form>
    </div>
  )
}
