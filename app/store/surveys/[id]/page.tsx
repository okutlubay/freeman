'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import StoreShell from '../../_components/StoreShell'
import BreadCrumbs from '../../_components/BreadCrumbs'

type Survey = {
  id: string
  customer_id: string
  name: string
  description: string | null
  notes: string | null
  status: number
  created: string
}

export default function StoreSurveyEditPage() {
  const supabase = createClientComponentClient({ isSingleton: true })
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null) // ✅ Success state eklendi

  const [survey, setSurvey] = useState<Survey | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<1 | 0 | -1>(1)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        if (!id) return
        const { data, error: svErr } = await supabase
          .from('surveys')
          .select('id, customer_id, name, description, notes, status, created')
          .eq('id', id)
          .single()

        if (svErr) throw new Error(svErr.message || 'Failed to load survey')
        if (!alive) return

        setSurvey(data as Survey)
        setName(data.name ?? '')
        setDescription(data.description ?? '')
        setNotes(data.notes ?? '')
        setStatus((data.status as 1 | 0 | -1) ?? 1)
        setError(null)
      } catch (e: any) {
        if (alive) setError(e?.message || 'Failed to load survey')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [id, supabase])

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!survey) return
    if (!name.trim()) {
      setError('Please enter a survey name.')
      setSuccess(null)
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const { error: upErr } = await supabase
        .from('surveys')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          notes: notes.trim() || null,
          status,
        })
        .eq('id', survey.id)

      if (upErr) throw new Error(upErr.message || 'Failed to save survey')

      setSuccess('Survey saved successfully.') // ✅ Başarılı mesaj
      setTimeout(() => setSuccess(null), 3000) // 3 saniye sonra kaybolur
    } catch (e: any) {
      setError(e?.message || 'Failed to save survey')
      setTimeout(() => setError(null), 4000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <StoreShell>
      <div className="container py-5">
        <BreadCrumbs
          items={[
            { label: 'Dashboard', href: '/store/dashboard' },
            { label: 'Surveys', href: '/store/surveys' },
            { label: survey?.name || 'Survey' },
          ]}
        />

        <div className="d-flex align-items-center mb-4">
          <h1 className="mb-0 flex-grow-1">{survey?.name || 'Survey'}</h1>
          {survey && (
            <div className="d-flex gap-2">
              <Link href={`/store/surveys/${survey.id}/questions`} className="btn btn-outline-primary">
                Survey Questions
              </Link>
            </div>
          )}
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {survey ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <form onSubmit={handleSave}>
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
                  <label htmlFor="sv-notes" className="form-label">Notes</label>
                  <textarea
                    id="sv-notes"
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

                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <Link href={`/store/surveys/${survey.id}/questions`} className="btn btn-outline-primary">
                    Survey Questions
                  </Link>
                  <Link href="/store/surveys" className="btn btn-outline-secondary">&lt; Back to Surveys</Link>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="alert alert-warning">Survey not found.</div>
        )}
      </div>
    </StoreShell>
  )
}
