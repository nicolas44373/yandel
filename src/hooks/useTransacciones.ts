import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Transaccion, TipoTransaccion } from '@/types'

const INITIAL_MOCK_TRANSACCIONES: any[] = [
  { id: '1', tipo: 'ingreso', fecha: new Date().toISOString(), concepto: 'Tatuaje brazo completo', categoria_ingreso: { nombre: 'Tatuaje' }, medio_pago: 'transferencia', monto: 150000, user_id: '1', created_at: new Date().toISOString() },
  { id: '2', tipo: 'gasto', fecha: new Date().toISOString(), concepto: 'Alquiler local', categoria_gasto: { nombre: 'Alquiler y servicios' }, medio_pago: 'transferencia', monto: 250000, user_id: '1', created_at: new Date().toISOString() },
  { id: '3', tipo: 'ingreso', fecha: new Date().toISOString(), concepto: 'Piercing nariz', categoria_ingreso: { nombre: 'Piercing' }, medio_pago: 'efectivo', monto: 15000, user_id: '1', created_at: new Date().toISOString() },
]

const getMockTransacciones = () => {
  const stored = localStorage.getItem('mock_transacciones')
  if (stored) {
    return JSON.parse(stored)
  }
  localStorage.setItem('mock_transacciones', JSON.stringify(INITIAL_MOCK_TRANSACCIONES))
  return INITIAL_MOCK_TRANSACCIONES
}

const saveMockTransacciones = (data: any[]) => {
  localStorage.setItem('mock_transacciones', JSON.stringify(data))
}

export function useTransacciones(tipo?: TipoTransaccion) {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMock, setIsMock] = useState(false)

  const fetchTransacciones = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('transacciones')
        .select(`
          *,
          categoria_ingreso:categorias_ingreso(nombre),
          categoria_gasto:categorias_gasto(nombre)
        `)
        .order('fecha', { ascending: false })

      if (tipo) {
        query = query.eq('tipo', tipo)
      }

      const { data, error } = await query

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('FetchError') || error.message.includes('Failed to fetch')) {
          setIsMock(true)
          const mockData = getMockTransacciones()
          setTransacciones(tipo ? mockData.filter((t: any) => t.tipo === tipo) : mockData)
          return
        }
        throw error
      }
      setTransacciones(data as any)
      setIsMock(false)
    } catch (err: any) {
      console.error("Error fetching transacciones:", err)
      setIsMock(true)
      const mockData = getMockTransacciones()
      setTransacciones(tipo ? mockData.filter((t: any) => t.tipo === tipo) : mockData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransacciones()
  }, [tipo])

  const addTransaccion = async (transaccion: Partial<Transaccion>) => {
    if (isMock) {
      const newT = { ...transaccion, id: Math.random().toString(), fecha: new Date().toISOString() }
      const currentMockData = getMockTransacciones()
      const updatedMockData = [newT, ...currentMockData]
      saveMockTransacciones(updatedMockData)
      
      setTransacciones(prev => [newT as any, ...prev])
      return { data: newT, error: null }
    }

    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id

      const newTransaccion = {
        ...transaccion,
        user_id: userId || null, // Allow null for demo purposes if RLS allows
      }

      const { data, error } = await supabase
        .from('transacciones')
        .insert([newTransaccion])
        .select()
        .single()

      if (error) throw error
      
      setTransacciones(prev => [data as any, ...prev])
      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  const deleteTransaccion = async (id: string) => {
    if (isMock) {
      const currentMockData = getMockTransacciones()
      const updatedMockData = currentMockData.filter((t: any) => t.id !== id)
      saveMockTransacciones(updatedMockData)
      
      setTransacciones(prev => prev.filter(t => t.id !== id))
      return { error: null }
    }

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
