'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import StoreShell from '../_components/StoreShell'
import BreadCrumbs from '../_components/BreadCrumbs'

type SurveyRow = {
  id: string
  customer_id: string
  name: string
  description: string | null
  status: number
  created: string
  // embedded aggregate
  survey_questions?: { count: number }[]
}

export default function StoreSurveysPage() {
  const supabase = createClientComponentClient({ isSingleton: true })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [surveys, setSurveys] = useState<SurveyRow[]>([])

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const { data: sess } = await supabase.auth.getSession()
        const user = sess.session?.user
        if (!user) {
          setError('Not authenticated.')
          return
        }

        // 1) customer_id meta'da mı?
        let customerId: string | null = (user.user_metadata as any)?.customer_id ?? null

        // 2) yoksa customers tablosundan user_id ile bul
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

        // 3) surveys listele
        const { data: rows, error: svErr } = await supabase
          .from('surveys')
          .select('id, customer_id, name, description, status, created, survey_questions(count)')
          .eq('customer_id', customerId)
          .order('created', { ascending: false } as any)

        if (svErr) throw new Error(svErr.message || 'Failed to load surveys')

        if (alive) {
          setSurveys(rows ?? [])
          setError(null)
        }
      } catch (e: any) {
        if (alive) setError(e?.message || 'Failed to load surveys')
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
            { label: 'Surveys' }
        ]} />

        <div className="d-flex align-items-center mb-4">
          <h1 className="mb-0">Surveys</h1>
          <div className="ms-auto">
            <Link href="/store/surveys/new" className="btn btn-primary">
              + Add Survey
            </Link>
          </div>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : surveys.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body py-5 text-center">
            {/* Başlık */}
            <h5 className="mb-3">No surveys found</h5>
            {/* Büyük ikon */}
            <div className="mb-4">
                <img src="/images/isometric_add_survey.svg" alt="Add Survey Icon" width={400} height={400} />
            </div>
            {/* Buton */}
            <Link href="/store/surveys/new" className="btn btn-primary btn-lg">
                + Create Your First Survey
            </Link>
            </div>
          </div>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th style={{ width: 110 }}>Questions</th>
                    <th style={{ width: 180 }}>Created</th>
                    <th style={{ width: 120 }}>Status</th>
                    <th style={{ width: 100 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {surveys.map((s) => {
                    const qCount = s.survey_questions?.[0]?.count ?? 0
                    return (
                      <tr key={s.id}>
                        <td className="fw-medium">{s.name}</td>
                        <td className="text-muted">{s.description || '—'}</td>
                        <td>
                          {qCount > 0 ? (
                            <Link href={`/store/surveys/${s.id}/questions`} className="text-decoration-none">
                              {qCount}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{new Date(s.created).toLocaleString()}</td>
                        <td>
                          {s.status === 1 ? (
                            <span className="badge bg-success">Active</span>
                          ) : s.status === 0 ? (
                            <span className="badge bg-secondary">Paused</span>
                          ) : (
                            <span className="badge bg-light text-muted">Deleted</span>
                          )}
                        </td>
                        <td className="text-end">
                          <Link href={`/store/surveys/${s.id}`} className="btn btn-sm btn-outline-primary">
                            View
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </StoreShell>
  )
}
