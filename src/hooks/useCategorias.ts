import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface Categoria {
  id: string
  nombre: string
}

export function useCategorias(tipo: 'ingreso' | 'gasto') {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tabla = tipo === 'ingreso' ? 'categorias_ingreso' : 'categorias_gasto'

  const fetchCategorias = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from(tabla)
        .select('id, nombre')
        .order('nombre')

      if (error) throw error

      setCategorias(data as Categoria[])
    } catch (err: any) {
      console.error(`Error fetching ${tabla}:`, err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategorias()
  }, [tipo])

  const addCategoria = async (nombre: string) => {
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
    try {
      const { error } = await supabase
        .from(tabla)
        .delete()
        .eq('id', id)

      if (error) throw error

      setCategorias(prev => prev.filter(c => c.id !== id))
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  return { categorias, loading, error, addCategoria, deleteCategoria, refetch: fetchCategorias }
}