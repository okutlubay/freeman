// app/admin/layout.tsx
import '../../styles/globals.css'

export const metadata = {
  title: 'Store Dashboard',
  description: 'Freeman Store Dashboard',
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>
        {children}
      </body>
    </html>
  )
}