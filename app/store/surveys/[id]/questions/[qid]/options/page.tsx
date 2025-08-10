'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import StoreShell from '../../../../../_components/StoreShell'
import BreadCrumbs from '../../../../../_components/BreadCrumbs'

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

export default function QuestionOptionsPage() {
  const supabase = createClientComponentClient({ isSingleton: true })
  const { id: surveyId, qid } = useParams<{ id: string; qid: string }>()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reorderingId, setReorderingId] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [rows, setRows] = useState<OptionRow[]>([])

  // Create modal state
  const [showCreate, setShowCreate] = useState(false)
  const [optText, setOptText] = useState('')
  const [optNotes, setOptNotes] = useState('')
  const [optStatus, setOptStatus] = useState<1 | 0 | -1>(1)

  const statusBadge = (s: number) => {
    const cls = s === 1 ? 'bg-success' : s === 0 ? 'bg-secondary' : 'bg-danger'
    const label = s === 1 ? 'Active' : s === 0 ? 'Paused' : 'Deleted'
    return <span className={`badge ${cls}`}>{label}</span>
  }

  const notify = (ok?: string, err?: string) => {
    setSuccess(ok || null)
    setError(err || null)
    if (ok || err) setTimeout(() => { setSuccess(null); setError(null) }, 3000)
  }

  const fetchAll = useCallback(async () => {
    if (!surveyId || !qid) return

    const [{ data: sv, error: svErr }, { data: qs, error: qErr }] = await Promise.all([
      supabase.from('surveys').select('id, name').eq('id', surveyId).single(),
      supabase.from('survey_questions').select('id, survey_id, question').eq('id', qid).eq('survey_id', surveyId).single(),
    ])
    if (svErr) throw new Error(svErr.message)
    if (qErr) throw new Error(qErr.message)

    const { data: opts, error: opErr } = await supabase
      .from('survey_options')
      .select('id, question_id, option, notes, rank, created, status')
      .eq('question_id', qid)
      .neq('status', -1) // hide removed
      .order('rank', { ascending: true })

    if (opErr) throw new Error(opErr.message)

    setSurvey(sv as Survey)
    setQuestion(qs as Question)
    setRows((opts as OptionRow[]) || [])
  }, [surveyId, qid, supabase])

  // initial load
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        setLoading(true)
        await fetchAll()
        if (!alive) return
        setError(null)
      } catch (e: any) {
        if (alive) setError(e?.message || 'Failed to load options')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [fetchAll])

  const nextRank = useMemo(() => {
    if (!rows.length) return 1
    return Math.max(...rows.map(r => r.rank || 0)) + 1
  }, [rows])

  // Create option
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!qid) return
    if (!optText.trim()) return notify(undefined, 'Please enter an option.')

    setSaving(true)
    try {
      const insertPayload = {
        question_id: qid,
        option: optText.trim(),
        notes: optNotes.trim() || null,
        rank: nextRank,
        status: optStatus,
      }

      const { error: insErr } = await supabase
        .from('survey_options')
        .insert(insertPayload)
      if (insErr) throw new Error(insErr.message)

      await fetchAll()
      setShowCreate(false)
      setOptText(''); setOptNotes(''); setOptStatus(1)
      notify('Option added.')
    } catch (err: any) {
      notify(undefined, err?.message || 'Failed to add option')
    } finally {
      setSaving(false)
    }
  }

  // swap rank with immediate neighbor; then refetch + success toast
  async function move(r: OptionRow, dir: 'up' | 'down') {
    const sorted = [...rows].sort((a, b) => a.rank - b.rank)
    const idx = sorted.findIndex(x => x.id === r.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const a = { ...sorted[idx] }
    const b = { ...sorted[swapIdx] }

    // optimistic UI: swap ranks locally
    const newList = sorted.map(x => {
      if (x.id === a.id) return { ...x, rank: b.rank }
      if (x.id === b.id) return { ...x, rank: a.rank }
      return x
    }).sort((x, y) => x.rank - y.rank)

    setRows(newList)
    setReorderingId(r.id)

    try {
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from('survey_options').update({ rank: b.rank }).eq('id', a.id),
        supabase.from('survey_options').update({ rank: a.rank }).eq('id', b.id),
      ])
      if (e1 || e2) throw new Error(e1?.message || e2?.message || 'Failed to reorder')

      await fetchAll()
      notify('Order updated.')
    } catch (err: any) {
      await fetchAll()
      notify(undefined, err?.message || 'Failed to reorder')
    } finally {
      setReorderingId(null)
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
            { label: 'Options' },
          ]}
        />

        <div className="d-flex align-items-center mb-4">
          <h1 className="mb-0 flex-grow-1">
            Options — {question ? (question.question.length > 64 ? question.question.slice(0, 64) + '…' : question.question) : ''}
          </h1>
          <div className="d-flex gap-2">
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Option</button>
            <Link href={`/store/surveys/${surveyId}/questions/${qid}`} className="btn btn-outline-secondary">
              &lt; Back to Question
            </Link>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {rows.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body py-5 text-center">
              <h5 className="mb-3">No options found</h5>
              <div className="mb-4">
                <img src="/images/isometric_add_option.svg" alt="Add Option Icon" width={400} height={400} />
              </div>
              <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>
                + Create Your First Option
              </button>
            </div>
          </div>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 80 }}>Rank</th>
                      <th>Option</th>
                      <th style={{ width: 100 }}>Status</th>
                      <th style={{ width: 100 }}>Order</th>
                      <th style={{ width: 100 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.id}>
                        <td>{r.rank}</td>
                        <td>
                          <div className="fw-semibold">{r.option}</div>
                          {r.notes && <div className="text-muted small">{r.notes}</div>}
                        </td>
                        <td>{statusBadge(r.status)}</td>
                        <td>
                          <div className="btn-group" role="group" aria-label="Reorder">
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => move(r, 'up')}
                              disabled={i === 0 || !!reorderingId}
                              title="Move up"
                            >
                              ↑
                            </button>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => move(r, 'down')}
                              disabled={i === rows.length - 1 || !!reorderingId}
                              title="Move down"
                            >
                              ↓
                            </button>
                          </div>
                        </td>
                        <td className="text-end">
                          <div className="btn-group">
                            {/* View (veya ileride edit) sayfasına gidebilir. İstersen düzenleme modali ekleriz */}
                            <Link
                              href={`/store/surveys/${surveyId}/questions/${qid}/options/${r.id}`}
                              className="btn btn-sm btn-outline-primary"
                              title="View"
                            >
                              View
                            </Link>
                            {/* Remove intentionally not included */}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Create Option Modal */}
        {showCreate && (
          <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,.3)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <form onSubmit={handleCreate}>
                  <div className="modal-header">
                    <h5 className="modal-title">Add Option</h5>
                    <button type="button" className="btn-close" onClick={() => setShowCreate(false)}></button>
                  </div>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Option</label>
                      <input className="form-control" value={optText} onChange={e => setOptText(e.target.value)} required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Notes (internal)</label>
                      <input className="form-control" value={optNotes} onChange={e => setOptNotes(e.target.value)} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={optStatus} onChange={e => setOptStatus(Number(e.target.value) as 1 | 0 | -1)}>
                        <option value={1}>Active</option>
                        <option value={0}>Paused</option>
                        <option value={-1}>Deleted</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add Option'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </StoreShell>
  )
}
