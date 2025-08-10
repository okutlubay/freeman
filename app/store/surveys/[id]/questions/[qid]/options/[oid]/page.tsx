'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import StoreShell from '../../../../../../_components/StoreShell'
import BreadCrumbs from '../../../../../../_components/BreadCrumbs'

type Survey = { id: string; name: string }
type Question = { id: string; survey_id: string; question: string }

type OptionRow = {
  id: string
  question_id: string
  option: string
  notes: string | null
  rank: number
  created: string
  status: number // 1=active, 0=paused, -1=removed
}

export default function OptionDetailPage() {
  const supabase = createClientComponentClient({ isSingleton: true })
  const params = useParams<{ id: string; qid: string; oid: string }>()
  const surveyId = params?.id
  const qid = params?.qid
  const oid = params?.oid

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [opt, setOpt] = useState<OptionRow | null>(null)

  // form state
  const [fText, setFText] = useState('')
  const [fNotes, setFNotes] = useState('')
  const [fStatus, setFStatus] = useState<1 | 0 | -1>(1)

  const notify = (ok?: string, err?: string) => {
    setSuccess(ok || null)
    setError(err || null)
    if (ok || err) setTimeout(() => { setSuccess(null); setError(null) }, 3000)
  }

  const statusBadge = (s: number) => {
    const cls = s === 1 ? 'bg-success' : s === 0 ? 'bg-secondary' : 'bg-danger'
    const label = s === 1 ? 'Active' : s === 0 ? 'Paused' : 'Deleted'
    return <span className={`badge ${cls}`}>{label}</span>
  }

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        if (!surveyId || !qid || !oid) return
        setLoading(true)

        const [{ data: sv, error: svErr }, { data: qs, error: qErr }] = await Promise.all([
          supabase.from('surveys').select('id, name').eq('id', surveyId).single(),
          supabase.from('survey_questions').select('id, survey_id, question').eq('id', qid).eq('survey_id', surveyId).single(),
        ])
        if (svErr) throw new Error(svErr.message)
        if (qErr) throw new Error(qErr.message)

        const { data: op, error: opErr } = await supabase
          .from('survey_options')
          .select('id, question_id, option, notes, status')
          .eq('id', oid)
          .eq('question_id', qid)
          .single()
        if (opErr) throw new Error(opErr.message)

        if (!alive) return
        setSurvey(sv as Survey)
        setQuestion(qs as Question)
        setOpt(op as OptionRow)

        // init form
        setFText(op.option ?? '')
        setFNotes(op.notes ?? '')
        setFStatus((op.status as 1 | 0 | -1) ?? 1)

        setError(null)
      } catch (e: any) {
        if (alive) setError(e?.message || 'Failed to load option')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [surveyId, qid, oid, supabase])

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!opt) return
    if (!fText.trim()) return notify(undefined, 'Please enter an option.')

    setSaving(true)
    try {
      const { error: upErr } = await supabase
        .from('survey_options')
        .update({
          option: fText.trim(),
          notes: fNotes.trim() || null,
          status: fStatus,
        })
        .eq('id', opt.id)

      if (upErr) throw new Error(upErr.message)

      // local snapshot
      const updated: OptionRow = {
        ...opt,
        option: fText.trim(),
        notes: fNotes.trim() || null,
        status: fStatus,
      }
      setOpt(updated)
      notify('Option saved.')
    } catch (err: any) {
      notify(undefined, err?.message || 'Failed to save option')
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
            { label: 'Question Detail', href: `/store/surveys/${surveyId}/questions/${qid}` },
            { label: 'Options', href: `/store/surveys/${surveyId}/questions/${qid}/options` },
            { label: 'Option Detail' },
          ]}
        />

        <div className="d-flex align-items-center mb-4">
          <h1 className="mb-0 flex-grow-1">
            {opt ? (opt.option.length > 80 ? opt.option.slice(0, 80) + '…' : opt.option) : 'Option'}
          </h1>
          <div className="d-flex gap-2">
            <Link href={`/store/surveys/${surveyId}/questions/${qid}/options`} className="btn btn-outline-secondary">
              &lt; Back to Options
            </Link>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {!opt ? (
          <div className="alert alert-warning">Option not found.</div>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label">Option</label>
                  <input
                    className="form-control"
                    value={fText}
                    onChange={(e) => setFText(e.target.value)}
                    required
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
                  <Link href={`/store/surveys/${surveyId}/questions/${qid}/options`} className="btn btn-outline-secondary">
                    &lt; Back to Options
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
