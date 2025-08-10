'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import StoreShell from '../../_components/StoreShell'
import BreadCrumbs from '../../_components/BreadCrumbs'

type Store = {
  id: string
  customer_id: string
  name: string | null
  logo_url: string | null
  survey_complete_html: string | null
  redirect_url: string | null
  created_at: string
  qr_key: string | null
  status: -1 | 0 | 1
  survey_id: string | null // ✅ active survey assignment
}

type SurveyLite = {
  id: string
  customer_id: string
  name: string
  status: number
}

export default function StoreLocationDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const supabase = createClientComponentClient({ isSingleton: true })

  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [logoOk, setLogoOk] = useState(true)

  // Active Survey picker
  const [surveys, setSurveys] = useState<SurveyLite[]>([])
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | 'null'>('null')
  const [savingSurvey, setSavingSurvey] = useState(false)

  const fetchStore = useCallback(async () => {
    const { data, error: stErr } = await supabase
      .from('stores')
      .select('id, customer_id, name, logo_url, survey_complete_html, redirect_url, created_at, qr_key, status, survey_id')
      .eq('id', id)
      .single()
    if (stErr) throw new Error(stErr.message || 'Failed to load location')
    return data as Store
  }, [id, supabase])

  const fetchSurveys = useCallback(async (customerId: string) => {
    const { data, error: svErr } = await supabase
      .from('surveys')
      .select('id, customer_id, name, status')
      .eq('customer_id', customerId)
      .eq('status', 1) // only active surveys
      .order('created', { ascending: false })
    if (svErr) throw new Error(svErr.message || 'Failed to load surveys')
    return (data || []) as SurveyLite[]
  }, [supabase])

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        if (!id) return
        setLoading(true)

        const st = await fetchStore()
        if (!alive) return

        setStore(st)
        setSelectedSurveyId(st.survey_id ?? 'null')

        // load this customer's active surveys
        const svs = await fetchSurveys(st.customer_id)
        if (!alive) return
        setSurveys(svs)

        setError(null)
      } catch (e: any) {
        if (alive) setError(e?.message || 'Failed to load location')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [id, fetchStore, fetchSurveys])

  const handleSaveSurvey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!store) return

    // no-op if unchanged
    const newVal = selectedSurveyId === 'null' ? null : selectedSurveyId
    if (newVal === store.survey_id) {
      setSuccess('No changes to save.')
      setTimeout(() => setSuccess(null), 2000)
      return
    }

    setSavingSurvey(true)
    setError(null)
    setSuccess(null)
    try {
      const { error: upErr } = await supabase
        .from('stores')
        .update({ survey_id: newVal })
        .eq('id', store.id)

      if (upErr) throw new Error(upErr.message || 'Failed to save active survey')

      // reflect locally
      setStore(prev => prev ? { ...prev, survey_id: newVal } : prev)
      setSuccess('Active survey updated.')
      setTimeout(() => setSuccess(null), 2500)
    } catch (e: any) {
      setError(e?.message || 'Failed to save active survey')
      setTimeout(() => setError(null), 3500)
    } finally {
      setSavingSurvey(false)
    }
  }

  const renderStatusBadge = (status: Store['status']) => {
    if (status === 1) return <span className="badge bg-success">Active</span>
    if (status === 0) return <span className="badge bg-secondary">Paused</span>
    return <span className="badge bg-light text-muted">Deleted</span>
  }

  const CameraPlaceholder = () => (
    <svg
      width="80"
      height="80"
      viewBox="0 0 24 24"
      role="img"
      aria-label="No logo"
      className="text-muted"
      style={{ display: 'block' }}
    >
      <path
        d="M9.5 5.5 8 7H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-1.5-1.5h-5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )

  if (loading) return null

  return (
    <StoreShell>
      <div className="container py-5">
        <BreadCrumbs
          items={[
            { label: 'Dashboard', href: '/store/dashboard' },
            { label: 'Locations', href: '/store/locations' },
            { label: store?.name || 'Location' },
          ]}
        />

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {!store ? (
          <div className="alert alert-warning">Location not found.</div>
        ) : (
          <div className="row g-4">
            {/* Main details card */}
            <div className="col-12 col-lg-8">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="mb-3">
                    <div className="text-uppercase text-muted small fw-semibold">Name</div>
                    <div className="fs-5">{store.name || '—'}</div>
                  </div>

                  <div className="mb-3">
                    <div className="text-uppercase text-muted small fw-semibold">Redirect URL</div>
                    <div>
                      {store.redirect_url ? (
                        <a href={store.redirect_url} target="_blank" rel="noreferrer">
                          {store.redirect_url}
                        </a>
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="text-uppercase text-muted small fw-semibold">QR Key</div>
                    <div className="d-flex align-items-center gap-2">
                      {store.qr_key && (
                        <a href={`/s/${store.qr_key}`} target="_blank" rel="noreferrer">
                          {store.qr_key || '—'}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="text-uppercase text-muted small fw-semibold">Status</div>
                    <div>{renderStatusBadge(store.status)}</div>
                  </div>

                  <div className="mb-3">
                    <div className="text-uppercase text-muted small fw-semibold">Created</div>
                    <div>{new Date(store.created_at).toLocaleString()}</div>
                  </div>

                  {/* ✅ Active Survey picker (the only editable area) */}
                  <form onSubmit={handleSaveSurvey} className="mb-4">
                    <label className="form-label text-uppercase text-muted small fw-semibold">
                      Active Survey
                    </label>
                    <div className="d-flex gap-2 align-items-center">
                      <select
                        className="form-select"
                        style={{ maxWidth: 420 }}
                        value={selectedSurveyId}
                        onChange={(e) => setSelectedSurveyId(e.target.value as string)}
                      >
                        <option value="null">(None)</option>
                        {surveys.map(sv => (
                          <option key={sv.id} value={sv.id}>{sv.name}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={savingSurvey || (store.survey_id ?? 'null') === selectedSurveyId}
                      >
                        {savingSurvey ? 'Saving...' : 'Save'}
                      </button>
                      {store.survey_id && (
                        <Link
                          href={`/store/surveys/${store.survey_id}`}
                          className="btn btn-outline-secondary"
                          title="Go to Survey"
                        >
                          Open Survey
                        </Link>
                      )}
                    </div>
                    <div className="form-text">
                      Only active surveys of this customer can be assigned.
                    </div>
                  </form>

                  <div className="mb-2">
                    <div className="text-uppercase text-muted small fw-semibold">Survey Complete HTML (Preview)</div>
                    <div
                      className="border rounded p-3 bg-white"
                      dangerouslySetInnerHTML={{ __html: store.survey_complete_html || '<em>No content</em>' }}
                    />
                  </div>

                  <div className="alert alert-info mt-4 mb-0">
                    Other fields on this page are read-only. For changes, please contact your system administrator.
                  </div>
                </div>
              </div>

              <div className="mt-4 d-flex gap-2">
                <a className="btn btn-secondary" href="/store/locations">
                  &lt; Back to Locations List
                </a>
              </div>
            </div>

            {/* Logo / profile box */}
            <div className="col-12 col-lg-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body d-flex flex-column align-items-center">
                  <div className="text-uppercase text-muted small fw-semibold w-100">Logo</div>
                  <div
                    className="d-flex align-items-center justify-content-center mt-2"
                    style={{
                      width: 180,
                      height: 180,
                      borderRadius: 12,
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      overflow: 'hidden',
                    }}
                  >
                    {store.logo_url && logoOk ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={store.logo_url}
                        alt="Logo"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                        onError={() => setLogoOk(false)}
                      />
                    ) : (
                      <CameraPlaceholder />
                    )}
                  </div>

                  <div className="mt-3 w-100">
                    <div className="text-muted small">Logo URL</div>
                    <div className="text-break">
                      {store.logo_url ? (
                        <a href={store.logo_url} target="_blank" rel="noreferrer">
                          {store.logo_url}
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StoreShell>
  )
}
