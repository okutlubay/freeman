'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import AdminShell from '../../_components/AdminShell'
import BreadCrumbs from '../../_components/BreadCrumbs'

type Customer = {
  id: string
  name: string
  contact_name: string
  phone: string
  created_at: string
  stripe_pm_key: string
  status: number // 1/0/-1
  user_id: string | null
}

const statusOptions = [
  { value: 1, label: 'Active' },
  { value: 0, label: 'On Hold' },
  { value: -1, label: 'Deleted' },
]

export default function CustomerProfilePage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState<Customer>({
    id: '',
    name: '',
    contact_name: '',
    phone: '',
    created_at: '',
    stripe_pm_key: '',
    status: 1,
    user_id: null
  })
  const [balance, setBalance] = useState<number>(0)

  useEffect(() => {
    const fetchCustomer = async () => {
      setError('')
      setSuccess('')

      const { data, error } = await supabase.from('customers').select('*').eq('id', id).single()
      
      if (error) {
        setError(error.message || 'Failed to load customer')
        setLoading(false)
        return
      }

      const { data: balData, error: balErr } = await supabase
        .from('transactions')
        .select('amount')
        .eq('customer_id', id)
        .eq('status', 1)

      if (!balErr && balData) {
        const total = balData.reduce((sum, row) => sum + Number(row.amount || 0), 0)
        setBalance(total)
      }

      const cust: Customer = {
        id: data.id,
        name: data.name ?? '',
        contact_name: data.contact_name ?? '',
        phone: data.phone ?? '',
        created_at: data.created_at ?? '',
        stripe_pm_key: data.stripe_pm_key ?? '',
        status: typeof data.status === 'number' ? data.status : 1,
        user_id: data.user_id ?? null,
        
      }
      setForm(cust)
      setLoading(false)
    }

    if (id) fetchCustomer()
  }, [id])

  // Save customer (DB)
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    const payload = {
      name: form.name,
      contact_name: form.contact_name,
      phone: form.phone,
      stripe_pm_key: form.stripe_pm_key,
      status: Number(form.status)
    }

    const { error } = await supabase.from('customers').update(payload).eq('id', id)
    setSaving(false)

    if (error) {
      setError(error.message || 'Failed to save')
      return
    }

    setSuccess('Saved successfully.')
    router.refresh()
  }

  if (loading) {
    return (
      <AdminShell>
        <div className="container py-5">Loading...</div>
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      <div className="container py-5">
        <BreadCrumbs
          items={[
            { label: 'Customers', href: '/admin/customers' },
            { label: form.name || 'Profile' },
          ]}
        />

        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="mb-0">Customer Profile</h1>
          <Link href={`/admin/customers/${id}/stores`} className="btn btn-outline-primary">
            View Stores →
          </Link>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Customer (DB) form */}
        <form onSubmit={handleUpdate} className="mb-5">
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Name</label>
                <input
                  className="form-control"
                  value={form.name ?? ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Contact Name</label>
                <input
                  className="form-control"
                  value={form.contact_name ?? ''}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Phone</label>
                <input
                  className="form-control"
                  value={form.phone ?? ''}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Stripe Payment Method Key</label>
                <input
                  className="form-control"
                  value={form.stripe_pm_key ?? ''}
                  onChange={(e) => setForm({ ...form, stripe_pm_key: e.target.value })}
                />
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: parseInt(e.target.value, 10) })}
                >
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">Created At</label>
                <input
                  className="form-control"
                  value={form.created_at ? new Date(form.created_at).toLocaleString() : ''}
                  disabled
                  readOnly
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Auth User ID</label>
                <input className="form-control" value={form.user_id ?? ''} disabled readOnly />
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold">Customer Balance</label>
                <input
                  className="form-control"
                  value={balance.toFixed(2)}
                  readOnly
                  disabled
                />
                <div className="mt-1">
                  <button type="button" className="btn btn-info" onClick={() => router.push(`/admin/customers/${id}/transactions`)}>
                    See transactions →
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => router.push('/admin/customers')}>
              &lt; Back to Customers List
            </button>
          </div>
        </form>

      </div>
    </AdminShell>
  )
}