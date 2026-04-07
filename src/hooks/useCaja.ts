import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { CierreCaja } from '@/types'

export interface CierreCajaConEmpleado extends CierreCaja {
  profiles?: { nombre: string | null } | null
}

export function useCaja() {
  const { user, profile } = useAuth()
  const isAdmin           = profile?.rol === 'admin'
  const initializedRef    = useRef(false)

  const [cajaActual, setCajaActual] = useState<CierreCajaConEmpleado | null>(null)
  const [historial, setHistorial]   = useState<CierreCajaConEmpleado[]>([])
  const [loading, setLoading]       = useState(true)

  const fetchCaja = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    // Solo mostrar spinner en la primera carga
    if (!initializedRef.current) setLoading(true)

    try {
      let query = supabase
        .from('cierres_caja')
        .select('*')
        .order('fecha_apertura', { ascending: false })

      if (!isAdmin) query = query.eq('user_id', user.id)

      const { data, error } = await query
      if (error) throw error

      let registros = (data ?? []) as CierreCajaConEmpleado[]

      if (isAdmin && registros.length > 0) {
        const userIds = [
          ...new Set(registros.map(c => c.user_id).filter(Boolean))
        ] as string[]

        if (userIds.length > 0) {
          const { data: perfiles } = await supabase
            .from('profiles')
            .select('id, nombre')
            .in('id', userIds)

          const mapaPerfiles: Record<string, string | null> = Object.fromEntries(
            (perfiles ?? []).map(p => [p.id, p.nombre])
          )

          registros = registros.map(c => ({
            ...c,
            profiles: c.user_id
              ? { nombre: mapaPerfiles[c.user_id] ?? null }
              : null,
          }))
        }
      }

      setHistorial(registros)

      const abierta = isAdmin
        ? registros.find(c => c.estado === 'abierta') ?? null
        : registros.find(c => c.estado === 'abierta' && c.user_id === user.id) ?? null

      setCajaActual(abierta)
      initializedRef.current = true
    } catch (err: any) {
      if (err?.message?.includes('AbortError') || err?.details?.includes('AbortError')) return
      console.error('useCaja — fetchError:', err)
    } finally {
      setLoading(false)
    }
  }, [user, isAdmin])

  useEffect(() => {
    fetchCaja()
  }, [fetchCaja])

  const abrirCaja = async (saldoApertura: number) => {
    if (!user) return { data: null, error: 'No autenticado' }

    try {
      const { data, error } = await supabase
        .from('cierres_caja')
        .insert([{
          fecha_apertura: new Date().toISOString(),
          saldo_apertura: saldoApertura,
          estado:         'abierta',
          user_id:        user.id,
        }])
        .select()
        .single()

      if (error) throw error

      const nueva: CierreCajaConEmpleado = {
        ...(data as CierreCaja),
        profiles: { nombre: profile?.nombre ?? null },
      }

      setCajaActual(nueva)
      setHistorial(prev => [nueva, ...prev])
      return { data: nueva, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  const cerrarCaja = async (id: string, efectivoContado: number, observaciones?: string) => {
    try {
      const { data, error } = await supabase
        .from('cierres_caja')
        .update({
          estado:           'cerrada',
          fecha_cierre:     new Date().toISOString(),
          efectivo_contado: efectivoContado,
          observaciones:    observaciones ?? null,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const cerrada = data as CierreCajaConEmpleado
      setCajaActual(null)
      setHistorial(prev => prev.map(c => c.id === id ? cerrada : c))
      return { data: cerrada, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  const totalCajasAbiertas = historial
    .filter(c => c.estado === 'abierta')
    .reduce((sum, c) => sum + c.saldo_apertura, 0)

  return {
    cajaActual,
    historial,
    loading,
    abrirCaja,
    cerrarCaja,
    refetch: fetchCaja,
    isAdmin,
    totalCajasAbiertas,
  }
}