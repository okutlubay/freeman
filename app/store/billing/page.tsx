'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import StoreShell from '../_components/StoreShell'
import BreadCrumbs from '../_components/BreadCrumbs'

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

const statusLabels: Record<number, string> = { 1: 'Active', 0: 'On Hold', [-1]: 'Deleted' }

export default function StoreBillingPage() {
  const supabase = createClientComponentClient({ isSingleton: true })

  const [rows, setRows] = useState<TxRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState<string>('')

  const [sortConfig, setSortConfig] = useState<{ key: keyof TxRow | null; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc',
  })

  const sortedRows = [...rows].sort((a, b) => {
    if (!sortConfig.key) return 0
    const key = sortConfig.key
    let valA = a[key] as any
    let valB = b[key] as any

    if (key === 'created_at') {
      valA = new Date(valA as string).getTime()
      valB = new Date(valB as string).getTime()
    } else if (typeof valA === 'string' && typeof valB === 'string') {
      return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    } else if (typeof valA === 'number' && typeof valB === 'number') {
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA
    }
    return 0
  })

  const requestSort = (key: keyof TxRow) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'
    setSortConfig({ key, direction })
  }
  const sortIndicator = (key: keyof TxRow) =>
    sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : null

  const resolveCustomer = useCallback(async (): Promise<{ id: string; name: string }> => {
    const { data: sess } = await supabase.auth.getSession()
    const user = sess.session?.user
    if (!user) throw new Error('Not authenticated.')

    let cid: string | null = (user.user_metadata as any)?.customer_id ?? null
    if (cid) {
      const { data, error } = await supabase.from('customers').select('name').eq('id', cid).single()
      if (error) throw new Error(error.message || 'Customer lookup failed')
      return { id: cid, name: data?.name || '' }
    } else {
      const { data, error } = await supabase.from('customers').select('id, name').eq('user_id', user.id).single()
      if (error) throw new Error(error.message || 'Customer lookup failed')
      return { id: data.id, name: data.name || '' }
    }
  }, [supabase])

  const fetchTransactions = useCallback(async (customerId: string) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message || 'Failed to load transactions')
    return (data || []) as TxRow[]
  }, [supabase])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { id, name } = await resolveCustomer()
      setCustomerName(name)

      const tx = await fetchTransactions(id)
      setRows(tx)
    } catch (e: any) {
      setError(e?.message || 'Failed to load billing data')
    } finally {
      setLoading(false)
    }
  }, [resolveCustomer, fetchTransactions])

  useEffect(() => { load() }, [load])

  const typeLabel = (t: number) => TYPE_OPTIONS.find(o => o.value === t)?.label || String(t)

  return (
    <StoreShell>
      <div className="container py-5">
        <BreadCrumbs
          items={[
            { label: 'Dashboard', href: '/store/dashboard' },
            { label: 'Billing' },
          ]}
        />

        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>Billing {customerName ? `— ${customerName}` : ''}</h1>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : rows.length === 0 ? (
          <div className="alert alert-secondary">No transactions yet.</div>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
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
            </div>
          </div>
        )}
      </div>
    </StoreShell>
  )
}
