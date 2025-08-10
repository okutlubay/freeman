'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const supabase = createClientComponentClient()
    const router = useRouter()
    const [session, setSession] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!session && !loading) {
                router.push('/admin/login')
            }
        }, 200)

        return () => clearTimeout(timeout)
    }, [session, loading, router])

    return (
        <div className="d-flex">
        <nav
            className="d-flex flex-column flex-shrink-0 p-3 bg-dark text-white"
            style={{ width: '250px', minHeight: '100vh' }}
        >
            <a href="/admin/customers" className="d-flex align-items-center mb-3 text-white text-decoration-none">
            <i className="bi bi-speedometer2 me-2"></i>
            <span className="fs-5">Admin Panel</span>
            </a>
            <hr className="border-secondary" />
            <ul className="nav nav-pills flex-column mb-auto">
            <li className="nav-item">
                <a href="/admin/customers" className="nav-link text-white">
                <i className="bi bi-people me-2"></i>
                Customers
                </a>
            </li>
            </ul>
            <hr className="border-secondary" />
            <a href="/admin/logout" className="text-white text-decoration-none">
            <i className="bi bi-box-arrow-right me-2"></i>
            Logout
            </a>
        </nav>

        <main className="flex-grow-1 p-4 bg-light" style={{ minHeight: '100vh' }}>
            {children}
        </main>
        </div>
    )
}