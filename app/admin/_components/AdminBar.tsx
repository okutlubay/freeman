'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AdminBar() {
  const router = useRouter()
  const [username, setUsername] = useState('Unknown')

  useEffect(() => {
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith('admin_username='))
      ?.split('=')[1]

    const decoded = cookieValue ? decodeURIComponent(cookieValue) : 'Unknown'
    setUsername(decoded)

    if (decoded == 'Unknown') {
      router.push('/admin/login')
    }
  }, [router])

  return <span></span>
}
