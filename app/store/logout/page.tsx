// app/store/logout/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function LogoutPage() {
  const router = useRouter()
  const supabase = createClientComponentClient({ isSingleton: true })

  useEffect(() => {
    const run = async () => {
      try {
        // Client oturumu (localStorage) + Server cookie aynı anda temizle
        await Promise.allSettled([
          supabase.auth.signOut(), // client-side
          fetch('/api/store/logout', { method: 'POST', credentials: 'include' }), // server-side
        ])
      } catch {
        // ignore
      } finally {
        // Tamamlandıktan sonra yönlendir
        router.replace('/store/login')
      }
    }
    run()
  }, [router, supabase])

  return (
    <div className="container py-5 text-center">
      <h2>Logging out...</h2>
    </div>
  )
}
