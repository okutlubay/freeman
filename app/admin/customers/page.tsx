'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import AdminShell from '../_components/AdminShell'
import BreadCrumbs from '../_components/BreadCrumbs'

const statusLabels: Record<number, string> = {
  1: 'Active',
  0: 'On Hold',
  [-1]: 'Deleted',
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    password: '',
    stripe_pm_key: '',
    status: 1,
  })
  const [formError, setFormError] = useState('')

  const router = useRouter()
  const supabase = createClientComponentClient()

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        stores:stores(count)
      `)
      .order('created_at', { ascending: false })

    if (data) {
      const withCounts = data.map((customer: any) => ({
        ...customer,
        store_count: customer.stores?.[0]?.count ?? 0
      }))
      setCustomers(withCounts)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    // Basit validasyonlar
    if (!form.name.trim() || !form.contact_name.trim() || !form.phone.trim()) {
      setFormError('Name, contact name and phone are required')
      return
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      setFormError('Valid email is required')
      return
    }
    if (!form.password || form.password.length < 6) {
      setFormError('Password must be at least 6 characters')
      return
    }

    // 1) customers insert (client-side)
    const { data: inserted, error: insertErr } = await supabase
      .from('customers')
      .insert({
        name: form.name.trim(),
        contact_name: form.contact_name.trim(),
        phone: form.phone.trim(),
        stripe_pm_key: form.stripe_pm_key.trim() || null,
        status: form.status,
        // user_id henüz yok, sonra set edeceğiz
      })
      .select('id')
      .single()

    if (insertErr || !inserted?.id) {
      setFormError(insertErr?.message || 'Failed to create customer')
      return
    }

    const customerId = inserted.id

    // 2) auth user create (server API: /api/admin/users)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: form.email.trim(),
        password: form.password,
        is_super_admin: false,
        customer_id: customerId, // ← API bunu istiyor
      })
    })

    const raw = await res.text()
    let data: any
    try { data = JSON.parse(raw) } catch { data = { ok: res.ok, error: raw } }

    if (!res.ok || data?.ok === false || !data?.user?.id) {
      // (Opsiyonel) Rollback: müşteriyi silmek istersen burayı aç
      // await supabase.from('customers').delete().eq('id', customerId)
      setFormError(data?.error || 'Failed to create auth user')
      return
    }

    const userId = data.user.id

    // 3) customers.user_id güncelle (client-side)
    const { error: updErr } = await supabase
      .from('customers')
      .update({ user_id: userId })
      .eq('id', customerId)

    if (updErr) {
      setFormError(`Customer created but failed to link user: ${updErr.message}`)
      return
    }

    // 4) UI temizliği
    setShowModal(false)
    setForm({
      name: '',
      contact_name: '',
      phone: '',
      email: '',
      password: '',
      stripe_pm_key: '',
      status: 1,
    })
    // Listeyi tazele
    fetchCustomers()
  }

  return (
    <AdminShell>
      <div className="container py-5">
        <BreadCrumbs
          items={[
            { label: 'Dashboard', href: '/admin/customers' },
            { label: 'Customers' },
          ]}
        />
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>Customers</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Add Customer
          </button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Created At</th>
                <th>Status</th>
                <th>Stores</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.contact_name}</td>
                  <td>{c.phone}</td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td>{statusLabels[c.status]}</td>
                  <td>
                    {c.store_count > 0 ? (
                      <a href={`/admin/customers/${c.id}/stores`} className="text-decoration-underline">
                        {c.store_count}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => router.push(`/admin/customers/${c.id}`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showModal && (
          <div className="modal show fade d-block" tabIndex={-1} role="dialog" style={{ background: '#00000066' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <form onSubmit={handleSubmit}>
                  <div className="modal-header">
                    <h5 className="modal-title">Add Customer</h5>
                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                  </div>
                  <div className="modal-body">
                    {['name', 'contact_name', 'phone', 'email', 'password', 'stripe_pm_key'].map((field) => (
                      <div className="mb-3" key={field}>
                        <label className="form-label text-capitalize">{field.replace('_', ' ')}</label>
                        <input
                          type={field === 'password' ? 'password' : 'text'}
                          className="form-control"
                          value={(form as any)[field]}
                          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                          required
                        />
                      </div>
                    ))}
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: parseInt(e.target.value) })}
                        required
                      >
                        <option value={1}>Active</option>
                        <option value={0}>On Hold</option>
                        <option value={-1}>Deleted</option>
                      </select>
                    </div>
                    {formError && (
                      <div className="alert alert-danger" role="alert">
                        {formError}
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Save Customer
                    </button>
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
