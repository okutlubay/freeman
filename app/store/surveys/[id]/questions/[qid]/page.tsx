'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import StoreShell from '../../../../_components/StoreShell'
import BreadCrumbs from '../../../../_components/BreadCrumbs'

type Survey = {
  id: string
  name: string
}

type Question = {
  id: string
  survey_id: string
  question: string
  description: string | null
  notes: string | null
  status: number // 1=active, 0=paused, -1=removed
}

export default function StoreQuestionDetailPage() {
  const supabase = createClientComponentClient({ isSingleton: true })
  const params = useParams<{ id: string; qid: string }>()
  const surveyId = params?.id
  const qid = params?.qid

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [q, setQ] = useState<Question | null>(null)

  // Local form states (editable)
  const [fQuestion, setFQuestion] = useState('')
  const [fDescription, setFDescription] = useState('')
  const [fNotes, setFNotes] = useState('')
  const [fStatus, setFStatus] = useState<1 | 0 | -1>(1)

  const notify = (ok?: string, err?: string) => {
    setSuccess(ok || null)
    setError(err || null)
    if (ok || err) setTimeout(() => { setSuccess(null); setError(null) }, 3000)
  }

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        if (!surveyId || !qid) return
        setLoading(true)

        // survey (for header)
        const { data: sv, error: svErr } = await supabase
          .from('surveys')
          .select('id, name')
          .eq('id', surveyId)
          .single()
        if (svErr) throw new Error(svErr.message)

        // question
        const { data: qs, error: qErr } = await supabase
          .from('survey_questions')
          .select('id, survey_id, question, description, notes, status')
          .eq('id', qid)
          .eq('survey_id', surveyId)
          .single()
        if (qErr) throw new Error(qErr.message)

        if (!alive) return
        setSurvey(sv as Survey)
        setQ(qs as Question)

        // init form
        setFQuestion(qs.question ?? '')
        setFDescription(qs.description ?? '')
        setFNotes(qs.notes ?? '')
        setFStatus((qs.status as 1 | 0 | -1) ?? 1)

        setError(null)
      } catch (e: any) {
        if (alive) setError(e?.message || 'Failed to load question')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [surveyId, qid, supabase])

  const statusBadge = (s: number) => {
    const cls = s === 1 ? 'bg-success' : s === 0 ? 'bg-secondary' : 'bg-danger'
    const label = s === 1 ? 'Active' : s === 0 ? 'Paused' : 'Deleted'
    return <span className={`badge ${cls}`}>{label}</span>
  }

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!q) return
    if (!fQuestion.trim()) return notify(undefined, 'Please enter a question.')

    setSaving(true)
    try {
      const { error: upErr } = await supabase
        .from('survey_questions')
        .update({
          question: fQuestion.trim(),
          description: fDescription.trim() || null,
          notes: fNotes.trim() || null,
          status: fStatus,
        })
        .eq('id', q.id)

      if (upErr) throw new Error(upErr.message)

      // Update local snapshot so header/fields reflect latest
      const updated: Question = {
        ...q,
        question: fQuestion.trim(),
        description: fDescription.trim() || null,
        notes: fNotes.trim() || null,
        status: fStatus,
      }
      setQ(updated)
      notify('Question saved.')
    } catch (err: any) {
      notify(undefined, err?.message || 'Failed to save')
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
            { label: survey?.name || 'Survey', href: `/store/surveys/${surveyId}` },
            { label: 'Questions', href: `/store/surveys/${surveyId}/questions` },
            { label: 'Question Detail' },
          ]}
        />

        <div className="d-flex align-items-center mb-4">
          <h1 className="mb-0 flex-grow-1">
            {fQuestion ? (fQuestion.length > 80 ? fQuestion.slice(0, 80) + '…' : fQuestion) : 'Question'}
          </h1>
          <div className="d-flex gap-2">
            {/* Link to Question Options page */}
            <Link
              href={`/store/surveys/${surveyId}/questions/${qid}/options`}
              className="btn btn-outline-primary"
            >
              Question Options
            </Link>
            <Link href={`/store/surveys/${surveyId}/questions`} className="btn btn-outline-secondary">
              &lt; Back to Questions
            </Link>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {!q ? (
          <div className="alert alert-warning">Question not found.</div>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label">Question</label>
                  <input
                    className="form-control"
                    value={fQuestion}
                    onChange={(e) => setFQuestion(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Description (customer-facing)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={fDescription}
                    onChange={(e) => setFDescription(e.target.value)}
                    placeholder="Optional helper text shown under the question"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Notes (internal)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={fNotes}
                    onChange={(e) => setFNotes(e.target.value)}
                    placeholder="Internal notes; customers don't see this"
                  />
                </div>

                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={fStatus}
                      onChange={(e) => setFStatus(Number(e.target.value) as 1 | 0 | -1)}
                    >
                      <option value={1}>Active</option>
                      <option value={0}>Paused</option>
                      <option value={-1}>Deleted</option>
                    </select>
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <Link href={`/store/surveys/${surveyId}/questions/${qid}/options`} className="btn btn-outline-primary">
                    Question Options
                  </Link>
                  <Link href={`/store/surveys/${surveyId}/questions`} className="btn btn-outline-secondary">
                    &lt; Back to Questions
                  </Link>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </StoreShell>
  )
}
