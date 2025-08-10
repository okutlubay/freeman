// app/s/[qr_key]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function SurveyPage({ params }: { params: { qr_key: string } }) {
  const key = params.qr_key
  const { data: store, error } = await supabase.from('stores').select('*, customers(*)').eq('qr_key', key).single()
  if (!store) return notFound()

  const ip = headers().get('x-forwarded-for') || 'unknown'

  async function handleSubmit(formData: FormData) {
    'use server'
    const choice = formData.get('choice') as string

    await supabase.from('survey_responses').insert({
      store_id: store.id,
      choice,
      ip
    })

    // Simulate $1 deduction
    if (store.customers?.id) {
      await supabase.rpc('deduct_balance', {
        customer_id_input: store.customers.id,
        amount_input: 1
      })
    }

    redirect(store.redirect_url)
  }

  return (
    <div className="container py-5" style={{ maxWidth: '480px' }}>
      <h2 className="mb-4 text-center">How did you hear about us?</h2>

      <form action={handleSubmit}>
        <div className="form-check mb-3">
          <input className="form-check-input" type="radio" name="choice" value="Facebook Ads" required />
          <label className="form-check-label">Facebook Ads</label>
        </div>
        <div className="form-check mb-3">
          <input className="form-check-input" type="radio" name="choice" value="Google Ads" required />
          <label className="form-check-label">Google Ads</label>
        </div>
        <div className="form-check mb-3">
          <input className="form-check-input" type="radio" name="choice" value="Google Maps" required />
          <label className="form-check-label">Google Maps</label>
        </div>
        <div className="form-check mb-4">
          <input className="form-check-input" type="radio" name="choice" value="Other" required />
          <label className="form-check-label">Other</label>
        </div>

        <button type="submit" className="btn btn-primary w-100">
          Submit
        </button>
      </form>
    </div>
  )
}