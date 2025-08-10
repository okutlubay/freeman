'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function LogoutPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const signOut = async () => {
      await supabase.auth.signOut()
      document.cookie = 'admin_username=; Path=/; Max-Age=0; SameSite=Lax'
      router.push('/admin/login')
    }
    signOut()
  }, [router, supabase])

  return (
    <div className="container py-5 text-center">
      <h2>Logging out...</h2>
    </div>
  )
}