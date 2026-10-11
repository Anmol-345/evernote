import { supabase } from '@/lib/supabase'
import { useEffect, useState, useCallback } from 'react'
import type { Block, Page } from '@/types/block.types'

export type { Block, Page }

export interface UserSession {
  userId: string
  email: string | null
  name: string | null
}

export function useAuth() {
  const [user, setUser] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)

  // Get initial session on mount
  useEffect(() => {
    // Get session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          userId: session.user.id,
          email: session.user.email ?? null,
          name: session.user.user_metadata?.full_name || null,
        })
      }
      setLoading(false)
    })
  }, [])

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser({
            userId: session.user.id,
            email: session.user.email ?? null,
            name: session.user.user_metadata?.full_name || null,
          })
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const isLoading = () => loading && !user

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    isLoading,
  }
}