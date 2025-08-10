'use client'

import { useMemo, useState } from 'react'

type StoreLite = {
  id: string
  customer_id: string
  name: string | null
  logo_url: string | null
  redirect_url: string | null
  survey_complete_html: string | null
  survey_id: string
}

type SurveyLite = {
  id: string
  name: string
  description: string | null
}

type QuestionLite = {
  id: string
  question: string
  description: string | null
  options: { id: string; option: string }[]
}

export default function SurveyClient({
  qrKey,
  store,
  survey,
  questions,
  onSubmitServer,
}: {
  qrKey: string
  store: StoreLite
  survey: SurveyLite
  questions: QuestionLite[]
  onSubmitServer: (payload: {
    qr_key: string
    store_id: string
    customer_id: string
    survey_id: string
    answers: { question_id: string; option_id: string; option: string }[]
  }) => Promise<void>
}) {
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)

  // selections in browser
  const [answers, setAnswers] = useState<Record<string, { option_id: string; option: string }>>({})

  const total = questions.length
  const current = questions[step]

  const progressPct = useMemo(() => {
    if (total === 0) return 0
    return Math.round(((step + 1) / total) * 100)
  }, [step, total])

  const handlePick = (qId: string, optId: string, optText: string) => {
    setAnswers(prev => ({ ...prev, [qId]: { option_id: optId, option: optText } }))
    // auto-advance if not last
    if (step < total - 1) setTimeout(() => setStep(s => s + 1), 120)
  }

  const canGoNext = step < total - 1
  const canGoBack = step > 0

  const handleSubmit = async () => {
    // require answers for all questions
    const missing = questions.find(q => !answers[q.id])
    if (missing) {
      // jump to missing one
      const idx = questions.findIndex(q => q.id === missing.id)
      setStep(idx >= 0 ? idx : 0)
      return
    }
    setBusy(true)
    try {
      await onSubmitServer({
        qr_key: qrKey,
        store_id: store.id,
        customer_id: store.customer_id,
        survey_id: survey.id,
        answers: questions.map(q => ({
          question_id: q.id,
          option_id: answers[q.id].option_id,
          option: answers[q.id].option,
        })),
      })
      // onSubmitServer will redirect to /complete
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container py-3" style={{ maxWidth: 560 }}>
      {/* header / logo */}
      <div className="text-center mb-3">
        {store.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.logo_url}
            alt={store.name || 'Store'}
            style={{ height: 56, objectFit: 'contain' }}
          />
        ) : null}
      </div>

      {/* survey name + desc */}
      <div className="mb-3 text-center">
        <h3 className="mb-1">{survey.name}</h3>
        {survey.description ? (
            <div
            className="text-muted"
            // ✅ HTML olarak bas
            dangerouslySetInnerHTML={{ __html: survey.description }}
            />
        ) : null}
      </div>

      {/* progress */}
      {total > 1 && (
        <div className="mb-3">
          <div className="progress" role="progressbar" aria-label="Survey progress" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-bar" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="text-muted small text-center mt-1">{step + 1} / {total}</div>
        </div>
      )}

      {/* card */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-3">
          {/* question text */}
            <div className="mb-2">
            <div className="fw-semibold" style={{ fontSize: 18 }}>{current.question}</div>
            {current.description ? (
                <div
                className="text-muted small"
                // ✅ HTML olarak bas
                dangerouslySetInnerHTML={{ __html: current.description }}
                />
            ) : null}
          </div>

          {/* options vertical list */}
          <div className="d-grid gap-2 mt-3">
            {current.options.map(op => {
              const picked = answers[current.id]?.option_id === op.id
              return (
                <button
                  key={op.id}
                  type="button"
                  className={`btn btn-lg ${picked ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handlePick(current.id, op.id, op.option)}
                  disabled={busy}
                >
                  {op.option}
                </button>
              )
            })}
          </div>

          {/* nav */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={!canGoBack || busy}
            >
              &lt; Back
            </button>

            {step < total - 1 ? (
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => setStep(s => Math.min(total - 1, s + 1))}
                disabled={!canGoNext || busy}
              >
                Next &gt;
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={busy || !answers[current.id]}
              >
                {busy ? 'Submitting…' : 'Submit'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* small footer spacing */}
      <div style={{ height: 24 }} />
    </div>
  )
}
