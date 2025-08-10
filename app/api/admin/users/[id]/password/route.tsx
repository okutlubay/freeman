import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { password } = await req.json()
  if (!password) return NextResponse.json({ error: 'password required' }, { status: 400 })

  const { error } = await supabase.auth.admin.updateUserById(params.id, { password })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
