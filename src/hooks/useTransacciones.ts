import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Transaccion, TipoTransaccion } from '@/types'

export interface TransaccionConRelaciones extends Transaccion {
  categoria_ingreso: { nombre: string } | null
  categoria_gasto:   { nombre: string } | null
  empleado_nombre:   string | null
}

const SELECT_QUERY = `
  *,
  categoria_ingreso:categorias_ingreso!categoria_ingreso_id(nombre),
  categoria_gasto:categorias_gasto!categoria_gasto_id(nombre)
` as const

export function useTransacciones(tipo?: TipoTransaccion) {
  const { user, profile } = useAuth()
  const isAdmin = profile?.rol === 'admin'

  const [transacciones, setTransacciones] = useState<TransaccionConRelaciones[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)

  const fetchTransacciones = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('transacciones')
        .select(SELECT_QUERY)
        .order('fecha', { ascending: false })

      if (tipo)     query = query.eq('tipo', tipo)
      if (!isAdmin) query = query.eq('user_id', user.id)

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError

      let resultado = (data as TransaccionConRelaciones[]).map(t => ({
        ...t,
        empleado_nombre: null as string | null,
      }))

      if (isAdmin && resultado.length > 0) {
        const userIds = [
          ...new Set(resultado.map(t => t.user_id).filter(Boolean))
        ] as string[]

        if (userIds.length > 0) {
          const { data: perfiles } = await supabase
            .from('profiles')
            .select('id, nombre')
            .in('id', userIds)

          const mapaPerfiles: Record<string, string | null> = Object.fromEntries(
            (perfiles ?? []).map(p => [p.id, p.nombre])
          )

          resultado = resultado.map(t => ({
            ...t,
            empleado_nombre: t.user_id ? (mapaPerfiles[t.user_id] ?? null) : null,
          }))
        }
      }

      setTransacciones(resultado)
    } catch (err: any) {
      console.error('useTransacciones — fetchError:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user, isAdmin, tipo])

  useEffect(() => {
    fetchTransacciones()
  }, [fetchTransacciones])

  const addTransaccion = async (transaccion: Partial<Transaccion>) => {
    if (!user) return { data: null, error: 'No autenticado' }

    try {
      const { data, error: insertError } = await supabase
        .from('transacciones')
        .insert([{ ...transaccion, user_id: user.id }])
        .select(SELECT_QUERY)
        .single()

      if (insertError) throw insertError

      const nueva: TransaccionConRelaciones = {
        ...(data as TransaccionConRelaciones),
        empleado_nombre: profile?.nombre ?? null,
      }

      setTransacciones(prev => [nueva, ...prev])
      return { data: nueva, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  const deleteTransaccion = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('transacciones')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setTransacciones(prev => prev.filter(t => t.id !== id))
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  return {
    transacciones,
    loading,
    error,
    isAdmin,
    addTransaccion,
    deleteTransaccion,
    refetch: fetchTransacciones,
  }
}