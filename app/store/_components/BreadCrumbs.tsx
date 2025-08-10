'use client'

import Link from 'next/link'

interface BreadCrumbsProps {
  items: { label: string, href?: string }[]
}

export default function BreadCrumbs({ items }: BreadCrumbsProps) {
  return (
    <nav aria-label="breadcrumb">
      <ol className="breadcrumb">
        {items.map((item, i) => (
          <li
            key={i}
            className={`breadcrumb-item ${i === items.length - 1 ? 'active' : ''}`}
            {...(i === items.length - 1 ? { 'aria-current': 'page' } : {})}
          >
            {item.href ? <Link href={item.href}>{item.label}</Link> : item.label}
          </li>
        ))}
      </ol>
    </nav>
  )
}