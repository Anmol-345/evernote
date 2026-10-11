"use client"

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export default function Sidebar() {
  const [open, setOpen] = useState(false)

  const pages = [
    { id: '1', title: 'Welcome' },
    { id: '2', title: 'Projects' },
    { id: '3', title: 'Learning' },
    { id: '4', title: 'Reference' },
  ]

  return (
    <aside className="w-64 h-screen bg-card border-r border-border flex-shrink-0 shadow-sm flex flex-col">
      <header className="h-16 border-b border-border flex items-center px-4">
        <h2 className="font-bold text-lg">Second Brain</h2>
        <button
          onClick={() => setOpen(!open)}
          className="ml-auto p-2 rounded hover:bg-accent"
          aria-label="Toggle sidebar"
        >
          {open ? '❙❙' : '☰'}
        </button>
      </header>

      <nav className="flex-1 overflow-y-auto flex flex-col pt-2">
        <ul className="space-y-1 px-2">
          {pages.map((page) => (
            <li key={page.id} className="hover:bg-accent rounded px-2 py-1">
              <Link href={`/pages/${page.id}`} className="text-sm font-medium text-foreground">
                {page.title}
              </Link>
            </li>
          ))}
        </ul>

        {/* New Page button */}
        <div className="mt-4 pt-4 border-t border-border">
          <button
            onClick={() => alert('Create new page')}
            className="w-full text-sm text-primary hover:underline"
          >
            + New Page
          </button>
        </div>
      </nav>
    </aside>
  )
}