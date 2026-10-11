"use client"

import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import PageEditor from '@/components/page-editor'

export default function PageEditorScreen() {
  const { user } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Extract pageId from pathname: /(dashboard)/pages/[pageId]/page
  const pathParts = pathname.split('/')
  const pageId = pathParts[pathParts.length - 2] // The [pageId] segment

  const [pageTitle, setPageTitle] = useState('')
  const [blocks, setBlocks] = useState<any[]>([])
  const [revision, setRevision] = useState(1)
  const [serverRevision, setServerRevision] = useState(1)

  useEffect(() => {
    if (pageId && user) {
      fetchPageData()
    }
  }, [pageId, user?.userId])

  const fetchPageData = async () => {
    try {
      // Fetch page
      const { data: page, error: pageError } = await supabase
        .from('pages')
        .select('*')
        .eq('id', pageId)
        .eq('user_id', user?.userId)
        .single()

      if (pageError) throw pageError
      setPageTitle(page?.title || 'Untitled')

      // Fetch blocks
      const { data: blockData, error: blockError } = await supabase
        .from('blocks')
        .select('*')
        .eq('page_id', pageId)
        .order('position')

      if (blockError) throw blockError
      setBlocks(blockData || [])
      setServerRevision(page?.revision ?? 1)
    } catch (err) {
      console.error('Failed to fetch page data:', err)
    }
  }

  if (!pageId || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <h2 className="text-2xl font-bold">Sign in to access your brain</h2>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <h1 className="text-2xl font-bold mb-4">{pageTitle}</h1>

      <PageEditor pageId={pageId} />
    </div>
  )
}