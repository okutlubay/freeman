// app/s/[qr_key]/page.tsx
import 'server-only'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'default-no-store'

import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Suspense } from 'react'
import SurveyClient from './survey-client'

// Admin (service-role) client ONLY for server side / server actions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Fetch everything the client UI needs (store + survey + questions + options)
async function loadData(qr_key: string) {
  // get store with active survey_id
  const { data: store, error: stErr } = await supabaseAdmin
    .from('stores')
    .select('id, customer_id, name, logo_url, redirect_url, survey_complete_html, survey_id, status')
    .eq('qr_key', qr_key)
    .single()
  if (stErr || !store) return { kind: 'not_found' as const }

  // must have an active survey_id
  if (!store.survey_id) return { kind: 'no_active' as const, store }
  // fetch survey and ensure status=1
  const { data: survey, error: svErr } = await supabaseAdmin
    .from('surveys')
    .select('id, customer_id, name, description, status')
    .eq('id', store.survey_id)
    .single()
  if (svErr || !survey) return { kind: 'no_active' as const, store }
  if (survey.status !== 1) return { kind: 'not_active' as const, store, survey }

  // questions (status=1, ordered by rank)
  const { data: questions, error: qErr } = await supabaseAdmin
    .from('survey_questions')
    .select('id, question, description, rank, status')
    .eq('survey_id', survey.id)
    .eq('status', 1)
    .order('rank', { ascending: true })
  if (qErr) throw new Error(qErr.message)

  // options (status=1, ordered by rank) per question
  const { data: options, error: oErr } = await supabaseAdmin
    .from('survey_options')
    .select('id, question_id, option, rank, status')
    .in('question_id', (questions || []).map(q => q.id))
    .eq('status', 1)
    .order('rank', { ascending: true })

  if (oErr) throw new Error(oErr.message)

  // group options by question_id
  const optMap: Record<string, { id: string; option: string }[]> = {}
  for (const op of options || []) {
    if (!optMap[op.question_id]) optMap[op.question_id] = []
    optMap[op.question_id].push({ id: op.id, option: op.option })
  }

  return {
    kind: 'ok' as const,
    store,
    survey,
    questions: (questions || []).map(q => ({
      id: q.id,
      question: q.question,
      description: q.description,
      options: optMap[q.id] || [],
    })),
  }
}

// Server Action: persist transaction + responses, then redirect to /complete
async function submitSurvey(payload: {
  qr_key: string
  store_id: string
  customer_id: string
  survey_id: string
  answers: { question_id: string; option_id: string; option: string }[]
}) {
  'use server'
  const h = headers()
  const ip = (h.get('x-forwarded-for') || h.get('cf-connecting-ip') || h.get('x-real-ip') || '').split(',')[0] || 'unknown'
  const ua = (h.get('user-agent') || '').toLowerCase()
  const medium = ua.includes('mobile') ? 'mobile' : 'web'

  // 1) Insert a transaction with amount = -1 (type=11)
  const { data: tx, error: txErr } = await supabaseAdmin
    .from('transactions')
    .insert({
      customer_id: payload.customer_id,
      store_id: payload.store_id,
      transaction_type: 11,
      medium,
      details: 'Survey completion',
      currency: 'USD',
      amount: -1,
      status: 1,
    })
    .select('id')
    .single()
  if (txErr) throw new Error(txErr.message)

  const response_id = (globalThis as any).crypto?.randomUUID?.() || require('crypto').randomUUID()

  // 2) Insert survey_responses, one row per answer
  const now = new Date().toISOString()
  const rows = payload.answers.map(a => ({
    response_id,
    store_id: payload.store_id,
    survey_id: payload.survey_id,
    survey_question_id: a.question_id,
    survey_option_id: a.option_id,
    response_option: a.option,
    ip_address: ip,
    transaction_id: tx.id,
    submitted_at: now,
  }))

  const { error: respErr } = await supabaseAdmin.from('survey_responses').insert(rows)
  if (respErr) throw new Error(respErr.message)

  // 3) Done → go to completion page
  redirect(`/s/${payload.qr_key}/complete`)
}

export default async function Page({ params }: { params: { qr_key: string } }) {
  const data = await loadData(params.qr_key)

  if (data.kind === 'not_found') return notFound()
  if (data.kind === 'no_active' || data.kind === 'not_active') {
    // Simple error screen
    return (
      <div className="container py-5" style={{ maxWidth: 560 }}>
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4 text-center">
            <h4 className="mb-3">Survey Unavailable</h4>
            <p className="text-muted mb-0">
              This location does not have an active survey at the moment.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const { store, survey, questions } = data

  return (
    <Suspense>
      <SurveyClient
        qrKey={params.qr_key}
        store={store}
        survey={survey}
        questions={questions}
        onSubmitServer={submitSurvey}
      />
    </Suspense>
  )
}
