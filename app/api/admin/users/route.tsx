import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { email, password, is_super_admin, customer_id } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ ok:false, error:'email and password are required' }, { status: 400 })
    }
    if (!is_super_admin && !customer_id) {
      return NextResponse.json({ ok:false, error:'customer_id is required for non-super users' }, { status: 400 })
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        is_super_admin: !!is_super_admin,
        customer_id: is_super_admin ? null : customer_id
      },
      app_metadata: { role: is_super_admin ? 'super_admin' : 'user' }
    })
    if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 400 })

    return NextResponse.json({ ok:true, user: { id: data.user?.id, email: data.user?.email } })
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
