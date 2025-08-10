import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { data: authData, error: authError } = await supabase.auth.admin.getUserById(params.id)
  if (authError || !authData?.user) {
    return NextResponse.json({ error: authError?.message || 'User not found' }, { status: 400 })
  }

  const { data: appUser, error: appError } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('id', params.id)
    .maybeSingle()

  return NextResponse.json({
    email: authData.user.email || '',
    password: '',
    email_confirmed_at: authData.user.email_confirmed_at || null,
    raw_user_meta_data: JSON.stringify(authData.user.user_metadata || {}, null, 2),
    is_super_admin: Boolean(appUser?.is_super_admin)
  })
}