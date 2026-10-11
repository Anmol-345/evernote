"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'

type PageNode = {
  id: string
  title: string
  parentId: string | null
  children: PageNode[]
}

export default function PageTree() {
  const [pages, setPages] = useState<PageNode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch pages from Supabase
    // This is a placeholder - real implementation would use Supabase client
    const mockPages: PageNode[] = [
      {
        id: '1',
        title: 'Welcome',
        parentId: null,
        children: [
          {
            id: '1-1',
            title: 'Getting Started',
            parentId: '1',
            children: [],
          },
        ],
      },
    ]

    setPages(mockPages)
    setLoading(false)
  }, [])

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground">Loading pages...</div>
  }

  return (
    <div className="border rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
      {pages.map((node) => (
        <div key={node.id} className="space-y-1">
          <Link
            href={`/pages/${node.id}`}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {node.title}
          </Link>
          {node.children.length > 0 && (
            <div className="ml-4 text-xs text-muted-foreground">
              {node.children.map((child) => (
                <span key={child.id} className="inline-block mx-1 px-1 rounded text-xxs bg-background">
                  {child.title}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}