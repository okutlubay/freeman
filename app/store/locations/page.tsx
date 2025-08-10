'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import StoreShell from '../_components/StoreShell'
import BreadCrumbs from '../_components/BreadCrumbs'

type StoreRow = {
  id: string
  customer_id: string
  name: string | null
  redirect_url: string | null
  qr_key: string | null
  survey_id: string | null
  // nested relation (FK: stores.survey_id -> surveys.id)
  survey?: { id: string; name: string } | null
}

export default function StoreLocationsPage() {
  const supabase = createClientComponentClient({ isSingleton: true })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stores, setStores] = useState<StoreRow[]>([])

  useEffect(() => {
    let alive = true

    const load = async () => {
      try {
        const { data: sessData } = await supabase.auth.getSession()
        const user = sessData.session?.user
        if (!user) {
          setError('Not authenticated.')
          return
        }

        let customerId: string | null = (user.user_metadata as any)?.customer_id ?? null

        if (!customerId) {
          const { data: cust, error: custErr } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', user.id)
            .single()

          if (custErr) throw new Error(custErr.message || 'Customer lookup failed')
          customerId = cust?.id ?? null
        }

        if (!customerId) throw new Error('No customer linked to this account.')

        const { data: rows, error: stErr } = await supabase
        .from('stores')
        .select(`
          id, customer_id, name, redirect_url, qr_key, survey_id,
          survey:surveys ( id, name )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false } as any)

      if (stErr) throw new Error(stErr.message || 'Failed to load stores')

      // 2) burada normalize et: array ise ilk elemanı al, değilse olduğu gibi bırak
      const normalized: StoreRow[] = (rows ?? []).map((r: any) => ({
        ...r,
        survey: Array.isArray(r.survey) ? (r.survey[0] ?? null) : (r.survey ?? null),
      }))

      // 3) ve setStores'e bunu ver
      setStores(normalized)

      } catch (e: any) {
        if (alive) setError(e?.message || 'Failed to load locations')
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => { alive = false }
  }, [supabase])

  return (
    <StoreShell>
      <div className="container py-5">
        <BreadCrumbs items={[
          { label: 'Dashboard', href: '/store/dashboard' },
          { label: 'Locations' }
        ]} />

        <div className="d-flex align-items-center mb-4">
          <h1 className="mb-0">Your Locations</h1>
          <div className="ms-auto" />
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : stores.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body py-5 text-center text-muted">
              No stores found.
            </div>
          </div>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Active Survey</th> {/* ✅ new */}
                    <th>Redirect URL</th>
                    <th>QR Key</th>        {/* now a link to /s/{qr_key} */}
                    <th style={{ width: 100 }}></th>{/* View */}
                  </tr>
                </thead>
                <tbody>
                  {stores.map((s) => (
                    <tr key={s.id}>
                      <td className="fw-medium">{s.name ?? '-'}</td>

                      {/* ✅ Active Survey */}
                      <td>
                        {s.survey_id && s.survey?.name ? (
                          <Link
                            href={`/store/surveys/${s.survey_id}`}
                            className="text-decoration-none"
                            title="Open Survey"
                          >
                            {s.survey.name}
                          </Link>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      {/* Redirect URL */}
                      <td>
                        {s.redirect_url ? (
                          <a href={s.redirect_url} target="_blank" rel="noreferrer">
                            {s.redirect_url}
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      {/* ✅ QR Key -> /s/{qr_key} new tab */}
                      <td>
                        {s.qr_key ? (
                          <a href={`/s/${s.qr_key}`} target="_blank" rel="noreferrer">
                            /s/{s.qr_key}
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      <td className="text-end">
                        <Link href={`/store/locations/${s.id}`} className="btn btn-sm btn-outline-primary">
                          View
                        </Link>
                      </td>
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
