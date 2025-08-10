'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import StoreShell from '../_components/StoreShell'
import BreadCrumbs from '../_components/BreadCrumbs'

export default function StoreDashboardPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [storeUserEmail, setStoreUserEmail] = useState<string>('')
  const [balance, setBalance] = useState<number>(0)

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (alive) setStoreUserEmail(user.email || '')

        // 2) Find the customer_id
        let customerId: string | null =
          (user.user_metadata && user.user_metadata.customer_id) || null

        if (!customerId) {
          // fallback: look up by user_id in customers table
          const { data: cust, error: custErr } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', user.id)
            .single()
          if (custErr) {
            throw new Error(custErr.message || 'Customer lookup failed')
          }
          customerId = cust?.id ?? null
        }

        if (!customerId) {
          throw new Error('No customer linked to this account.')
        }

        // 3) Sum balance from transactions (status = 1)
        const { data: txRows, error: txErr } = await supabase
          .from('transactions')
          .select('amount')
          .eq('customer_id', customerId)
          .eq('status', 1)

        if (txErr) {
          throw new Error(txErr.message || 'Failed to load transactions')
        }

        const total = (txRows || []).reduce(
          (sum, r: any) => sum + Number(r.amount || 0),
          0
        )

        if (alive) {
          setBalance(total)
          setLoading(false)
        }
      } catch (e: any) {
        if (alive) {
          setError(e?.message || 'Failed to load dashboard')
          setLoading(false)
        }
      }
    }

    load()
    return () => { alive = false }
  }, [supabase, router])
  
  return (
    <StoreShell>
      <div className="container py-5">
        <BreadCrumbs
          items={[
            { label: 'Dashboard' }
          ]}
        />

        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="d-flex align-items-center mb-4">
              <div>
                <h1 className="mb-1">Store Dashboard</h1>
                <div className="text-muted">
                  Welcome{storeUserEmail ? `, ${storeUserEmail}` : ''}.
                </div>
              </div>
              <div className="ms-auto d-flex gap-2">
                {/* future action buttons */}
              </div>
            </div>

            <div className="card border-0 shadow-sm">
              <div className="card-body py-5 text-center">
                <h5 className="mb-2">Nothing here yet</h5>
                <p className="text-muted mb-4">
                  When you start adding widgets or reports, they’ll show up on this page.
                </p>
              </div>
            </div>

            {/* sample grid */}
            <div className="row g-3 mt-3">
              <div className="col-12 col-md-6 col-xl-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <div className="fw-medium">Balance</div>
                    <div className="display-6">${balance.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </StoreShell>
  )
}
