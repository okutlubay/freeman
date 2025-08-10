'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type UserData = {
  email: string
  password: string
  email_confirmed_at: string | null
  raw_user_meta_data: string
}

export default function AdminToolsPage() {
  const { id } = useParams()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const notify = (m?: string, e?: string) => {
    setMsg(m || null); setErr(e || null)
    if (m || e) setTimeout(() => { setMsg(null); setErr(null) }, 2500)
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/admin/users/${id}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then(data => setUser(data))
      .catch(e => notify(undefined, String(e)))
      .finally(() => setLoading(false))
  }, [id])

  const setField = <K extends keyof UserData>(k: K, v: UserData[K]) =>
    setUser(prev => (prev ? { ...prev, [k]: v } : prev))

  if (!id) return <div className="p-4">User not selected</div>
  if (loading) return <div className="p-4">Loading...</div>
  if (!user) return <div className="p-4">No user found</div>

  const updateEmail = async () => {
    try {
      const r = await fetch(`/api/admin/users/${id}/email`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      })
      if (!r.ok) throw new Error(await r.text())
      notify('Email updated')
    } catch (e:any) { notify(undefined, e.message || 'Failed') }
  }

  const updatePassword = async () => {
    try {
      const r = await fetch(`/api/admin/users/${id}/password`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: user.password })
      })
      if (!r.ok) throw new Error(await r.text())
      setField('password', '')
      notify('Password updated')
    } catch (e:any) { notify(undefined, e.message || 'Failed') }
  }

  const confirmEmail = async () => {
    try {
      const r = await fetch(`/api/admin/users/${id}/confirm-email`, { method: 'POST' })
      if (!r.ok) throw new Error(await r.text())
      const nowIso = new Date().toISOString()
      setField('email_confirmed_at', nowIso)
      notify('Email marked as confirmed')
    } catch (e:any) { notify(undefined, e.message || 'Failed') }
  }

  const updateMetadata = async () => {
    try {
      const r = await fetch(`/api/admin/users/${id}/metadata`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ raw_user_meta_data: user?.raw_user_meta_data })
      })
      if (!r.ok) throw new Error(await r.text())
      notify('Metadata updated')
    } catch (e: any) { notify(undefined, e.message || 'Failed') }
  }

  return (
    <div className="container py-4" style={{ maxWidth: 720 }}>
      <h2 className="mb-3">Admin Tools — User ID: {id}</h2>
      {msg && <div className="alert alert-success py-2">{msg}</div>}
      {err && <div className="alert alert-danger py-2">{err}</div>}

      <div className="mb-3">
        <label className="form-label">Email</label>
        <div className="d-flex gap-2">
          <input
            type="email" className="form-control"
            value={user.email} onChange={e => setField('email', e.target.value)}
          />
          <button className="btn btn-primary" onClick={updateEmail}>Save</button>
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label">Password</label>
        <div className="d-flex gap-2">
          <input
            type="password" className="form-control"
            value={user.password} onChange={e => setField('password', e.target.value)}
            placeholder="New password"
          />
          <button className="btn btn-warning" onClick={updatePassword}>Update</button>
        </div>
        <small className="text-muted">Will not display the current password; set a new one.</small>
      </div>

      <div className="mb-4">
        <label className="form-label">Metadata (JSON)</label>
        <textarea
          className="form-control"
          rows={6}
          value={user.raw_user_meta_data}
          onChange={e => setField('raw_user_meta_data', e.target.value)}
        />
        <button className="btn btn-primary mt-2" onClick={updateMetadata}>
          Save Metadata
        </button>
      </div>

      <div className="mb-4">
        <label className="form-label">Email Confirmed At</label>
        <div className="d-flex gap-2">
          <input
            type="datetime-local" className="form-control"
            value={user.email_confirmed_at ? new Date(user.email_confirmed_at).toISOString().slice(0,16) : ''}
            onChange={e => setField('email_confirmed_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
            disabled
          />
          <button className="btn btn-outline-success" onClick={confirmEmail}>
            Confirm
          </button>
        </div>
        <small className="text-muted">Direct timestamp write isn’t supported; use “Confirm”.</small>
      </div>
    </div>
  )
}
