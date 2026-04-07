import { createContext } from 'react'
import { User } from '@supabase/supabase-js'

type Role = 'admin' | 'operador' | 'solo_lectura'

export interface Profile {
  id: string
  nombre: string | null
  rol: Role
}

export interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refetchProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)