'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import StoreShell from '../../_components/StoreShell'
import BreadCrumbs from '../../_components/BreadCrumbs'

export default function StoreSurveyNewPage() {
  const router = useRouter()
  const supabase = createClientComponentClient({ isSingleton: true })

  const [loading, setLoading] = useState(false)
  const [pageReady, setPageReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null) // ✅ success state

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<1 | 0 | -1>(1)

  // sayfa açılışında sadece auth hazır mı kontrol et (middleware de koruyor zaten)
  useEffect(() => {
    let alive = true
    const check = async () => {
      const { data: sess } = await supabase.auth.getSession()
      if (!alive) return
      if (!sess.session?.user) {
        setError('Not authenticated.')
      }
      setPageReady(true)
    }
    check()
    return () => { alive = false }
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!name.trim()) {
      setError('Please enter a survey name.')
      return
    }

    setLoading(true)
    try {
      // 1) user & customer_id
      const { data: sess } = await supabase.auth.getSession()
      const user = sess.session?.user
      if (!user) throw new Error('Not authenticated.')

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

      // 2) insert survey
      const { data: inserted, error: insErr } = await supabase
        .from('surveys')
        .insert({
          customer_id: customerId,
          name: name.trim(),
          description: description.trim() || null,
          notes: notes.trim() || null,
          status,
        })
        .select('id')
        .single()

      if (insErr) throw new Error(insErr.message || 'Failed to create survey')
      if (!inserted?.id) throw new Error('Survey created but no id returned')

      // ✅ Success mesajı + kısa gecikmeyle redirect
      setSuccess('Survey created successfully. Redirecting…')
      setTimeout(() => {
        router.push(`/store/surveys/${inserted.id}`)
      }, 700)
    } catch (e: any) {
      setError(e?.message || 'Failed to create survey')
      // hata mesajını bir süre sonra temizlemek istersen:
      setTimeout(() => setError(null), 4000)
    } finally {
      setLoading(false)
    }
  }

  if (!pageReady) return null

  return (
    <StoreShell>
      <div className="container py-5">
        <BreadCrumbs items={[{ label: 'Dashboard', href: '/store/dashboard' }, { label: 'Surveys', href: '/store/surveys' }, { label: 'New Survey' }]} />

        <div className="d-flex align-items-center mb-4">
          <h1 className="mb-0">Create Survey</h1>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="sv-name" className="form-label">Name</label>
                <input
                  id="sv-name"
                  className="form-control"
                  placeholder="e.g., Post-Purchase Satisfaction"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="sv-desc" className="form-label">Description</label>
                <textarea
                  id="sv-desc"
                  className="form-control"
                  placeholder="(Optional) Short description - will be displayed under the question to your customers"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label htmlFor="sv-desc" className="form-label">Notes</label>
                <textarea
                  id="sv-desc"
                  className="form-control"
                  placeholder="(Optional) Your customers will not see this. Internal use only."
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="sv-status" className="form-label">Status</label>
                <select
                  id="sv-status"
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(Number(e.target.value) as 1 | 0 | -1)}
                >
                  <option value={1}>Active</option>
                  <option value={0}>Paused</option>
                  <option value={-1}>Deleted</option>
                </select>
              </div>

              <div className="alert alert-info mt-4">
                After saving your survey, you will be able to add questions and answer options.
              </div>

              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Survey'}
                </button>
                <Link href="/store/surveys" className="btn btn-outline-secondary">Cancel</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </StoreShell>
  )
}
