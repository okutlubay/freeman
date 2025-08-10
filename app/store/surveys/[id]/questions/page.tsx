'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import StoreShell from '../../../_components/StoreShell'
import BreadCrumbs from '../../../_components/BreadCrumbs'

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
  rank: number
  created: string
  status: number // 1=active, 0=paused, -1=removed
  // embedded aggregate
  question_options?: { count: number }[]
}

export default function StoreSurveyQuestionsPage() {
  const supabase = createClientComponentClient({ isSingleton: true })
  const { id } = useParams<{ id: string }>() // survey id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reorderingId, setReorderingId] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])

  // Create modal state
  const [showCreate, setShowCreate] = useState(false)
  const [qText, setQText] = useState('')
  const [qDesc, setQDesc] = useState('')
  const [qNotes, setQNotes] = useState('')
  const [qStatus, setQStatus] = useState<1 | 0 | -1>(1)

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
    if (!id) return
    // load survey
    const { data: sv, error: svErr } = await supabase
      .from('surveys')
      .select('id, name')
      .eq('id', id)
      .single()
    if (svErr) throw new Error(svErr.message)

    // fetchAll
    const { data: qs, error: qsErr } = await supabase
    .from('survey_questions')
    .select(`
        id, survey_id, question, description, notes, rank, created, status,
        question_options:survey_options(count)
    `)
    .eq('survey_id', id)
    .neq('status', -1)
    // sadece aktif option'ları saymak istersen şunu ekleyebilirsin:
    // .neq('survey_options.status', -1)
    .order('rank', { ascending: true })

    if (qsErr) throw new Error(qsErr.message)

    setSurvey(sv as Survey)
    setQuestions((qs as Question[]) || [])
  }, [id, supabase])

  // initial load
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        if (!id) return
        setLoading(true)
        await fetchAll()
        if (!alive) return
        setError(null)
      } catch (e: any) {
        if (alive) setError(e?.message || 'Failed to load questions')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [id, fetchAll])

  const nextRank = useMemo(() => {
    if (!questions.length) return 1
    return Math.max(...questions.map(q => q.rank || 0)) + 1
  }, [questions])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    if (!qText.trim()) return notify(undefined, 'Please enter a question.')

    setSaving(true)
    try {
      const insertPayload: Partial<Question> = {
        survey_id: id,
        question: qText.trim(),
        description: qDesc.trim() || null,
        notes: qNotes.trim() || null,
        rank: nextRank,
        status: qStatus,
      }

      const { error: insErr } = await supabase
        .from('survey_questions')
        .insert(insertPayload)

      if (insErr) throw new Error(insErr.message)

      // Re-fetch to keep ranks consistent
      await fetchAll()
      setShowCreate(false)
      setQText(''); setQDesc(''); setQNotes(''); setQStatus(1)
      notify('Question added.')
    } catch (e: any) {
      notify(undefined, e?.message || 'Failed to add question')
    } finally {
      setSaving(false)
    }
  }

  // swap rank with immediate neighbor; then refetch + success toast
  async function move(q: Question, dir: 'up' | 'down') {
    const sorted = [...questions].sort((a, b) => a.rank - b.rank)
    const idx = sorted.findIndex(x => x.id === q.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const a = { ...sorted[idx] }
    const b = { ...sorted[swapIdx] }

    // optimistic UI: produce a new array with swapped ranks
    const newList = sorted.map(x => {
      if (x.id === a.id) return { ...x, rank: b.rank }
      if (x.id === b.id) return { ...x, rank: a.rank }
      return x
    }).sort((x, y) => x.rank - y.rank)

    setQuestions(newList)
    setReorderingId(q.id)

    try {
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from('survey_questions').update({ rank: b.rank }).eq('id', a.id),
        supabase.from('survey_questions').update({ rank: a.rank }).eq('id', b.id),
      ])
      if (e1 || e2) throw new Error(e1?.message || e2?.message || 'Failed to reorder')

      // hard-sync with DB to avoid drift
      await fetchAll()
      notify('Order updated.')
    } catch (err: any) {
      // fallback: reload and show error
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
            { label: survey?.name || 'Survey', href: `/store/surveys/${id}` },
            { label: 'Questions' },
          ]}
        />

        <div className="d-flex align-items-center mb-4">
          <h1 className="mb-0 flex-grow-1">{survey?.name || 'Survey'} — Questions</h1>
          <div className="d-flex gap-2">
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add Question</button>
            <Link href={`/store/surveys/${id}`} className="btn btn-outline-secondary">&lt; Back</Link>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {questions.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body py-5 text-center">
              <h5 className="mb-3">No questions found</h5>
              <div className="mb-4">
                <img
                  src="/images/isometric_add_question.svg"
                  alt="Add Question Icon"
                  width={400}
                  height={400}
                />
              </div>
              <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>
                + Create Your First Question
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
                      <th>Question</th>
                      <th style={{ width: 100 }}>Options</th>
                      <th style={{ width: 100 }}>Status</th>
                      <th style={{ width: 100 }}>Order</th>
                      <th style={{ width: 100 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q, i) => {
                        const oCount = q.question_options?.[0]?.count ?? 0
                        return (
                            <tr key={q.id}>
                                <td>{q.rank}</td>
                                <td>
                                <div className="fw-semibold">{q.question}</div>
                                {q.description && <div className="text-muted small">{q.description}</div>}
                                </td>
                                <td>
                                    {oCount > 0 ? (
                                        <Link
                                        href={`/store/surveys/${id}/questions/${q.id}/options`}
                                        className="text-decoration-none"
                                        >
                                        {oCount}
                                        </Link>
                                    ) : (
                                        '-'
                                    )}
                                </td>
                                <td>{statusBadge(q.status)}</td>
                                <td>
                                <div className="btn-group" role="group" aria-label="Reorder">
                                    <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => move(q, 'up')}
                                    disabled={i === 0 || !!reorderingId}
                                    title="Move up"
                                    >
                                    ↑
                                    </button>
                                    <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => move(q, 'down')}
                                    disabled={i === questions.length - 1 || !!reorderingId}
                                    title="Move down"
                                    >
                                    ↓
                                    </button>
                                </div>
                                </td>
                                <td className="text-end">
                                <div className="btn-group">
                                    <Link
                                    href={`/store/surveys/${id}/questions/${q.id}`}
                                    className="btn btn-sm btn-outline-primary"
                                    title="View"
                                    >
                                    View
                                    </Link>
                                    {/* Remove button is intentionally removed */}
                                </div>
                                </td>
                            </tr>
                        )}
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Create Question Modal */}
        {showCreate && (
          <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,.3)' }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <form onSubmit={handleCreate}>
                  <div className="modal-header">
                    <h5 className="modal-title">Add Question</h5>
                    <button type="button" className="btn-close" onClick={() => setShowCreate(false)}></button>
                  </div>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Question</label>
                      <input
                        className="form-control"
                        value={qText}
                        onChange={e => setQText(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Description (optional)</label>
                      <input
                        className="form-control"
                        value={qDesc}
                        onChange={e => setQDesc(e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Notes (internal)</label>
                      <input
                        className="form-control"
                        value={qNotes}
                        onChange={e => setQNotes(e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        value={qStatus}
                        onChange={e => setQStatus(Number(e.target.value) as 1 | 0 | -1)}
                      >
                        <option value={1}>Active</option>
                        <option value={0}>Paused</option>
                        <option value={-1}>Deleted</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreate(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Saving...' : 'Add Question'}
                    </button>
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
