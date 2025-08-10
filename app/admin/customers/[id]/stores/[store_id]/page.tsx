'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import AdminShell from '../../../../_components/AdminShell'
import BreadCrumbs from '../../../../_components/BreadCrumbs'

type Store = {
  id: string
  customer_id: string
  name: string | null
  logo_url: string | null
  survey_complete_html: string | null
  redirect_url: string | null
  created_at: string
  qr_key: string
  status: 1 | 0 | -1            // ✅ status eklendi
}

export default function StoreDetailPage() {
  const { id: customerId, store_id: storeId } = useParams() as { id: string; store_id: string }
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [form, setForm] = useState<Store | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const notify = (m?: string, e?: string) => {
    setMsg(m || null); setErr(e || null)
    if (m || e) setTimeout(() => { setMsg(null); setErr(null) }, 2400)
  }

  const fetchStore = async () => {
    if (!customerId || !storeId) return
    setLoading(true)
    const [{ data: customer, error: cErr }, { data: store, error: sErr }] = await Promise.all([
      supabase.from('customers').select('name').eq('id', customerId).single(),
      supabase.from('stores').select('*').eq('id', storeId).eq('customer_id', customerId).single()
    ])

    if (cErr) notify(undefined, cErr.message)
    if (sErr) notify(undefined, sErr.message)

    if (customer) setCustomerName(customer.name)
    if (store) setForm(store as Store)
    setLoading(false)
  }

  useEffect(() => {
    fetchStore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, storeId])

  const setField = <K extends keyof Store>(k: K, v: Store[K]) =>
    setForm(prev => (prev ? { ...prev, [k]: v } as Store : prev))

  const save = async () => {
    if (!form) return
    setSaving(true)

    const payload = {
      name: form.name,
      logo_url: form.logo_url || null,
      survey_complete_html: form.survey_complete_html || null,
      redirect_url: form.redirect_url || null,
      status: form.status,                 // ✅ status kayda dahil
    }

    const { error, data } = await supabase
      .from('stores')
      .update(payload)
      .eq('id', form.id)
      .eq('customer_id', form.customer_id)
      .select('*')
      .single()

    if (error) {
      notify(undefined, error.message)
    } else {
      setForm(data as Store)
      notify('Saved')
    }
    setSaving(false)
  }

  if (!customerId || !storeId) return <AdminShell><div className="container py-5">Missing params</div></AdminShell>
  if (!form || loading) return <AdminShell><div className="container py-5">Loading...</div></AdminShell>
  
  return (
    <AdminShell>
      <div className="container py-5">
        <BreadCrumbs
          items={[
            { label: 'Customers', href: '/admin/customers' },
            { label: customerName || 'Customer', href: `/admin/customers/${customerId}` },
            { label: 'Stores', href: `/admin/customers/${customerId}/stores` },
            { label: form.name || 'Store' }
          ]}
        />

        {msg && <div className="alert alert-success py-2">{msg}</div>}
        {err && <div className="alert alert-danger py-2">{err}</div>}
      
        <div className="row g-3">
          {/* Name */}
          <div className="col-12 col-md-12">
            <label className="form-label">Name</label>
            <input
              className="form-control"
              value={form.name ?? ''}
              onChange={(e) => setField('name', e.target.value)}
            />
          </div>

          {/* Logo URL */}
          <div className="col-12 col-md-6">
            <label className="form-label">Logo URL</label>
            <input
              type="url"
              className="form-control"
              value={form.logo_url ?? ''}
              onChange={(e) => setField('logo_url', e.target.value)}
              placeholder="https://.../logo.png"
            />
          </div>

          {/* Logo preview */}
          {form.logo_url ? (
            <div className="col-12">
              <div className="d-flex align-items-center gap-3">
                <img
                  src={form.logo_url}
                  alt="Logo preview"
                  style={{ maxHeight: 64, maxWidth: 200, objectFit: 'contain', borderRadius: 6, border: '1px solid #eee', padding: 6, background: '#fff' }}
                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                />
                <small className="text-muted">Preview</small>
              </div>
            </div>
          ) : null}

          {/* Survey Complete HTML */}
          <div className="col-12">
            <label className="form-label">Survey Complete HTML</label>
            <textarea
              className="form-control"
              value={form.survey_complete_html ?? ''}
              onChange={(e) => setField('survey_complete_html', e.target.value)}
              placeholder=""
            />
            <small className="text-muted">Page content after completing the survey.</small>
          </div>

          {/* Redirect URL */}
          <div className="col-12">
            <label className="form-label">Redirect URL</label>
            <input
              type="url"
              className="form-control"
              value={form.redirect_url ?? ''}
              onChange={(e) => setField('redirect_url', e.target.value)}
              placeholder="https://example.com/thank-you"
            />
            <small className="text-muted">Redirect URL address after completing the survey.</small>
          </div>

          {/* Status */}
          <div className="col-12 col-md-6">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={form.status}
              onChange={(e) => setField('status', Number(e.target.value) as 1 | 0 | -1)}
            >
              <option value={1}>Active</option>
              <option value={0}>Paused</option>
              <option value={-1}>Deleted</option>
            </select>
          </div>

          {/* Readonly fields */}
          <div className="col-12 col-md-6">
            <label className="form-label">Customer ID</label>
            <input className="form-control" value={form.customer_id} disabled />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Created At</label>
            <input className="form-control" value={new Date(form.created_at).toLocaleString()} disabled />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">QR Key</label>
            <input className="form-control" value={form.qr_key} disabled />
          </div>
        </div>

        <div className="mt-4 d-flex gap-2">
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => router.push(`/admin/customers/${customerId}/stores`)}>
            &lt; Back to Stores List
          </button>
        </div>
      </div>
    </AdminShell>
  )
}
