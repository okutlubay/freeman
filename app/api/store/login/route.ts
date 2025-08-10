export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function POST(req: Request) {
  const { email, password } = await req.json()
  const supabase = createRouteHandlerClient({ cookies })

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 401 })

  const { data: userRes } = await supabase.auth.getUser()
  const user = userRes.user
  if (!user) {
    await supabase.auth.signOut()
    return NextResponse.json({ ok: false, error: 'User not found.' }, { status: 401 })
  }

  if (user.user_metadata?.is_super_admin) {
    await supabase.auth.signOut()
    return NextResponse.json({ ok: false, error: 'You are not authorized to access the store panel.' }, { status: 403 })
  }

  const customerId = (user.user_metadata as any)?.customer_id
  if (!customerId) {
    await supabase.auth.signOut()
    return NextResponse.json({ ok: false, error: 'No customer linked to this account.' }, { status: 403 })
  }

  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('status')
    .eq('id', customerId)
    .single()

  if (custErr || !customer || customer.status !== 1) {
    await supabase.auth.signOut()
    return NextResponse.json({ ok: false, error: 'Your account is not active. Please contact support.' }, { status: 403 })
  }

  return NextResponse.json({ ok: true, email: user.email })
}
