'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import AdminShell from '../../../_components/AdminShell'
import BreadCrumbs from '../../../_components/BreadCrumbs'

type TxRow = {
  id: string
  created_at: string
  transaction_type: number
  medium: 'stripe' | 'web' | 'mobile' | 'pos' | 'other'
  details: string | null
  currency: string
  amount: number
  status: number
  customer_id: string
  store_id: string | null
}

const TYPE_OPTIONS = [
  { value: 102, label: 'Credit (102)' },
  { value: 101, label: 'Reload (101)' },
  { value: 11,  label: 'User Action (11)' },
]

const MEDIUM_OPTIONS: TxRow['medium'][] = ['stripe','web','mobile','pos','other']
const statusLabels: Record<number, string> = { 1: 'Active', 0: 'On Hold', [-1]: 'Deleted' }

export default function CustomerTransactionsPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [rows, setRows] = useState<TxRow[]>([])
  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [showModal, setShowModal] = useState(false)

  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const notify = (m?: string, e?: string) => {
    setMsg(m || null); setErr(e || null)
    if (m || e) setTimeout(() => { setMsg(null); setErr(null) }, 2200)
  }

  const [sortConfig, setSortConfig] = useState<{ key: keyof TxRow | null; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc',
  })

  // Sıralama fonksiyonu
  const sortedRows = [...rows].sort((a, b) => {
    if (!sortConfig.key) return 0
    const key = sortConfig.key
    let valA = a[key]
    let valB = b[key]

    // tarih veya sayısal alanlar için farklı karşılaştırma
    if (key === 'created_at') {
      valA = new Date(valA as string).getTime()
      valB = new Date(valB as string).getTime()
    }
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortConfig.direction === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA)
    }
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortConfig.direction === 'asc'
        ? valA - valB
        : valB - valA
    }
    return 0
  })

  const requestSort = (key: keyof TxRow) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const sortIndicator = (key: keyof TxRow) => {
    if (sortConfig.key !== key) return null
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼'
  }

  // Add form state
  const [form, setForm] = useState({
    transaction_type: 102,
    medium: 'web' as TxRow['medium'],
    details: '',
    currency: 'USD',
    amount: '', // string for controlled numeric input
  })

  const resetForm = () => setForm({
    transaction_type: 102,
    medium: 'web',
    details: '',
    currency: 'USD',
    amount: '',
  })

  const fetchAll = useCallback(async () => {
    if (!id) return
    setLoading(true)

    const [{ data: customer, error: cErr }, { data: txList, error: tErr }] = await Promise.all([
      supabase.from('customers').select('name').eq('id', id).single(),
      supabase.from('transactions').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
    ])

    if (cErr) notify(undefined, cErr.message)
    if (tErr) notify(undefined, tErr.message)

    if (customer?.name) setCustomerName(customer.name)
    setRows((txList as TxRow[]) || [])
    setLoading(false)
  }, [id, supabase])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleAddCredit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)

    // Basic validation
    const amt = Number(form.amount)
    if (Number.isNaN(amt)) return notify(undefined, 'Please enter a valid amount.')
    if (!/^[A-Z]{3}$/.test(form.currency.toUpperCase())) return notify(undefined, 'Currency must be a 3-letter code (e.g., USD).')

    const { error } = await supabase
      .from('transactions')
      .insert({
        customer_id: id,
        store_id: null,
        transaction_type: form.transaction_type,
        medium: form.medium,
        details: form.details.trim() ? form.details.trim() : null,
        currency: form.currency.toUpperCase(),
        amount: amt,
        status: 1,
      })
      .select('*')
      .single()

    if (error) return notify(undefined, error.message)

    notify('Credit added')
    setShowModal(false)
    resetForm()
    fetchAll()
  }

  const typeLabel = (t: number) => TYPE_OPTIONS.find(o => o.value === t)?.label || String(t)

  return (
    <AdminShell>
      <div className="container py-5">
        <BreadCrumbs
          items={[
            { label: 'Customers', href: '/admin/customers' },
            { label: customerName || 'Customer', href: `/admin/customers/${id}` },
            { label: 'Transactions' }
          ]}
        />

        {msg && <div className="alert alert-success py-2">{msg}</div>}
        {err && <div className="alert alert-danger py-2">{err}</div>}

        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>Transactions</h1>
          <div className="d-flex gap-2">
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              + Add Credit
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => router.push(`/admin/customers/${id}`)}
            >
              &lt; Back to Customer
            </button>
          </div>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : rows.length === 0 ? (
          <div className="alert alert-secondary">No transactions yet.</div>
        ) : (
          <table className="table table-hover">
            <thead>
              <tr>
                <th onClick={() => requestSort('created_at')} style={{cursor:'pointer'}}>
                  Date{sortIndicator('created_at')}
                </th>
                <th onClick={() => requestSort('transaction_type')} style={{cursor:'pointer'}}>
                  Type{sortIndicator('transaction_type')}
                </th>
                <th onClick={() => requestSort('medium')} style={{cursor:'pointer'}}>
                  Medium{sortIndicator('medium')}
                </th>
                <th onClick={() => requestSort('details')} style={{cursor:'pointer'}}>
                  Details{sortIndicator('details')}
                </th>
                <th className="text-end" onClick={() => requestSort('amount')} style={{cursor:'pointer'}}>
                  Amount{sortIndicator('amount')}
                </th>
                <th onClick={() => requestSort('currency')} style={{cursor:'pointer'}}>
                  Currency{sortIndicator('currency')}
                </th>
                <th onClick={() => requestSort('status')} style={{cursor:'pointer'}}>
                  Status{sortIndicator('status')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                  <td>{typeLabel(r.transaction_type)}</td>
                  <td className="text-capitalize">{r.medium}</td>
                  <td style={{ maxWidth: 420, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.details || '-'}
                  </td>
                  <td className="text-end">{Number(r.amount).toFixed(2)}</td>
                  <td>{r.currency}</td>
                  <td>{statusLabels[r.status] ?? r.status}</td>
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
                <form onSubmit={handleAddCredit}>
                  <div className="modal-header">
                    <h5 className="modal-title">Add Credit</h5>
                    <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                  </div>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Transaction Type</label>
                      <select
                        className="form-select"
                        value={form.transaction_type}
                        onChange={(e) => setForm(f => ({ ...f, transaction_type: parseInt(e.target.value, 10) }))}
                        required
                      >
                        {TYPE_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Medium</label>
                      <select
                        className="form-select text-capitalize"
                        value={form.medium}
                        onChange={(e) => setForm(f => ({ ...f, medium: e.target.value as TxRow['medium'] }))}
                        required
                      >
                        {MEDIUM_OPTIONS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Details</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Optional notes"
                        value={form.details}
                        onChange={(e) => setForm(f => ({ ...f, details: e.target.value }))}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Currency</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.currency}
                        onChange={(e) => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))}
                        maxLength={3}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="-999"
                        className="form-control"
                        value={form.amount}
                        onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Save Credit</button>
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
