import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await supabase.auth.admin.updateUserById(params.id, {
    email_confirm: true as any
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
