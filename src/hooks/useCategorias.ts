import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface Categoria {
  id:     string
  nombre: string
}

type TipoCategoria = 'ingreso' | 'gasto'

const TABLA: Record<TipoCategoria, string> = {
  ingreso: 'categorias_ingreso',
  gasto:   'categorias_gasto',
}

export function useCategorias(tipo: TipoCategoria) {
  const { user, profile } = useAuth()
  const isAdmin        = profile?.rol === 'admin'
  const initializedRef = useRef(false)

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const tabla = TABLA[tipo]

  const fetchCategorias = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    // Solo mostrar spinner en la primera carga
    if (!initializedRef.current) setLoading(true)

    try {
      setError(null)

      const { data, error: fetchError } = await supabase
        .from(tabla)
        .select('id, nombre')
        .order('nombre')

      if (fetchError) throw fetchError
      setCategorias(data as Categoria[])
      initializedRef.current = true
    } catch (err: any) {
      if (err?.message?.includes('AbortError') || err?.details?.includes('AbortError')) return
      console.error(`useCategorias(${tipo}) — fetchError:`, err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user, tabla])

  useEffect(() => {
    fetchCategorias()
  }, [fetchCategorias])

  const addCategoria = async (nombre: string) => {
    if (!isAdmin) return { data: null, error: 'Sin permisos' }

    try {
      const { data, error } = await supabase
        .from(tabla)
        .insert([{ nombre }])
        .select('id, nombre')
        .single()

      if (error) throw error

      setCategorias(prev =>
        [...prev, data as Categoria].sort((a, b) => a.nombre.localeCompare(b.nombre))
      )
      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  const deleteCategoria = async (id: string) => {
    if (!isAdmin) return { error: 'Sin permisos' }

    try {
      const { error } = await supabase.from(tabla).delete().eq('id', id)
      if (error) throw error

      setCategorias(prev => prev.filter(c => c.id !== id))
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  return {
    categorias,
    loading,
    error,
    addCategoria,
    deleteCategoria,
    refetch: fetchCategorias,
    canWrite: isAdmin,
  }
}