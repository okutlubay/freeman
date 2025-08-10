// app/admin/layout.tsx
import '../../styles/globals.css'
import AdminBar from './_components/AdminBar'

export const metadata = {
  title: 'Admin Area',
  description: 'Freeman Admin Panel',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>
        <AdminBar />
        {children}
      </body>
    </html>
  )
}