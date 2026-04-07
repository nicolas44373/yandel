import React, {
  useEffect,
  useState,
  useCallback,
  useRef
} from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { AuthContext, Profile } from '@/contexts/AuthContext'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const mountedRef = useRef(true)

  // 🔑 Control de concurrencia (evita race conditions)
  const fetchIdRef = useRef(0)

  // -------------------------------
  // FETCH PROFILE (NO BLOQUEANTE)
  // -------------------------------
  const fetchProfile = useCallback(async (userId: string) => {
    const fetchId = ++fetchIdRef.current

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, rol')
        .eq('id', userId)
        .single()

      // Ignorar si hay una request más nueva
      if (!mountedRef.current || fetchId !== fetchIdRef.current) return

      if (error) throw error

      setProfile(data as Profile)
    } catch (err: any) {
      if (!mountedRef.current) return

      const msg = err?.message || ''

      // 🔇 Ignorar errores normales de cambio de tab / lock
      if (
        msg.includes('AbortError') ||
        msg.includes('Lock') ||
        msg.includes('steal')
      ) {
        return
      }

      console.error('Error fetching profile:', err)
    }
  }, [])

  // -------------------------------
  // INIT + AUTH LISTENER
  // -------------------------------
  useEffect(() => {
    mountedRef.current = true
    let initialized = false

    // -------- INIT --------
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!mountedRef.current) return

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          fetchProfile(currentUser.id) // ❗ sin await
        }
      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        if (mountedRef.current && !initialized) {
          initialized = true
          setLoading(false)
        }
      }
    }

    init()

    // -------- LISTENER --------
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) return

        const currentUser = session?.user ?? null
        setUser(currentUser)

        switch (event) {
          case 'INITIAL_SESSION':
          case 'SIGNED_IN':
            if (currentUser) fetchProfile(currentUser.id)
            break

          case 'TOKEN_REFRESHED':
            // 🔥 No loading, no await
            if (currentUser) fetchProfile(currentUser.id)
            break

          case 'SIGNED_OUT':
            setProfile(null)
            break
        }

        if (!initialized) {
          initialized = true
          setLoading(false)
        }
      }
    )

    // -------- TIMEOUT (SAFE) --------
    const timeout = setTimeout(() => {
      if (!initialized && mountedRef.current) {
        console.warn('Auth timeout → solo quitando loading')
        setLoading(false)
        initialized = true
      }
    }, 8000)

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [fetchProfile])

  // -------------------------------
  // REFETCH PROFILE
  // -------------------------------
  const refetchProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser && mountedRef.current) {
      fetchProfile(currentUser.id)
    }
  }, [fetchProfile])

  // -------------------------------
  // SIGN OUT
  // -------------------------------
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signOut,
        refetchProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}