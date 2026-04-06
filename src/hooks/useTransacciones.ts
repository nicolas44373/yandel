import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Transaccion, TipoTransaccion } from '@/types'

export function useTransacciones(tipo?: TipoTransaccion) {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransacciones = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('transacciones')
        .select(`
          *,
          categoria_ingreso:categorias_ingreso!categoria_ingreso_id(nombre),
          categoria_gasto:categorias_gasto!categoria_gasto_id(nombre)
        `)
        .order('fecha', { ascending: false })

      if (tipo) {
        query = query.eq('tipo', tipo)
      }

      const { data, error } = await query
      if (error) throw error

      setTransacciones(data as any)
    } catch (err: any) {
      console.error('Error fetching transacciones:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransacciones()
  }, [tipo])

  const addTransaccion = async (transaccion: Partial<Transaccion>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('transacciones')
        .insert([{ ...transaccion, user_id: user?.id ?? null }])
        .select(`
          *,
          categoria_ingreso:categorias_ingreso!categoria_ingreso_id(nombre),
          categoria_gasto:categorias_gasto!categoria_gasto_id(nombre)
        `)
        .single()

      if (error) throw error

      setTransacciones(prev => [data as any, ...prev])
      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  const deleteTransaccion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transacciones')
        .delete()
        .eq('id', id)

      if (error) throw error

      setTransacciones(prev => prev.filter(t => t.id !== id))
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  return { transacciones, loading, error, addTransaccion, deleteTransaccion, refetch: fetchTransacciones }
}