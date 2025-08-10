// app/s/[qr_key]/complete/page.tsx
import 'server-only'
export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export default async function CompletePage({ params }: { params: { qr_key: string } }) {
  const { data: store } = await supabaseAdmin
    .from('stores')
    .select('id, name, logo_url, redirect_url, survey_complete_html')
    .eq('qr_key', params.qr_key)
    .single()

  if (!store) return notFound()

  return (
    <div className="container py-4" style={{ maxWidth: 560 }}>
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

      <div className="card border-0 shadow-sm">
        <div className="card-body p-3">
          <div
            className="border rounded p-3 bg-white"
            dangerouslySetInnerHTML={{ __html: store.survey_complete_html || '<em>Thanks for your feedback!</em>' }}
          />
          <div className="d-grid mt-3">
            <a className="btn btn-primary btn-lg" href={store.redirect_url || '/'} rel="noreferrer">
              Click for Your Reward
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
