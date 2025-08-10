import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { pathname } = req.nextUrl

  const isAuthPage = pathname.startsWith('/store/login')
  const isStatic   = pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.startsWith('/public')
  if (isStatic || isAuthPage) return res

  if (pathname.startsWith('/store')) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      const url = new URL('/store/login', req.url)
      url.searchParams.set('r', pathname)
      return NextResponse.redirect(url)
    }
  }
  return res
}

export const config = { matcher: ['/store/:path*'] }
