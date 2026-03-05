import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CierreCaja } from '@/types'

const INITIAL_MOCK_CAJA: CierreCaja = {
  id: '1',
  fecha_apertura: new Date().toISOString(),
  saldo_apertura: 25000,
  estado: 'abierta',
}

const getMockCajaHistorial = (): CierreCaja[] => {
  const stored = localStorage.getItem('mock_caja_historial')
  if (stored) {
    return JSON.parse(stored)
  }
  localStorage.setItem('mock_caja_historial', JSON.stringify([INITIAL_MOCK_CAJA]))
  return [INITIAL_MOCK_CAJA]
}

const saveMockCajaHistorial = (data: CierreCaja[]) => {
  localStorage.setItem('mock_caja_historial', JSON.stringify(data))
}

export function useCaja() {
  const [cajaActual, setCajaActual] = useState<CierreCaja | null>(null)
  const [historial, setHistorial] = useState<CierreCaja[]>([])
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)

  const fetchCaja = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('cierres_caja')
        .select('*')
        .order('fecha_apertura', { ascending: false })

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('FetchError') || error.message.includes('Failed to fetch')) {
          setIsMock(true)
          const mockHistorial = getMockCajaHistorial()
          setHistorial(mockHistorial)
          if (mockHistorial.length > 0 && mockHistorial[0].estado === 'abierta') {
            setCajaActual(mockHistorial[0])
          } else {
            setCajaActual(null)
          }
          return
        }
        throw error
      }
      
      setIsMock(false)
      if (data && data.length > 0) {
        if (data[0].estado === 'abierta') {
          setCajaActual(data[0] as CierreCaja)
        } else {
          setCajaActual(null)
        }
        setHistorial(data as CierreCaja[])
      } else {
        setCajaActual(null)
        setHistorial([])
      }
    } catch (err) {
      console.error("Error fetching caja", err)
      setIsMock(true)
      const mockHistorial = getMockCajaHistorial()
      setHistorial(mockHistorial)
      if (mockHistorial.length > 0 && mockHistorial[0].estado === 'abierta') {
        setCajaActual(mockHistorial[0])
      } else {
        setCajaActual(null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCaja()
  }, [])

  const abrirCaja = async (saldoApertura: number) => {
    if (isMock) {
      const nuevaCaja: CierreCaja = {
        id: Math.random().toString(),
        fecha_apertura: new Date().toISOString(),
        saldo_apertura: saldoApertura,
        estado: 'abierta',
      }
      const currentHistorial = getMockCajaHistorial()
      const updatedHistorial = [nuevaCaja, ...currentHistorial]
      saveMockCajaHistorial(updatedHistorial)

      setCajaActual(nuevaCaja)
      setHistorial(updatedHistorial)
      return { data: nuevaCaja, error: null }
    }

    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id

      const nuevaCaja = {
        fecha_apertura: new Date().toISOString(),
        saldo_apertura: saldoApertura,
        estado: 'abierta',
        user_id: userId || null
      }

      const { data, error } = await supabase
        .from('cierres_caja')
        .insert([nuevaCaja])
        .select()
        .single()

      if (error) throw error
      
      setCajaActual(data as CierreCaja)
      setHistorial(prev => [data as CierreCaja, ...prev])
      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  const cerrarCaja = async (id: string, efectivoContado: number, observaciones?: string) => {
    if (isMock) {
      const updateData = {
        ...cajaActual!,
        estado: 'cerrada' as const,
        fecha_cierre: new Date().toISOString(),
        efectivo_contado: efectivoContado,
        observaciones: observaciones || undefined
      }
      
      const currentHistorial = getMockCajaHistorial()
      const updatedHistorial = currentHistorial.map(c => c.id === id ? updateData : c)
      saveMockCajaHistorial(updatedHistorial)

      setCajaActual(null)
      setHistorial(updatedHistorial)
      return { data: updateData, error: null }
    }

    try {
      const updateData = {
        estado: 'cerrada',
        fecha_cierre: new Date().toISOString(),
        efectivo_contado: efectivoContado,
        observaciones: observaciones || null
      }

      const { data, error } = await supabase
        .from('cierres_caja')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      
      setCajaActual(null)
      setHistorial(prev => prev.map(c => c.id === id ? data as CierreCaja : c))
      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  return { cajaActual, historial, loading, abrirCaja, cerrarCaja, refetch: fetchCaja }
}
