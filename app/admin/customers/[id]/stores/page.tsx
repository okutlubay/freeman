'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import AdminShell from '../../../_components/AdminShell'
import BreadCrumbs from '../../../_components/BreadCrumbs'

type StoreRow = {
  id: string
  name: string
  qr_key: string | null
  logo_url: string | null
  survey_complete_html: string | null
  redirect_url: string | null
  customer_id: string
  status: 1 | 0 | -1
}

export default function CustomerStoresPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [stores, setStores] = useState<StoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    name: '',
    logo_url: '',
    survey_complete_html: '',
    redirect_url: '',
    status: 1 as 1 | 0 | -1,
  })
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const notify = (m?: string, e?: string) => {
    setMsg(m || null); setErr(e || null)
    if (m || e) setTimeout(() => { setMsg(null); setErr(null) }, 2200)
  }

  const fetchStores = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [{ data: customer, error: cErr }, { data: storeList, error: sErr }] = await Promise.all([
      supabase.from('customers').select('name').eq('id', id).single(),
      supabase
        .from('stores')
        .select('id, name, qr_key, logo_url, survey_complete_html, redirect_url, customer_id, status')
        .eq('customer_id', id)
        .order('created_at', { ascending: false }),
    ])

    if (cErr) notify(undefined, cErr.message)
    if (sErr) notify(undefined, sErr.message)

    if (customer) setCustomerName(customer.name)
    if (storeList) setStores(storeList as StoreRow[])
    setLoading(false)
  }, [id, supabase])

  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return notify(undefined, 'Name is required')

    const makeKey = () => crypto.randomUUID().slice(0, 8)

    let attempt = 0
    let lastErr: any = null

    while (attempt < 2) { // çakışma olursa 1 kez daha dene
      const qr_key = makeKey()

      const { data, error } = await supabase
        .from('stores')
        .insert({
          name: form.name.trim(),
          logo_url: form.logo_url.trim() || null,
          survey_complete_html: form.survey_complete_html.trim() || null,
          redirect_url: form.redirect_url.trim() || null,
          customer_id: id,
          qr_key,
          status: form.status,
        })
        .select('id, name, qr_key, logo_url, survey_complete_html, redirect_url, customer_id, status')
        .single()

      if (!error) {
        notify('Store created')
        setShowModal(false)
        setForm({ name: '', logo_url: '', survey_complete_html: '', redirect_url: '', status: 1 })
        setStores(prev => data ? [data as StoreRow, ...prev] : prev)
        return
      }

      // unique violation kontrolü (Postgres 23505)
      if ((error as any).code === '23505') {
        attempt++
        lastErr = error
        continue
      }

      // başka bir hata ise çık
      notify(undefined, error.message)
      return
    }

    // nadir durum: iki deneme de çakıştı
    notify(undefined, lastErr?.message || 'Failed to create store (qr_key conflict)')
  }

  return (
    <AdminShell>
      <div className="container py-5">
        <BreadCrumbs
          items={[
            { label: 'Customers', href: '/admin/customers' },
            { label: customerName || 'Customer', href: `/admin/customers/${id}` },
            { label: 'Stores' }
          ]}
        />

        {msg && <div className="alert alert-success py-2">{msg}</div>}
        {err && <div className="alert alert-danger py-2">{err}</div>}

        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>Stores</h1>
          
          <div className="d-flex gap-2">
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
            >
              + Add Store
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => router.push(`/admin/customers/${id}`)}
            >
              &lt; Back to Store Details
            </button>
          </div>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : stores.length === 0 ? (
          <div className="alert alert-secondary">No stores added yet.</div>
        ) : (
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Name</th>
                <th>QR Key</th>
                <th>Logo</th>
                <th>Redirect URL</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td><code>{s.qr_key || '-'}</code></td>
                  <td>{s.logo_url || '-'}</td>
                  <td>{s.redirect_url || '-'}</td>
                  <td>
                    {s.status === 1 ? 'Active' : s.status === 0 ? 'Paused' : 'Deleted'}
                  </td>
                  <td>
                    <a href={`/admin/customers/${id}/stores/${s.id}`} className="btn btn-sm btn-outline-primary">
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Modal */}
        {showModal && (
          <div className="modal show fade d-block" tabIndex={-1} style={{ background: '#00000066' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <form onSubmit={handleAddStore}>
                  <div className="modal-header">
                    <h5 className="modal-title">Add Store</h5>
                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                  </div>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Logo URL (optional)</label>
                      <input
                        type="url"
                        className="form-control"
                        value={form.logo_url}
                        onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                        placeholder="https://example.com/image.png"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Survey Complete HTML</label>
                      <textarea
                        className="form-control"
                        value={form.survey_complete_html ?? ''}
                        onChange={(e) => setForm({ ...form, survey_complete_html: e.target.value })}
                        placeholder=""
                      />
                      <small className="text-muted">Anket sonrası yönlendirme adresi.</small>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Redirect URL (optional)</label>
                      <input
                        type="url"
                        className="form-control"
                        value={form.redirect_url}
                        onChange={(e) => setForm({ ...form, redirect_url: e.target.value })}
                        placeholder="https://example.com/thanks"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: Number(e.target.value) as 1 | 0 | -1 })}
                      >
                        <option value={1}>Active</option>
                        <option value={0}>Paused</option>
                        <option value={-1}>Deleted</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Save Store</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
