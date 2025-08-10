// app/api/admin/users/[id]/metadata/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const raw = String(body?.raw_user_meta_data ?? '').trim()

    let metadata: any = {}
    if (raw.length) {
      try {
        metadata = JSON.parse(raw)
      } catch {
        return NextResponse.json(
          { ok: false, error: 'Metadata must be valid JSON' },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase.auth.admin.updateUserById(params.id, {
      user_metadata: metadata
    })

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      user: { id: data.user?.id, user_metadata: data.user?.user_metadata }
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
